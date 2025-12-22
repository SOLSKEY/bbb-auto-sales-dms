import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Appointment, AppointmentNotification } from '../types';
import { differenceInMinutes, differenceInHours, startOfDay, isSameDay, format } from 'date-fns';

// CST timezone constant
const CST_TIMEZONE = 'America/Chicago';

// Get current time in CST
const getNowInCST = (): Date => {
    const now = new Date();
    const cstDateStr = now.toLocaleString('en-US', { timeZone: CST_TIMEZONE });
    return new Date(cstDateStr);
};

// Get start of day in CST
const getStartOfDayCST = (date: Date): Date => {
    const cstYear = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, year: 'numeric' }));
    const cstMonth = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, month: '2-digit' }));
    const cstDay = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, day: '2-digit' }));
    // Create date at midnight CST, then convert to UTC
    const cstMidnight = new Date(`${cstYear}-${String(cstMonth).padStart(2, '0')}-${String(cstDay).padStart(2, '0')}T00:00:00`);
    // Adjust for CST offset (UTC-6 or UTC-5)
    const month = cstMonth - 1;
    const isDST = month >= 2 && month <= 10;
    const cstOffsetMinutes = isDST ? 300 : 360;
    return new Date(cstMidnight.getTime() + (cstOffsetMinutes * 60 * 1000));
};

