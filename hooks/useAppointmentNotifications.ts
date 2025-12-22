import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Appointment, AppointmentNotification } from '../types';
import { differenceInMinutes, differenceInHours, startOfDay, isSameDay, format } from 'date-fns';

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
    const appointmentTime = new Date(appointment.start_time);
    
    let message = '';
    if (reminderType === 'day_of') {
        message = `Appointment with ${appointment.customer} today at ${format(appointmentTime, 'h:mm a')}`;
    } else if (reminderType === 'two_hours_before') {
        message = `Appointment with ${appointment.customer} in 2 hours`;
    } else {
        message = `Appointment with ${appointment.customer} in 1 hour`;
    }

    return {
        id: `${appointment.id}-${reminderType}-${now.getTime()}`,
        appointmentId: appointment.id,
        appointmentTitle: appointment.title || appointment.customer,
        customer: appointment.customer,
        appointmentTime: appointment.start_time,
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
        // Listen for storage changes (from other tabs)
        window.addEventListener('storage', loadNotifications);
        return () => window.removeEventListener('storage', loadNotifications);
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
                    table: 'appointments',
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
                const todayStart = startOfDay(now);
                const tomorrowStart = new Date(todayStart);
                tomorrowStart.setDate(tomorrowStart.getDate() + 1);

                // Fetch active appointments
                const { data, error } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('bucket_status', 'active')
                    .gte('start_time', todayStart.toISOString())
                    .lte('start_time', new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000).toISOString());

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
                    const appointmentTime = new Date(apt.start_time);
                    const minutesUntil = differenceInMinutes(appointmentTime, now);
                    const hoursUntil = differenceInHours(appointmentTime, now);
                    const isToday = isSameDay(appointmentTime, now);
                    const currentHour = now.getHours();

                    // 1. 8am reminder on the day of appointment
                    if (isToday && currentHour === 8 && minutesUntil > 0) {
                        const reminderKey = `${apt.id}-day_of`;
                        if (!wasReminderSent(apt.id, 'day_of')) {
                            const notification = createNotification(apt, 'day_of');
                            saveNotification(notification);

                            if (Notification.permission === 'granted') {
                                new Notification(`Appointment Today: ${apt.customer}`, {
                                    body: `You have an appointment with ${apt.customer} at ${format(appointmentTime, 'h:mm a')}`,
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
                                new Notification(`Appointment Reminder: ${apt.customer}`, {
                                    body: `Appointment with ${apt.customer} in 2 hours (${format(appointmentTime, 'h:mm a')})`,
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
                                new Notification(`Appointment Reminder: ${apt.customer}`, {
                                    body: `Appointment with ${apt.customer} in 1 hour (${format(appointmentTime, 'h:mm a')})`,
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
