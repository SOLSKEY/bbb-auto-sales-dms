import React, { useState, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventChangeArg } from '@fullcalendar/core';
import type { CalendarAppointment, UserColor, AppointmentStatus, ArchiveReason } from '../../types';
import { AppointmentModal } from './AppointmentModal';
import { ArchiveModal } from './ArchiveModal';
import { format } from 'date-fns';

interface CalendarTabProps {
    appointments: CalendarAppointment[];
    loading: boolean;
    userColors: Record<string, UserColor>;
    currentUserId: string;
    isAdmin: boolean;
    onCreateAppointment: (appointment: Omit<CalendarAppointment, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data: CalendarAppointment | null; error: string | null }>;
    onUpdateAppointment: (id: string, updates: Partial<CalendarAppointment>) => Promise<{ data: CalendarAppointment | null; error: string | null }>;
    onDeleteAppointment: (id: string) => Promise<{ error: string | null }>;
    onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<{ data: CalendarAppointment | null; error: string | null }>;
    onArchiveAppointment: (appointmentId: string, reason: ArchiveReason) => Promise<{ error: string | null }>;
}

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; border: string }> = {
    scheduled: { bg: 'rgba(59, 130, 246, 0.4)', border: 'rgba(59, 130, 246, 0.8)' },
    confirmed: { bg: 'rgba(34, 197, 94, 0.4)', border: 'rgba(34, 197, 94, 0.8)' },
    showed: { bg: 'rgba(16, 185, 129, 0.4)', border: 'rgba(16, 185, 129, 0.8)' },
    sold: { bg: 'rgba(168, 85, 247, 0.4)', border: 'rgba(168, 85, 247, 0.8)' },
    no_show: { bg: 'rgba(239, 68, 68, 0.4)', border: 'rgba(239, 68, 68, 0.8)' },
    cancelled: { bg: 'rgba(107, 114, 128, 0.4)', border: 'rgba(107, 114, 128, 0.8)' },
};

export const CalendarTab: React.FC<CalendarTabProps> = ({
    appointments,
    loading,
    userColors,
    currentUserId,
    isAdmin,
    onCreateAppointment,
    onUpdateAppointment,
    onDeleteAppointment,
    onUpdateStatus,
    onArchiveAppointment,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Convert appointments to FullCalendar events
    const calendarEvents = useMemo(() => {
        return appointments.map(apt => {
            const userColor = userColors[apt.user_id]?.color || '#06b6d4';
            const statusColors = STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled;

            // Build display title
            let displayTitle = apt.title || apt.customer_name || 'Appointment';
            if (apt.customer_name && apt.title && apt.title !== apt.customer_name) {
                displayTitle = `${apt.customer_name} - ${apt.title}`;
            }

            return {
                id: apt.id,
                title: displayTitle,
                start: apt.appointment_time,
                backgroundColor: statusColors.bg,
                borderColor: userColor, // Use user color for left border
                borderWidth: '0 0 0 3px',
                textColor: '#ffffff',
                extendedProps: {
                    appointment: apt,
                    userColor,
                },
            };
        });
    }, [appointments, userColors]);

    const handleDateClick = useCallback((selectInfo: DateSelectArg) => {
        setSelectedAppointment(null);
        setSelectedDate(selectInfo.start);
        setIsModalOpen(true);
    }, []);

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const appointment = clickInfo.event.extendedProps.appointment as CalendarAppointment;
        const canEdit = isAdmin || appointment.user_id === currentUserId;

        if (canEdit) {
            setSelectedAppointment(appointment);
            setSelectedDate(null);
            setIsModalOpen(true);
        }
    }, [isAdmin, currentUserId]);

    const handleEventDrop = useCallback(async (changeInfo: EventChangeArg) => {
        const appointment = changeInfo.event.extendedProps.appointment as CalendarAppointment;
        const canEdit = isAdmin || appointment.user_id === currentUserId;

        if (!canEdit) {
            changeInfo.revert();
            return;
        }

        const newStart = changeInfo.event.start;
        if (newStart) {
            const { error } = await onUpdateAppointment(appointment.id, {
                appointment_time: newStart.toISOString(),
            });
            if (error) {
                changeInfo.revert();
            }
        }
    }, [isAdmin, currentUserId, onUpdateAppointment]);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedAppointment(null);
        setSelectedDate(null);
    }, []);

    const handleSaveAppointment = useCallback(async (
        data: Omit<CalendarAppointment, 'id' | 'created_at' | 'updated_at'>
    ) => {
        if (selectedAppointment) {
            await onUpdateAppointment(selectedAppointment.id, data);
        } else {
            await onCreateAppointment(data);
        }
        handleCloseModal();
    }, [selectedAppointment, onCreateAppointment, onUpdateAppointment, handleCloseModal]);

    const handleDeleteAppointment = useCallback(async () => {
        if (selectedAppointment) {
            await onDeleteAppointment(selectedAppointment.id);
            handleCloseModal();
        }
    }, [selectedAppointment, onDeleteAppointment, handleCloseModal]);

    const handleOpenArchiveModal = useCallback(() => {
        setIsModalOpen(false);
        setIsArchiveModalOpen(true);
    }, []);

    const handleCloseArchiveModal = useCallback(() => {
        setIsArchiveModalOpen(false);
        setSelectedAppointment(null);
    }, []);

    const handleConfirmArchive = useCallback(async (reason: ArchiveReason) => {
        if (selectedAppointment) {
            await onArchiveAppointment(selectedAppointment.id, reason);
            handleCloseArchiveModal();
        }
    }, [selectedAppointment, onArchiveAppointment, handleCloseArchiveModal]);

    if (loading) {
        return (
            <div className="liquid-card h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent"></div>
                    <p className="text-white/60">Loading appointments...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="liquid-card h-full liquid-calendar">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                    }}
                    initialView="dayGridMonth"
                    events={calendarEvents}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={3}
                    moreLinkClick="popover"
                    select={handleDateClick}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventResize={handleEventDrop}
                    height="100%"
                    nowIndicator={true}
                    eventContent={(eventInfo) => {
                        const apt = eventInfo.event.extendedProps.appointment as CalendarAppointment;
                        const time = format(new Date(apt.appointment_time), 'h:mm a');
                        return (
                            <div className="flex items-center gap-1.5 px-1 py-0.5 overflow-hidden">
                                <div
                                    className="user-color-dot flex-shrink-0"
                                    style={{
                                        '--liquid-r': parseInt(eventInfo.event.extendedProps.userColor.slice(1, 3), 16),
                                        '--liquid-g': parseInt(eventInfo.event.extendedProps.userColor.slice(3, 5), 16),
                                        '--liquid-b': parseInt(eventInfo.event.extendedProps.userColor.slice(5, 7), 16),
                                    } as React.CSSProperties}
                                />
                                <span className="text-xs font-medium truncate">
                                    {eventInfo.timeText || time} {eventInfo.event.title}
                                </span>
                            </div>
                        );
                    }}
                />
            </div>

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveAppointment}
                onDelete={selectedAppointment ? handleDeleteAppointment : undefined}
                onArchive={selectedAppointment ? handleOpenArchiveModal : undefined}
                appointment={selectedAppointment}
                initialDate={selectedDate}
                currentUserId={currentUserId}
            />

            <ArchiveModal
                isOpen={isArchiveModalOpen}
                onClose={handleCloseArchiveModal}
                onConfirm={handleConfirmArchive}
                appointment={selectedAppointment}
            />
        </>
    );
};
