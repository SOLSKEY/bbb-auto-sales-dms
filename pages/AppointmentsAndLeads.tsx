import React, { useState, useCallback, useMemo, useContext } from 'react';
import { CalendarDaysIcon, UserGroupIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventChangeArg } from '@fullcalendar/core';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isSameDay } from 'date-fns';

// CST timezone utilities
const CST_TIMEZONE = 'America/Chicago';

// Convert a date string to CST and return as ISO string
// This ensures the date selected is interpreted correctly in CST
// When FullCalendar gives us a date, we want to preserve the date components as CST
const convertToCST = (dateStr: string): string => {
    const date = new Date(dateStr);
    // Get the date/time components as they appear in CST
    const cstYear = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, year: 'numeric' }));
    const cstMonth = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, month: '2-digit' }));
    const cstDay = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, day: '2-digit' }));
    const cstHours = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, hour: '2-digit', hour12: false }));
    const cstMinutes = parseInt(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, minute: '2-digit' }));
    
    // Create a date string representing this time in CST
    // We'll use Intl.DateTimeFormat to properly convert CST to UTC
    const cstDateStr = `${cstYear}-${String(cstMonth).padStart(2, '0')}-${String(cstDay).padStart(2, '0')}T${String(cstHours).padStart(2, '0')}:${String(cstMinutes).padStart(2, '0')}:00`;
    
    // Use a more reliable method: create date components and use Date constructor
    // Then adjust for CST offset
    const tempDate = new Date(cstYear, cstMonth - 1, cstDay, cstHours, cstMinutes, 0);
    
    // Get what this date would be in UTC if it were CST
    // CST is UTC-6 (360 min) or CDT is UTC-5 (300 min)
    // Check if DST is likely in effect (roughly March-November)
    const month = cstMonth - 1;
    const isDST = month >= 2 && month <= 10;
    const cstOffsetMinutes = isDST ? 300 : 360; // CDT: 300 min, CST: 360 min
    
    // Convert CST time to UTC: add the offset
    const utcDate = new Date(tempDate.getTime() + (cstOffsetMinutes * 60 * 1000));
    return utcDate.toISOString();
};