// Check if two dates are the same day in CST
const isSameDayCST = (date1: Date, date2: Date): boolean => {
    const d1CST = date1.toLocaleString('en-US', { timeZone: CST_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    const d2CST = date2.toLocaleString('en-US', { timeZone: CST_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    return d1CST === d2CST;
};

// Get current hour in CST
const getCurrentHourCST = (): number => {
    const now = new Date();
    return parseInt(now.toLocaleString('en-US', { timeZone: CST_TIMEZONE, hour: '2-digit', hour12: false }));
};

// Calculate minutes until appointment in CST
const getMinutesUntilCST = (appointmentTime: Date): number => {
    const now = new Date();
    // Get both times as strings in CST, then convert back to dates for comparison
    const nowCSTStr = now.toLocaleString('en-US', { timeZone: CST_TIMEZONE });
    const aptCSTStr = appointmentTime.toLocaleString('en-US', { timeZone: CST_TIMEZONE });
    const nowCST = new Date(nowCSTStr);
    const aptCST = new Date(aptCSTStr);
    return differenceInMinutes(aptCST, nowCST);
};

const NOTIFICATIONS_STORAGE_KEY = 'appointment_notifications';
const NOTIFIED_REMINDERS_KEY = 'notified_reminders';

interface NotifiedReminder {
    appointmentId: string;
    reminderType: 'day_of' | 'two_hours_before' | 'one_hour_before';
    notifiedAt: string;
}

// Create a notification
const createNotification = (
    appointment: Appointment,
    reminderType: 'day_of' | 'two_hours_before' | 'one_hour_before'
): AppointmentNotification => {
    const now = new Date();
    const appointmentTime = new Date(appointment.appointment_time);
    
    let message = '';
    if (reminderType === 'day_of') {
        message = `Appointment with ${appointment.customer_name} today at ${format(appointmentTime, 'h:mm a')}`;
    } else if (reminderType === 'two_hours_before') {
        message = `Appointment with ${appointment.customer_name} in 2 hours`;
    } else {
        message = `Appointment with ${appointment.customer_name} in 1 hour`;
    }

    return {
        id: `${appointment.id}-${reminderType}-${now.getTime()}`,
        appointmentId: appointment.id,
        appointmentTitle: appointment.title || appointment.customer_name,
        customer: appointment.customer_name,
        appointmentTime: appointment.appointment_time,
        reminderType,
        createdAt: now.toISOString(),
        read: false,
    };
};

// Save notification to storage
const saveNotification = (notification: AppointmentNotification) => {
    const existing = getNotifications();
    existing.unshift(notification); // Add to beginning
    // Keep only last 100 notifications
    const limited = existing.slice(0, 100);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limited));
};

// Get all notifications
export const getNotifications = (): AppointmentNotification[] => {
    try {
        const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Get unread notifications
export const getUnreadNotifications = (): AppointmentNotification[] => {
    return getNotifications().filter(n => !n.read);
};

// Mark notification as read
export const markNotificationAsRead = (notificationId: string) => {
    const notifications = getNotifications();
    const updated = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
    );
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
};

// Mark all notifications as read
export const markAllNotificationsAsRead = () => {
    const notifications = getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
};

// Check if reminder was already sent
const wasReminderSent = (appointmentId: string, reminderType: string): boolean => {
    try {
        const stored = localStorage.getItem(NOTIFIED_REMINDERS_KEY);
        const notified: NotifiedReminder[] = stored ? JSON.parse(stored) : [];
        return notified.some(
            n => n.appointmentId === appointmentId && n.reminderType === reminderType
        );
    } catch {
        return false;
    }
};

// Mark reminder as sent
const markReminderAsSent = (appointmentId: string, reminderType: string) => {
    try {
        const stored = localStorage.getItem(NOTIFIED_REMINDERS_KEY);
        const notified: NotifiedReminder[] = stored ? JSON.parse(stored) : [];
        notified.push({
            appointmentId,
            reminderType: reminderType as 'day_of' | 'two_hours_before' | 'one_hour_before',
            notifiedAt: new Date().toISOString(),
        });
        // Keep only last 1000 reminders
        const limited = notified.slice(-1000);
        localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(limited));
    } catch (error) {
        console.error('Error marking reminder as sent:', error);
    }
};

export const useAppointmentNotifications = () => {
    const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Load notifications from storage
    useEffect(() => {
        const loadNotifications = () => {
            const stored = getNotifications();
            setNotifications(stored);
            setUnreadCount(stored.filter(n => !n.read).length);
        };

        loadNotifications();
        // Listen for storage changes (from other tabs) and custom notification events
        window.addEventListener('storage', loadNotifications);
        window.addEventListener('appointmentNotification', loadNotifications);
        return () => {
            window.removeEventListener('storage', loadNotifications);
            window.removeEventListener('appointmentNotification', loadNotifications);
        };
    }, []);

    // Listen for new appointments (for the badge count)
    useEffect(() => {
        const channel = supabase
            .channel('appointment-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'calendar_appointments',
                },
                () => {
                    // Reload notifications to get updated count
                    const stored = getNotifications();
                    setNotifications(stored);
                    setUnreadCount(stored.filter(n => !n.read).length);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const markAsRead = useCallback((notificationId: string) => {
        markNotificationAsRead(notificationId);
        const updated = getNotifications();
        setNotifications(updated);
        setUnreadCount(updated.filter(n => !n.read).length);
    }, []);

    const markAllAsRead = useCallback(() => {
        markAllNotificationsAsRead();
        const updated = getNotifications();
        setNotifications(updated);
        setUnreadCount(0);
    }, []);

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: () => {
            const stored = getNotifications();
            setNotifications(stored);
            setUnreadCount(stored.filter(n => !n.read).length);
        },
    };
};

// Hook for appointment reminders (8am, 2 hours before, 1 hour before)
export const useAppointmentReminders = () => {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        let checkInterval: NodeJS.Timeout | null = null;

        const checkUpcomingAppointments = async () => {
            try {
                const now = new Date();
                const nowCST = getNowInCST();
                const todayStartCST = getStartOfDayCST(now);
                const tomorrowStartCST = new Date(todayStartCST);
                tomorrowStartCST.setDate(tomorrowStartCST.getDate() + 1);

                // Fetch appointments from calendar_appointments table
                // Filter for scheduled, confirmed, or showed status (not cancelled, no_show, or sold)
                const { data, error } = await supabase
                    .from('calendar_appointments')
                    .select('*')
                    .in('status', ['scheduled', 'confirmed', 'showed'])
                    .gte('appointment_time', todayStartCST.toISOString())
                    .lte('appointment_time', tomorrowStartCST.toISOString());

                if (error) {
                    console.error('Error fetching appointments for reminders:', error);
                    return;
                }

                if (!data || data.length === 0) return;

                // Request notification permission
                if ('Notification' in window && Notification.permission === 'default') {
                    await Notification.requestPermission();
                }

                for (const apt of data) {
                    const appointmentTime = new Date(apt.appointment_time);
                    const minutesUntil = getMinutesUntilCST(appointmentTime);
                    const isToday = isSameDayCST(appointmentTime, now);
                    const currentHourCST = getCurrentHourCST();

                    // 1. 8am reminder on the day of appointment (in CST)
                    if (isToday && currentHourCST === 8 && minutesUntil > 0) {
                        const reminderKey = `${apt.id}-day_of`;
                        if (!wasReminderSent(apt.id, 'day_of')) {
                            const notification = createNotification(apt, 'day_of');
                            saveNotification(notification);

                            if (Notification.permission === 'granted') {
                                new Notification(`Appointment Today: ${apt.customer_name}`, {
                                    body: `You have an appointment with ${apt.customer_name} at ${format(appointmentTime, 'h:mm a')}`,
                                    icon: '/bbb-logo.png',
                                    tag: reminderKey,
                                });
                            }

                            markReminderAsSent(apt.id, 'day_of');
                            // Trigger custom event to update notification UI
                            window.dispatchEvent(new CustomEvent('appointmentNotification'));
                        }
                    }

                    // 2. 2 hours before reminder
                    if (minutesUntil <= 120 && minutesUntil > 60) {
                        if (!wasReminderSent(apt.id, 'two_hours_before')) {
                            const notification = createNotification(apt, 'two_hours_before');
                            saveNotification(notification);

                            if (Notification.permission === 'granted') {
                                new Notification(`Appointment Reminder: ${apt.customer_name}`, {
                                    body: `Appointment with ${apt.customer_name} in 2 hours (${format(appointmentTime, 'h:mm a')})`,
                                    icon: '/bbb-logo.png',
                                    tag: `${apt.id}-two_hours_before`,
                                });
                            }

                            markReminderAsSent(apt.id, 'two_hours_before');
                            // Trigger custom event to update notification UI
                            window.dispatchEvent(new CustomEvent('appointmentNotification'));
                        }
                    }

                    // 3. 1 hour before reminder
                    if (minutesUntil <= 60 && minutesUntil > 0) {
                        if (!wasReminderSent(apt.id, 'one_hour_before')) {
                            const notification = createNotification(apt, 'one_hour_before');
                            saveNotification(notification);

                            if (Notification.permission === 'granted') {
                                new Notification(`Appointment Reminder: ${apt.customer_name}`, {
                                    body: `Appointment with ${apt.customer_name} in 1 hour (${format(appointmentTime, 'h:mm a')})`,
                                    icon: '/bbb-logo.png',
                                    tag: `${apt.id}-one_hour_before`,
                                });
                            }

                            markReminderAsSent(apt.id, 'one_hour_before');
                            // Trigger custom event to update notification UI
                            window.dispatchEvent(new CustomEvent('appointmentNotification'));
                        }
                    }
                }

                // Trigger storage event to update other components
                window.dispatchEvent(new Event('storage'));
            } catch (error) {
                console.error('Error checking appointment reminders:', error);
            }
        };

        // Request notification permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Check immediately
        checkUpcomingAppointments();

        // Check every minute
        checkInterval = setInterval(checkUpcomingAppointments, 60 * 1000);

        return () => {
            if (checkInterval) {
                clearInterval(checkInterval);
            }
        };
    }, []);
};
