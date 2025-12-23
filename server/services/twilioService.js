// server/services/twilioService.js
// Twilio SMS integration for appointment reminders

import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

/**
 * Initialize the Twilio client
 * @returns {boolean} True if initialized successfully, false otherwise
 */
export const initTwilio = () => {
    if (!accountSid || !authToken || !fromNumber) {
        console.warn('[Twilio] WARNING: Twilio credentials not configured. SMS will not be sent.');
        console.warn('[Twilio] Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
        return false;
    }

    try {
        twilioClient = Twilio(accountSid, authToken);
        console.log('[Twilio] Client initialized successfully');
        console.log(`[Twilio] Sending from: ${fromNumber}`);
        return true;
    } catch (error) {
        console.error('[Twilio] Failed to initialize client:', error.message);
        return false;
    }
};

/**
 * Format phone number to E.164 format for Twilio
 * @param {string} phone - Phone number in any format
 * @returns {string} Phone number in E.164 format (+1XXXXXXXXXX)
 */
const formatPhoneE164 = (phone) => {
    if (!phone) return null;

    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // If it starts with 1 and has 11 digits, add +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    // If it has 10 digits, assume US and add +1
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }

    // If it already has +, return as-is (already E.164)
    if (phone.startsWith('+')) {
        return phone;
    }

    // Otherwise, assume US and add +1
    return `+1${cleaned}`;
};

/**
 * Send an SMS message via Twilio
 * @param {string} to - Recipient phone number
 * @param {string} body - Message content
 * @returns {Promise<{success: boolean, messageSid?: string, status?: string, error?: string, code?: number}>}
 */
export const sendSMS = async (to, body) => {
    if (!twilioClient) {
        console.error('[Twilio] Client not initialized');
        return { success: false, error: 'Twilio not configured' };
    }

    const formattedPhone = formatPhoneE164(to);

    if (!formattedPhone) {
        console.error('[Twilio] Invalid phone number:', to);
        return { success: false, error: 'Invalid phone number' };
    }

    try {
        const message = await twilioClient.messages.create({
            body,
            from: fromNumber,
            to: formattedPhone,
        });

        console.log(`[Twilio] SMS sent to ${formattedPhone}: ${message.sid}`);

        return {
            success: true,
            messageSid: message.sid,
            status: message.status,
        };
    } catch (error) {
        console.error(`[Twilio] SMS error to ${formattedPhone}:`, error.message);

        return {
            success: false,
            error: error.message,
            code: error.code,
        };
    }
};

/**
 * Send SMS with retry logic for transient failures
 * @param {string} to - Recipient phone number
 * @param {string} body - Message content
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<{success: boolean, messageSid?: string, status?: string, error?: string}>}
 */
export const sendSMSWithRetry = async (to, body, maxRetries = 3) => {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await sendSMS(to, body);

        if (result.success) {
            return result;
        }

        lastError = result;

        // Don't retry for certain permanent errors
        const permanentErrors = [
            21211, // Invalid 'To' phone number
            21612, // Invalid phone number format
            21408, // Permission denied
            21610, // Blacklisted number
        ];

        if (permanentErrors.includes(result.code)) {
            console.log(`[Twilio] Permanent error (code ${result.code}), not retrying`);
            return result;
        }

        if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = 1000 * Math.pow(2, attempt - 1);
            console.log(`[Twilio] Retry ${attempt}/${maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return lastError;
};

/**
 * Check if Twilio is configured and ready
 * @returns {boolean}
 */
export const isTwilioReady = () => {
    return twilioClient !== null;
};