// Convert a date to CST date string for datetime-local input
const formatDateForCSTInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Get date components in CST
    const year = date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, year: 'numeric' });
    const month = date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, month: '2-digit' });
    const day = date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, day: '2-digit' });
    const hours = date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, hour: '2-digit', hour12: false });
    const minutes = date.toLocaleString('en-US', { timeZone: CST_TIMEZONE, minute: '2-digit' });
    return `${year}-${month}-${day}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// Convert datetime-local input value to CST ISO string
const parseCSTInputToISO = (inputValue: string): string => {
    if (!inputValue) return '';
    // Parse the datetime-local value as if it's in CST
    const [datePart, timePart] = inputValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create date string in CST format
    const cstDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    
    // Create a date object treating it as CST
    // We'll use a workaround: create UTC date and adjust
    const utcDate = new Date(`${cstDateStr}Z`);
    // Get CST offset for this date
    const cstOffset = getCSTOffset(utcDate);
    // Adjust to get the correct UTC time
    const adjustedDate = new Date(utcDate.getTime() - (cstOffset * 60 * 1000));
    return adjustedDate.toISOString();
};

// Get CST offset in minutes for a given date
const getCSTOffset = (date: Date): number => {
    // CST is UTC-6, CDT is UTC-5
    // We'll determine which one based on the date
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    // CST offset from UTC in minutes (positive means behind UTC)
    const cstStdOffset = 6 * 60; // CST is UTC-6
    const cdtOffset = 5 * 60; // CDT is UTC-5
    
    // Simple check: if we're in daylight saving time period (roughly March-November)
    const month = date.getMonth();
    if (month >= 2 && month <= 10) {
        return cdtOffset; // CDT
    }
    return cstStdOffset; // CST
};

import type { Appointment, Lead } from '../types';
import { UserContext } from '../App';
import { useDeviceType } from '../hooks/useDeviceType';
import { useCalendarLeads } from '../hooks/useCalendarLeads';
import { useUserColors } from '../hooks/useUserColors';

import AppointmentModal from '../components/calendar-leads/AppointmentModal';
import LeadModal from '../components/calendar-leads/LeadModal';
import LeadsListView from '../components/calendar-leads/LeadsListView';

type TabType = 'calendar' | 'leads';

const STATUS_COLORS: Record<string, string> = {
    scheduled: '#3b82f6',
    confirmed: '#06b6d4',
    showed: '#8b5cf6',
    sold: '#22c55e',
    no_show: '#ef4444',
    cancelled: '#6b7280',
};

const AppointmentsAndLeads: React.FC = () => {
    const userContext = useContext(UserContext);
    const currentUserId = userContext?.user?.id;
    const isAdmin = userContext?.user?.role === 'admin';
    const { isMobile } = useDeviceType();

    // Data hooks
    const {
        appointments,
        leads,
        leadSources,
        loading,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        createLead,
        updateLead,
        deleteLead,
        addFollowUp,
        archiveAppointmentToLead,
        checkDuplicate,
        addLeadSource,
    } = useCalendarLeads();

    const { getUserColor, autoAssignColor } = useUserColors();

    // UI state
    const [activeTab, setActiveTab] = useState<TabType>('calendar');
    const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
    const [leadModalOpen, setLeadModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [modalInitialDate, setModalInitialDate] = useState<string | null>(null);
    const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

    // Mobile calendar state
    const [mobileWeekStart, setMobileWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
    const [selectedMobileDate, setSelectedMobileDate] = useState<Date>(new Date());

    // Convert appointments to FullCalendar events
    const calendarEvents = useMemo(() => {
        return appointments.map(apt => {
            const userColor = apt.user_id ? getUserColor(apt.user_id) : '#d4a853';
            return {
                id: apt.id,
                title: apt.title || apt.customer_name,
                start: apt.appointment_time,
                backgroundColor: STATUS_COLORS[apt.status] || '#3b82f6',
                borderColor: userColor,
                textColor: '#ffffff',
                extendedProps: {
                    ...apt,
                    userColor,
                },
            };
        });
    }, [appointments, getUserColor]);

    // Filter appointments for selected mobile date
    const mobileAppointments = useMemo(() => {
        return appointments.filter(apt =>
            isSameDay(new Date(apt.appointment_time), selectedMobileDate)
        ).sort((a, b) =>
            new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
        );
    }, [appointments, selectedMobileDate]);

    // Get week days for mobile
    const mobileWeekDays = useMemo(() => {
        const days = [];
        const weekEnd = endOfWeek(mobileWeekStart, { weekStartsOn: 0 });
        let current = new Date(mobileWeekStart);
        while (current <= weekEnd) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [mobileWeekStart]);

    // Phone change handler for duplicate detection
    const handlePhoneChange = useCallback(async (phone: string) => {
        if (phone && phone.replace(/\D/g, '').length >= 7) {
            const result = await checkDuplicate(phone);
            setDuplicateWarning(result.exists ? result : null);
        } else {
            setDuplicateWarning(null);
        }
    }, [checkDuplicate]);

    // Calendar event handlers
    const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
        setSelectedAppointment(null);
        // Convert selected date to CST to ensure correct date is shown
        const cstDate = convertToCST(selectInfo.startStr);
        setModalInitialDate(cstDate);
        setDuplicateWarning(null);
        setAppointmentModalOpen(true);
    }, []);

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const apt = appointments.find(a => a.id === clickInfo.event.id);
        if (apt) {
            const canModify = isAdmin || apt.user_id === currentUserId;
            if (!canModify) {
                alert('You can only edit appointments you created.');
                return;
            }
            setSelectedAppointment(apt);
            setModalInitialDate(null);
            setDuplicateWarning(null);
            setAppointmentModalOpen(true);
        }
    }, [appointments, isAdmin, currentUserId]);

    const handleEventDrop = useCallback(async (changeInfo: EventChangeArg) => {
        const apt = appointments.find(a => a.id === changeInfo.event.id);
        if (!apt) return;

        const canModify = isAdmin || apt.user_id === currentUserId;
        if (!canModify) {
            changeInfo.revert();
            alert('You can only modify appointments you created.');
            return;
        }

        const newTime = changeInfo.event.start?.toISOString();
        if (newTime) {
            await updateAppointment(apt.id, { appointment_time: newTime });
        }
    }, [appointments, isAdmin, currentUserId, updateAppointment]);

    // Appointment CRUD handlers
    const handleSaveAppointment = useCallback(async (data: Partial<Appointment>) => {
        // Auto-assign color to user if needed
        if (currentUserId) {
            await autoAssignColor(currentUserId);
        }

        // Add lead source if new
        if (data.lead_source) {
            await addLeadSource(data.lead_source);
        }

        if (selectedAppointment) {
            await updateAppointment(selectedAppointment.id, data);
        } else {
            const appointmentData = {
                ...data,
                user_id: currentUserId,
                appointment_time: data.appointment_time || modalInitialDate || new Date().toISOString(),
            };
            await createAppointment(appointmentData);
        }
    }, [selectedAppointment, currentUserId, modalInitialDate, createAppointment, updateAppointment, autoAssignColor, addLeadSource]);

    const handleDeleteAppointment = useCallback(async () => {
        if (!selectedAppointment) return;
        if (confirm('Are you sure you want to delete this appointment?')) {
            await deleteAppointment(selectedAppointment.id);
            setAppointmentModalOpen(false);
            setSelectedAppointment(null);
        }
    }, [selectedAppointment, deleteAppointment]);

    const handleArchiveAppointment = useCallback(async () => {
        if (!selectedAppointment) return;
        const reason = prompt('Reason for archiving (e.g., No-Show, Customer Postponed):');
        if (reason !== null) {
            await archiveAppointmentToLead(selectedAppointment.id, reason);
            setAppointmentModalOpen(false);
            setSelectedAppointment(null);
            setActiveTab('leads');
        }
    }, [selectedAppointment, archiveAppointmentToLead]);

    // Lead handlers
    const handleLeadClick = useCallback((lead: Lead) => {
        const canModify = isAdmin || lead.user_id === currentUserId;
        if (!canModify) {
            alert('You can only edit leads you created.');
            return;
        }
        setSelectedLead(lead);
        setDuplicateWarning(null);
        setLeadModalOpen(true);
    }, [isAdmin, currentUserId]);

    const handleSaveLead = useCallback(async (data: Partial<Lead>) => {
        if (currentUserId) {
            await autoAssignColor(currentUserId);
        }

        if (data.lead_source) {
            await addLeadSource(data.lead_source);
        }

        if (selectedLead) {
            await updateLead(selectedLead.id, data);
        } else {
            const leadData = {
                ...data,
                user_id: currentUserId,
            };
            await createLead(leadData);
        }
    }, [selectedLead, currentUserId, createLead, updateLead, autoAssignColor, addLeadSource]);

    const handleDeleteLead = useCallback(async () => {
        if (!selectedLead) return;
        if (confirm('Are you sure you want to delete this lead?')) {
            await deleteLead(selectedLead.id);
            setLeadModalOpen(false);
            setSelectedLead(null);
        }
    }, [selectedLead, deleteLead]);

    const handleConvertLeadToAppointment = useCallback(() => {
        if (!selectedLead) return;
        setLeadModalOpen(false);

        // Pre-fill appointment modal with lead data
        setSelectedAppointment(null);
        // Use current time in CST
        const now = new Date();
        const cstDate = convertToCST(now.toISOString());
        setModalInitialDate(cstDate);
        setAppointmentModalOpen(true);

        // The lead data will be passed through the modal's initial data
    }, [selectedLead]);

    const handleAddFollowUp = useCallback(async (followUp: any) => {
        if (!selectedLead) return;
        await addFollowUp(selectedLead.id, followUp);
        // Refresh selected lead
        const updated = leads.find(l => l.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
    }, [selectedLead, addFollowUp, leads]);

    // New appointment/lead buttons
    const handleNewAppointment = useCallback(() => {
        setSelectedAppointment(null);
        // Use current time in CST
        const now = new Date();
        const cstDate = convertToCST(now.toISOString());
        setModalInitialDate(cstDate);
        setDuplicateWarning(null);
        setAppointmentModalOpen(true);
    }, []);

    const handleNewLead = useCallback(() => {
        setSelectedLead(null);
        setDuplicateWarning(null);
        setLeadModalOpen(true);
    }, []);

    // Stats
    const upcomingAppointments = useMemo(() =>
        appointments.filter(a =>
            new Date(a.appointment_time) >= new Date() &&
            !['cancelled', 'no_show', 'sold'].includes(a.status)
        ).length,
        [appointments]
    );

    const todayAppointments = useMemo(() =>
        appointments.filter(a =>
            isSameDay(new Date(a.appointment_time), new Date()) &&
            !['cancelled', 'no_show'].includes(a.status)
        ).length,
        [appointments]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="liquid-card liquid-amber p-4">
                    <div className="flex items-center gap-3">
                        <CalendarDaysIcon className="h-8 w-8 text-amber-400" />
                        <div>
                            <p className="text-sm text-slate-400">Today</p>
                            <p className="text-2xl font-bold text-white time-display">{todayAppointments}</p>
                        </div>
                    </div>
                </div>

                <div className="liquid-card liquid-cyan p-4">
                    <div className="flex items-center gap-3">
                        <CalendarDaysIcon className="h-8 w-8 text-cyan-400" />
                        <div>
                            <p className="text-sm text-slate-400">Upcoming</p>
                            <p className="text-2xl font-bold text-white time-display">{upcomingAppointments}</p>
                        </div>
                    </div>
                </div>

                <div className="liquid-card liquid-purple p-4">
                    <div className="flex items-center gap-3">
                        <UserGroupIcon className="h-8 w-8 text-purple-400" />
                        <div>
                            <p className="text-sm text-slate-400">Active Leads</p>
                            <p className="text-2xl font-bold text-white time-display">{leads.length}</p>
                        </div>
                    </div>
                </div>

                <div className="liquid-card liquid-green p-4">
                    <div className="flex items-center gap-3">
                        <UserGroupIcon className="h-8 w-8 text-green-400" />
                        <div>
                            <p className="text-sm text-slate-400">Hot Leads</p>
                            <p className="text-2xl font-bold text-white time-display">
                                {leads.filter(l => l.priority === 'hot').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="liquid-tabs-list">
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`liquid-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                    >
                        <CalendarDaysIcon className="h-4 w-4 inline-block mr-2" />
                        Calendar
                    </button>
                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`liquid-tab ${activeTab === 'leads' ? 'active' : ''}`}
                    >
                        <UserGroupIcon className="h-4 w-4 inline-block mr-2" />
                        Leads ({leads.length})
                    </button>
                </div>

                {/* Add Button */}
                <button
                    onClick={activeTab === 'calendar' ? handleNewAppointment : handleNewLead}
                    className="liquid-btn size-3 liquid-cyan"
                >
                    <PlusIcon className="h-5 w-5" />
                    {activeTab === 'calendar' ? 'New Appointment' : 'New Lead'}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'calendar' ? (
                isMobile ? (
                    // Mobile Calendar View
                    <div className="space-y-4">
                        {/* Week Navigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setMobileWeekStart(subWeeks(mobileWeekStart, 1))}
                                className="liquid-btn size-2 liquid-white"
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>

                            <span className="font-medium text-white">
                                {format(mobileWeekStart, 'MMM d')} - {format(endOfWeek(mobileWeekStart), 'MMM d, yyyy')}
                            </span>

                            <button
                                onClick={() => setMobileWeekStart(addWeeks(mobileWeekStart, 1))}
                                className="liquid-btn size-2 liquid-white"
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Week Strip */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {mobileWeekDays.map(day => {
                                const hasAppointments = appointments.some(a =>
                                    isSameDay(new Date(a.appointment_time), day)
                                );
                                const isSelected = isSameDay(day, selectedMobileDate);
                                const today = isToday(day);

                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => setSelectedMobileDate(day)}
                                        className={`flex-shrink-0 w-14 py-3 rounded-xl text-center transition ${
                                            today
                                                ? 'liquid-surface liquid-cyan'
                                                : isSelected
                                                ? 'liquid-surface liquid-amber'
                                                : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="text-xs text-slate-400">{format(day, 'EEE')}</div>
                                        <div className={`text-lg font-bold ${today ? 'text-cyan-400' : isSelected ? 'text-amber-400' : 'text-white'}`}>
                                            {format(day, 'd')}
                                        </div>
                                        {hasAppointments && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-auto mt-1" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Day Appointments */}
                        <div className="space-y-3">
                            <h3 className="font-medium text-white">
                                {format(selectedMobileDate, 'EEEE, MMMM d')}
                            </h3>

                            {mobileAppointments.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No appointments scheduled</p>
                                    <button
                                        onClick={() => {
                                            const cstDate = convertToCST(selectedMobileDate.toISOString());
                                            setModalInitialDate(cstDate);
                                            setSelectedAppointment(null);
                                            setAppointmentModalOpen(true);
                                        }}
                                        className="liquid-btn size-2 liquid-amber mt-4"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        Add Appointment
                                    </button>
                                </div>
                            ) : (
                                mobileAppointments.map(apt => {
                                    const userColor = apt.user_id ? getUserColor(apt.user_id) : '#d4a853';
                                    return (
                                        <div
                                            key={apt.id}
                                            onClick={() => {
                                                setSelectedAppointment(apt);
                                                setAppointmentModalOpen(true);
                                            }}
                                            className="liquid-card liquid-cyan p-4 cursor-pointer"
                                            style={{ 
                                                '--event-color': userColor,
                                                borderLeft: `4px solid ${userColor}`
                                            } as React.CSSProperties}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="time-display text-lg font-bold text-white">
                                                    {format(new Date(apt.appointment_time), 'h:mm a')}
                                                </span>
                                                <span className={`liquid-badge size-1 status-${apt.status.replace('_', '-')}`}>
                                                    {apt.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-white">{apt.customer_name}</h4>
                                            {apt.title && (
                                                <p className="text-sm text-slate-300">{apt.title}</p>
                                            )}
                                            {(apt.model_interests || []).length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {apt.model_interests.slice(0, 2).map(model => (
                                                        <span key={model} className="model-tag text-xs">
                                                            {model}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    // Desktop Calendar View
                    <div className="liquid-card p-6" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                            }}
                            buttonText={{
                                today: 'Today',
                                month: 'Month',
                                week: 'Week',
                                day: 'Day',
                                list: 'List',
                            }}
                            initialView="dayGridMonth"
                            events={calendarEvents}
                            editable={true}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={3}
                            select={handleDateSelect}
                            eventClick={handleEventClick}
                            eventDrop={handleEventDrop}
                            eventContent={(eventInfo) => {
                                // Convert hex color to RGB for gradient
                                const hexToRgb = (hex: string) => {
                                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                    return result ? {
                                        r: parseInt(result[1], 16),
                                        g: parseInt(result[2], 16),
                                        b: parseInt(result[3], 16)
                                    } : { r: 60, g: 130, b: 246 };
                                };
                                const rgb = hexToRgb(eventInfo.event.backgroundColor);
                                const gradient = `linear-gradient(90deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1) 0%, rgba(255, 255, 255, 0) 90%)`;
                                
                                return (
                                    <div
                                        className="appointment-event px-2 py-1 text-xs overflow-hidden"
                                    style={{
                                        '--event-color': eventInfo.event.extendedProps.userColor,
                                        background: gradient,
                                    } as React.CSSProperties}
                                >
                                    <div className="flex items-center gap-1">
                                        <div
                                            className="user-color-dot"
                                            style={{
                                                '--dot-color': eventInfo.event.extendedProps.userColor,
                                                width: '8px',
                                                height: '8px',
                                            } as React.CSSProperties}
                                        />
                                        <span className="font-medium truncate">{eventInfo.event.title}</span>
                                    </div>
                                    {eventInfo.timeText && (
                                        <div className="time-display text-xs opacity-80">{eventInfo.timeText}</div>
                                    )}
                                    </div>
                                );
                            }}
                            height="100%"
                        />
                    </div>
                )
            ) : (
                // Leads Tab
                <div className="liquid-card p-6">
                    <LeadsListView
                        leads={leads}
                        onLeadClick={handleLeadClick}
                        getUserColor={getUserColor}
                        loading={false}
                    />
                </div>
            )}

            {/* Mobile FAB */}
            {isMobile && (
                <button
                    onClick={activeTab === 'calendar' ? handleNewAppointment : handleNewLead}
                    className="fab-button"
                >
                    <PlusIcon className="h-6 w-6 text-white" />
                </button>
            )}

            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={appointmentModalOpen}
                onClose={() => {
                    setAppointmentModalOpen(false);
                    setSelectedAppointment(null);
                    setDuplicateWarning(null);
                }}
                onSave={handleSaveAppointment}
                onDelete={selectedAppointment ? handleDeleteAppointment : undefined}
                onArchive={selectedAppointment ? handleArchiveAppointment : undefined}
                initialData={selectedAppointment ? {
                    ...selectedAppointment,
                } : modalInitialDate ? {
                    appointment_time: modalInitialDate,
                } : undefined}
                leadSources={leadSources}
                duplicateWarning={duplicateWarning}
                onPhoneChange={handlePhoneChange}
            />

            {/* Lead Modal */}
            <LeadModal
                isOpen={leadModalOpen}
                onClose={() => {
                    setLeadModalOpen(false);
                    setSelectedLead(null);
                    setDuplicateWarning(null);
                }}
                onSave={handleSaveLead}
                onDelete={selectedLead ? handleDeleteLead : undefined}
                onConvertToAppointment={selectedLead ? handleConvertLeadToAppointment : undefined}
                onAddFollowUp={selectedLead ? handleAddFollowUp : undefined}
                initialData={selectedLead || undefined}
                leadSources={leadSources}
                duplicateWarning={duplicateWarning}
                onPhoneChange={handlePhoneChange}
            />
        </div>
    );
};

export default AppointmentsAndLeads;
