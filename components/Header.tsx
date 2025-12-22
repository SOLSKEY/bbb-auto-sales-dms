import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, BellIcon, CheckIcon } from '@heroicons/react/24/solid';
import HeaderWidgetContainer from './HeaderWidgetContainer';
import { useAppointmentNotifications } from '../hooks/useAppointmentNotifications';
import { format, parseISO } from 'date-fns';

const Header: React.FC<{ title: string; onLogout?: () => void }> = ({ title, onLogout }) => {
    const userContext = useContext(UserContext);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement | null>(null);
    const notificationRef = useRef<HTMLDivElement | null>(null);

    const { notifications, unreadCount, markAsRead, markAllAsRead } = useAppointmentNotifications();

    if (!userContext) {
        return null;
    }

    const { user } = userContext;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMenu = () => setIsMenuOpen(prev => !prev);
    const toggleNotifications = () => setIsNotificationsOpen(prev => !prev);

    const handleNotificationClick = (notificationId: string) => {
        markAsRead(notificationId);
        navigate('/appointments');
        setIsNotificationsOpen(false);
    };

    const handleSignOut = () => {
        setIsMenuOpen(false);
        onLogout?.();
    };

    const handleAccountSettings = () => {
        setIsMenuOpen(false);
        navigate('/account-settings');
    };

    return (
        <header className="flex items-center justify-between p-4 glass-card-outline mx-4 mt-4 mb-2 h-16 relative z-40">
            <h1 className="text-2xl font-bold text-primary-contrast tracking-tight">{title}</h1>
            
            {/* Center: Widget Container - Hidden on mobile */}
            <div className="hidden lg:block">
                <HeaderWidgetContainer />
            </div>
            
            <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <div ref={notificationRef} className="relative z-50">
                    <button
                        type="button"
                        onClick={toggleNotifications}
                        className="notification-bell relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Notifications"
                    >
                        <BellIcon className="h-6 w-6 text-slate-400 hover:text-cyan-400 transition-colors" />
                        {unreadCount > 0 && (
                            <span className="notification-badge absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="notification-dropdown absolute right-0 mt-2 w-80 glass-card shadow-2xl z-[9999] max-h-96 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                                <h3 className="font-semibold text-primary-contrast">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllAsRead()}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                    >
                                        <CheckIcon className="h-3 w-3" />
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {notifications.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-slate-500">
                                        <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.slice(0, 10).map((notification) => (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification.id)}
                                            className={`w-full px-4 py-3 text-left hover:bg-white/5 transition border-b border-slate-700/30 last:border-b-0 ${
                                                !notification.read ? 'bg-cyan-500/5' : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {!notification.read && (
                                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
                                                )}
                                                <div className={!notification.read ? '' : 'ml-5'}>
                                                    <p className="text-sm font-medium text-primary-contrast">
                                                        {notification.appointmentTitle}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {notification.customer} • {format(parseISO(notification.appointmentTime), 'MMM d, h:mm a')}
                                                    </p>
                                                    <p className="text-xs text-cyan-400 mt-1">
                                                        {notification.reminderType === 'day_of' && 'Appointment today'}
                                                        {notification.reminderType === 'two_hours_before' && 'In 2 hours'}
                                                        {notification.reminderType === 'one_hour_before' && 'In 1 hour'}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => {
                                        navigate('/appointments');
                                        setIsNotificationsOpen(false);
                                    }}
                                    className="px-4 py-2 text-center text-sm text-cyan-400 hover:text-cyan-300 border-t border-slate-700/50"
                                >
                                    View all appointments
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div ref={profileRef} className="relative z-50">
                    <button
                        type="button"
                        onClick={toggleMenu}
                        className="flex items-center space-x-2 focus:outline-none"
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                    >
                        <UserCircleIcon className="h-8 w-8 text-slate-400" />
                        <div className="text-left">
                            <p className="font-semibold text-primary-contrast">{user.name}</p>
                            <p className="text-xs text-muted-contrast capitalize">{user.role}</p>
                        </div>
                    </button>
                    {isMenuOpen && onLogout && (
                        <div className="absolute right-0 mt-2 w-52 glass-card shadow-2xl z-[9999]">
                            <button
                                onClick={handleAccountSettings}
                                className="w-full px-4 py-2 text-left text-sm font-semibold text-primary-contrast hover:bg-white/10 transition rounded-t-xl flex items-center gap-2"
                            >
                                <Cog6ToothIcon className="h-4 w-4" />
                                Account Settings
                            </button>
                            <div className="border-t border-slate-700/50"></div>
                            <button
                                onClick={handleSignOut}
                                className="w-full px-4 py-2 text-left text-sm font-semibold text-primary-contrast hover:bg-white/10 transition rounded-b-lg flex items-center gap-2"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
