// server/smsScheduler.js
// SMS Reminder Scheduler for Appointment Notifications
// Sends reminders at: 6:30 PM CST (day before), 9:30 AM CST (day of), and 1 hour before

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { initTwilio, sendSMSWithRetry, isTwilioReady } from './services/twilioService.js';
import {
    getNowCST,
    getCSTDateBounds,
    getTomorrowCST,
    getTodayCST,
    formatForSMS,
    isApproximatelyOneHourAway,
    getCSTDateString
} from './utils/cstTime.js';

// Initialize Supabase client with service role for full access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://bbb-auto-sales.netlify.app';

// Track last run times for health checks
const schedulerStats = {
    lastDayBeforeRun: null,
    lastDayOfRun: null,
    lastOneHourRun: null,
    totalSMSSent: 0,
    totalErrors: 0
};

/**
 * Initialize Supabase client
 */
const initSupabase = () => {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[SMS Scheduler] Missing Supabase credentials');
        return false;
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[SMS Scheduler] Supabase client initialized');
    return true;
};

/**
 * Get all employees who have opted in for SMS notifications
 * @returns {Promise<Array<{id: string, phone_number: string}>>}
 */
const getEligibleRecipients = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, phone_number')
        .eq('sms_notifications_enabled', true)
        .not('phone_number', 'is', null)
        .neq('phone_number', '');

    if (error) {
        console.error('[SMS Scheduler] Error fetching eligible recipients:', error);
        return [];
    }

    return data || [];
};

/**
 * Check if a specific reminder was already sent
 * @param {string} appointmentId
 * @param {string} reminderType - 'day_before' | 'day_of' | 'one_hour'
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const wasReminderSent = async (appointmentId, reminderType, userId) => {
    const { data, error } = await supabase
        .from('sms_reminder_logs')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('reminder_type', reminderType)
        .eq('recipient_user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('[SMS Scheduler] Error checking reminder status:', error);
        return true; // Assume sent to prevent duplicates on error
    }

    return !!data;
};

/**
 * Log a sent reminder to the database
 * @param {string} appointmentId
 * @param {string} reminderType
 * @param {string} userId
 * @param {string} phone
 * @param {object} twilioResult
 * @param {Date} scheduledFor
 */
const logReminderSent = async (appointmentId, reminderType, userId, phone, twilioResult, scheduledFor) => {
    const { error } = await supabase
        .from('sms_reminder_logs')
        .insert({
            appointment_id: appointmentId,
            reminder_type: reminderType,
            recipient_user_id: userId,
            recipient_phone: phone,
            twilio_message_sid: twilioResult.messageSid || null,
            twilio_status: twilioResult.status || (twilioResult.success ? 'queued' : 'failed'),
            error_message: twilioResult.error || null,
            scheduled_for: scheduledFor.toISOString()
        });

    if (error) {
        // Handle unique constraint violation gracefully (duplicate)
        if (error.code === '23505') {
            console.log('[SMS Scheduler] Reminder already logged (duplicate prevented)');
        } else {
            console.error('[SMS Scheduler] Error logging reminder:', error);
        }
    }
};

/**
 * Format SMS message for single appointment
 * @param {object} appointment
 * @param {string} reminderType
 * @returns {string}
 */
const formatSingleAppointmentMessage = (appointment, reminderType) => {
    const timeStr = formatForSMS(appointment.appointment_time);

    let message = `BBB Auto Reminder:\n`;
    message += `${appointment.customer_name}`;

    if (appointment.customer_phone) {
        message += ` (${appointment.customer_phone})`;
    }

    message += `\n${timeStr}`;

    if (appointment.model_interests && appointment.model_interests.length > 0) {
        message += `\nInterested in: ${appointment.model_interests.join(', ')}`;
    }

    if (appointment.notes) {
        // Truncate notes to keep SMS short
        const truncatedNotes = appointment.notes.length > 60
            ? appointment.notes.substring(0, 57) + '...'
            : appointment.notes;
        message += `\nNotes: ${truncatedNotes}`;
    }

    if (appointment.status && appointment.status !== 'scheduled') {
        message += `\nStatus: ${appointment.status}`;
    }

    message += `\n\nView: ${APP_BASE_URL}/appointments-leads`;

    return message;
};

/**
 * Format SMS message for multiple appointments
 * @param {Array} appointments
 * @param {string} reminderType
 * @returns {string}
 */
const formatMultipleAppointmentsMessage = (appointments, reminderType) => {
    let message = `BBB Auto: ${appointments.length} appointments `;

    if (reminderType === 'day_before') {
        message += 'tomorrow:\n\n';
    } else if (reminderType === 'day_of') {
        message += 'today:\n\n';
    } else {
        message += 'coming up:\n\n';
    }

    appointments.forEach((apt, idx) => {
        const timeStr = formatForSMS(apt.appointment_time);
        message += `${idx + 1}. ${apt.customer_name}`;
        if (apt.customer_phone) {
            message += ` (${apt.customer_phone})`;
        }
        message += `\n   ${timeStr}`;
        if (apt.status && apt.status !== 'scheduled') {
            message += ` [${apt.status}]`;
        }
        message += '\n';
    });

    message += `\nView all: ${APP_BASE_URL}/appointments-leads`;

    return message;
};

/**
 * Send reminders to all eligible recipients
 * @param {Array} appointments
 * @param {string} reminderType
 */
const sendRemindersToAllRecipients = async (appointments, reminderType) => {
    if (!appointments || appointments.length === 0) {
        return;
    }

    const recipients = await getEligibleRecipients();

    if (recipients.length === 0) {
        console.log('[SMS Scheduler] No eligible recipients found');
        return;
    }

    console.log(`[SMS Scheduler] Sending ${reminderType} reminders to ${recipients.length} recipients for ${appointments.length} appointment(s)`);

    // Format message based on number of appointments
    const message = appointments.length === 1
        ? formatSingleAppointmentMessage(appointments[0], reminderType)
        : formatMultipleAppointmentsMessage(appointments, reminderType);

    const scheduledFor = new Date();

    for (const recipient of recipients) {
        // Check if already sent for ALL appointments in this batch
        let alreadySentAll = true;
        for (const apt of appointments) {
            const sent = await wasReminderSent(apt.id, reminderType, recipient.id);
            if (!sent) {
                alreadySentAll = false;
                break;
            }
        }

        if (alreadySentAll) {
            console.log(`[SMS Scheduler] Reminders already sent to ${recipient.phone_number}, skipping`);
            continue;
        }

        // Send the SMS
        const result = await sendSMSWithRetry(recipient.phone_number, message);

        // Log for each appointment in the batch
        for (const apt of appointments) {
            await logReminderSent(
                apt.id,
                reminderType,
                recipient.id,
                recipient.phone_number,
                result,
                scheduledFor
            );
        }

        if (result.success) {
            schedulerStats.totalSMSSent++;
            console.log(`[SMS Scheduler] ✓ SMS sent to ${recipient.phone_number}`);
        } else {
            schedulerStats.totalErrors++;
            console.error(`[SMS Scheduler] ✗ Failed to send to ${recipient.phone_number}: ${result.error}`);
        }

        // Small delay between sends to avoid rate limiting (Twilio allows ~1/sec)
        await new Promise(resolve => setTimeout(resolve, 250));
    }
};

/**
 * Process day-before reminders (runs at 6:30 PM CST)
 */
const processDayBeforeReminders = async () => {
    console.log(`[SMS Scheduler] Running day-before reminder check at ${getNowCST().toLocaleString()}`);
    schedulerStats.lastDayBeforeRun = new Date();

    if (!isTwilioReady()) {
        console.warn('[SMS Scheduler] Twilio not ready, skipping day-before reminders');
        return;
    }

    try {
        // Get tomorrow's date bounds in CST (converted to UTC for query)
        const tomorrow = getTomorrowCST();
        const { start, end } = getCSTDateBounds(tomorrow);

        console.log(`[SMS Scheduler] Looking for appointments between ${start.toISOString()} and ${end.toISOString()}`);

        // Fetch appointments for tomorrow (ALL statuses per requirements)
        const { data: appointments, error } = await supabase
            .from('calendar_appointments')
            .select('*')
            .gte('appointment_time', start.toISOString())
            .lte('appointment_time', end.toISOString())
            .order('appointment_time', { ascending: true });

        if (error) {
            console.error('[SMS Scheduler] Error fetching appointments:', error);
            return;
        }

        if (!appointments || appointments.length === 0) {
            console.log('[SMS Scheduler] No appointments tomorrow');
            return;
        }

        console.log(`[SMS Scheduler] Found ${appointments.length} appointment(s) for tomorrow`);

        await sendRemindersToAllRecipients(appointments, 'day_before');

    } catch (error) {
        console.error('[SMS Scheduler] Error in day-before reminders:', error);
        schedulerStats.totalErrors++;
    }
};

/**
 * Process day-of reminders (runs at 9:30 AM CST)
 */
const processDayOfReminders = async () => {
    console.log(`[SMS Scheduler] Running day-of reminder check at ${getNowCST().toLocaleString()}`);
    schedulerStats.lastDayOfRun = new Date();

    if (!isTwilioReady()) {
        console.warn('[SMS Scheduler] Twilio not ready, skipping day-of reminders');
        return;
    }

    try {
        // Get today's date bounds in CST (converted to UTC for query)
        const today = getTodayCST();
        const { start, end } = getCSTDateBounds(today);

        console.log(`[SMS Scheduler] Looking for appointments between ${start.toISOString()} and ${end.toISOString()}`);

        // Fetch appointments for today (ALL statuses per requirements)
        const { data: appointments, error } = await supabase
            .from('calendar_appointments')
            .select('*')
            .gte('appointment_time', start.toISOString())
            .lte('appointment_time', end.toISOString())
            .order('appointment_time', { ascending: true });

        if (error) {
            console.error('[SMS Scheduler] Error fetching appointments:', error);
            return;
        }

        if (!appointments || appointments.length === 0) {
            console.log('[SMS Scheduler] No appointments today');
            return;
        }

        console.log(`[SMS Scheduler] Found ${appointments.length} appointment(s) for today`);

        await sendRemindersToAllRecipients(appointments, 'day_of');

    } catch (error) {
        console.error('[SMS Scheduler] Error in day-of reminders:', error);
        schedulerStats.totalErrors++;
    }
};

/**
 * Process one-hour-before reminders (runs every 5 minutes)
 */
const processOneHourReminders = async () => {
    schedulerStats.lastOneHourRun = new Date();

    if (!isTwilioReady()) {
        return; // Silent - this runs frequently
    }

    try {
        const now = new Date();
        // Look for appointments 55-65 minutes from now (1 hour +/- 5 min window)
        const windowStart = new Date(now.getTime() + (55 * 60 * 1000));
        const windowEnd = new Date(now.getTime() + (65 * 60 * 1000));

        // Fetch appointments in the 1-hour window
        const { data: appointments, error } = await supabase
            .from('calendar_appointments')
            .select('*')
            .gte('appointment_time', windowStart.toISOString())
            .lte('appointment_time', windowEnd.toISOString())
            .order('appointment_time', { ascending: true });

        if (error) {
            console.error('[SMS Scheduler] Error fetching one-hour appointments:', error);
            return;
        }

        if (!appointments || appointments.length === 0) {
            return; // Silent when no appointments
        }

        console.log(`[SMS Scheduler] Found ${appointments.length} appointment(s) in ~1 hour`);

        // For one-hour reminders, send individual messages for each appointment
        for (const appointment of appointments) {
            await sendRemindersToAllRecipients([appointment], 'one_hour');
        }

    } catch (error) {
        console.error('[SMS Scheduler] Error in one-hour reminders:', error);
        schedulerStats.totalErrors++;
    }
};

/**
 * Get scheduler statistics for monitoring
 * @returns {object}
 */
export const getSchedulerStats = () => {
    return {
        ...schedulerStats,
        twilioReady: isTwilioReady(),
        supabaseReady: supabase !== null
    };
};

/**
 * Manually trigger a reminder check (for testing/admin)
 * @param {string} type - 'day_before' | 'day_of' | 'one_hour'
 */
export const triggerReminderCheck = async (type) => {
    switch (type) {
        case 'day_before':
            await processDayBeforeReminders();
            break;
        case 'day_of':
            await processDayOfReminders();
            break;
        case 'one_hour':
            await processOneHourReminders();
            break;
        default:
            throw new Error(`Unknown reminder type: ${type}`);
    }
};

/**
 * Initialize and start the SMS scheduler
 */
export const initSMSScheduler = () => {
    console.log('[SMS Scheduler] ========================================');
    console.log('[SMS Scheduler] Initializing SMS Reminder Scheduler');
    console.log('[SMS Scheduler] ========================================');

    // Initialize Twilio
    const twilioReady = initTwilio();
    if (!twilioReady) {
        console.warn('[SMS Scheduler] Twilio not configured - scheduler will run but SMS will not be sent');
        console.warn('[SMS Scheduler] Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable');
    }

    // Initialize Supabase
    const supabaseReady = initSupabase();
    if (!supabaseReady) {
        console.error('[SMS Scheduler] Supabase not configured - scheduler cannot run');
        return false;
    }

    console.log(`[SMS Scheduler] App Base URL: ${APP_BASE_URL}`);

    // Schedule: 6:30 PM CST daily (day-before reminder)
    cron.schedule('30 18 * * *', () => {
        console.log('[SMS Scheduler] Cron triggered: day-before (6:30 PM CST)');
        processDayBeforeReminders();
    }, {
        timezone: 'America/Chicago'
    });

    // Schedule: 9:30 AM CST daily (day-of reminder)
    cron.schedule('30 9 * * *', () => {
        console.log('[SMS Scheduler] Cron triggered: day-of (9:30 AM CST)');
        processDayOfReminders();
    }, {
        timezone: 'America/Chicago'
    });

    // Schedule: Every 5 minutes (one-hour-before check)
    cron.schedule('*/5 * * * *', () => {
        processOneHourReminders();
    }, {
        timezone: 'America/Chicago'
    });

    console.log('[SMS Scheduler] ----------------------------------------');
    console.log('[SMS Scheduler] Scheduled jobs:');
    console.log('[SMS Scheduler]   • Day-before reminder: 6:30 PM CST daily');
    console.log('[SMS Scheduler]   • Day-of reminder: 9:30 AM CST daily');
    console.log('[SMS Scheduler]   • One-hour reminder: Every 5 minutes');
    console.log('[SMS Scheduler] ----------------------------------------');
    console.log('[SMS Scheduler] Scheduler initialized successfully');

    return true;
};

export default {
    initSMSScheduler,
    getSchedulerStats,
    triggerReminderCheck
};
