import React, { useState, useMemo, useContext, useEffect } from 'react';
import { CALENDAR_EVENTS } from '../constants';
import type { CalendarEvent } from '../types';
import { TrashIcon } from '@heroicons/react/24/solid';
import { GlassButton } from '@/components/ui/glass-button';
import { UserContext } from '../App';
import { supabase } from '../supabaseClient';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventChangeArg } from '@fullcalendar/core';

type CalendarEventFormData = Omit<CalendarEvent, 'id' | 'createdBy'>;

// Modal component for adding/editing events
const EventModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CalendarEventFormData) => void;
    onDelete?: () => void;
    initialData: CalendarEventFormData;
}> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData);
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // Format date for input type="datetime-local" which needs YYYY-MM-DDTHH:mm
    const formatDateForInput = (date: Date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, date: new Date(e.target.value)}));
    };

    const handleSave = () => {
        if (!formData.title || !formData.date) {
            alert("Title and Date are required.");
            return;
        }
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="w-full max-w-md transform transition-all bg-[#1b1f26] border border-border-high rounded-panel shadow-2xl p-8">
                <h3 className="text-2xl font-bold text-primary mb-6 font-orbitron tracking-tight-lg">{onDelete ? 'Edit Appointment' : 'New Appointment'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Title</label>
                        <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-[#06b6d4] text-primary placeholder:text-[#D5D5D5] rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Customer</label>
                        <input name="customer" value={formData.customer} onChange={handleChange} className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-[#06b6d4] text-primary placeholder:text-[#D5D5D5] rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Salesperson</label>
                        <input name="salesperson" value={formData.salesperson} onChange={handleChange} className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-[#06b6d4] text-primary placeholder:text-[#D5D5D5] rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Date & Time</label>
                        <input type="datetime-local" name="date" value={formatDateForInput(formData.date)} onChange={handleDateChange} className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-[#06b6d4] text-primary placeholder:text-[#D5D5D5] rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                </div>
                <div className="mt-8 flex justify-between items-center">
                    <div>
                        {onDelete && (
                            <GlassButton size="sm" onClick={onDelete} contentClassName="flex items-center gap-2">
                                <TrashIcon className="h-5 w-5"/> Delete
                            </GlassButton>
                        )}
                    </div>
                    <div className="flex space-x-4">
                        <GlassButton onClick={onClose}>Cancel</GlassButton>
                        <GlassButton onClick={handleSave}>Save Appointment</GlassButton>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Calendar: React.FC = () => {
    const userContext = useContext(UserContext);
    const currentUserId = userContext?.user.id || 'anonymous';
    const isAdmin = userContext?.user.role === 'admin';

    const [currentUserName, setCurrentUserName] = useState<string>(userContext?.user.name ?? 'Dealer User');
    const [events, setEvents] = useState<CalendarEvent[]>(CALENDAR_EVENTS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<CalendarEventFormData>({
        title: '',
        customer: '',
        salesperson: currentUserName,
        date: new Date(),
    });
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedEventOwner, setSelectedEventOwner] = useState<string | null>(null);

    // Load current user's username from user_metadata
    useEffect(() => {
        const loadUsername = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) throw error;
                if (user) {
                    const username = user.user_metadata?.username ?? user.email ?? 'Dealer User';
                    setCurrentUserName(username);
                }
            } catch (error) {
                console.error('Error loading username:', error);
            }
        };
        loadUsername();
    }, []);
    
    const fullCalendarEvents = useMemo(() => {
        return events.map(e => {
            const owner = e.createdBy || 'system';
            return {
                id: String(e.id),
                title: e.title,
                start: e.date,
                editable: isAdmin || owner === currentUserId,
                extendedProps: {
                    customer: e.customer,
                    salesperson: e.salesperson,
                    createdBy: owner,
                },
            };
        });
    }, [events, currentUserId, isAdmin]);

    const handleDateSelect = (selectInfo: DateSelectArg) => {
        setModalInitialData({
            title: '',
            customer: '',
            salesperson: currentUserName,
            date: selectInfo.start,
        });
        setSelectedEventId(null);
        setSelectedEventOwner(currentUserId);
        setIsModalOpen(true);
    };

    const handleEventClick = (clickInfo: EventClickArg) => {
        const { id, title, start, extendedProps } = clickInfo.event;
        const ownerIdRaw: string | undefined =
            extendedProps.createdBy ?? events.find(event => String(event.id) === id)?.createdBy;
        const ownerId = ownerIdRaw || 'system';
        const canModify = isAdmin || ownerId === currentUserId;
        if (!canModify) {
            alert('You can only edit events that you created.');
            return;
        }
        setModalInitialData({
            title,
            date: start || new Date(),
            customer: extendedProps.customer,
            salesperson: extendedProps.salesperson,
        });
        setSelectedEventOwner(ownerId ?? null);
        setSelectedEventId(id);
        setIsModalOpen(true);
    };

    const handleEventChange = (changeInfo: EventChangeArg) => {
        const { id, start } = changeInfo.event;
        const eventToUpdate = events.find(event => String(event.id) === id);
        const ownerId = eventToUpdate?.createdBy || 'system';
        const canModify = eventToUpdate && (isAdmin || ownerId === currentUserId);
        if (!canModify) {
            changeInfo.revert();
            alert('You can only adjust your own events.');
            return;
        }
        setEvents(prev =>
            prev.map(event =>
                String(event.id) === id ? { ...event, date: start || event.date } : event,
            ),
        );
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEventId(null);
        setSelectedEventOwner(null);
    };

    const handleSaveEvent = (data: CalendarEventFormData) => {
        if (selectedEventId) {
            const target = events.find(event => String(event.id) === selectedEventId);
            const ownerId = target?.createdBy || 'system';
            const canModify = target && (isAdmin || ownerId === currentUserId);
            if (!canModify) {
                alert('You can only update events that you created.');
                return;
            }
            setEvents(prev =>
                prev.map(event =>
                    String(event.id) === selectedEventId ? { ...event, ...data } : event,
                ),
            );
        } else {
            const owner = currentUserId || 'anonymous';
            const newEvent: CalendarEvent = {
                ...data,
                id: Date.now(),
                createdBy: owner,
            };
            setEvents(prev => [...prev, newEvent]);
        }
        handleCloseModal();
    };

    const handleDeleteEvent = () => {
        if (!selectedEventId) return;
        const canModify = isAdmin || (selectedEventOwner && selectedEventOwner === currentUserId);
        if (!canModify) {
            alert('You can only delete events that you created.');
            return;
        }
        setEvents(prev => prev.filter(event => String(event.id) !== selectedEventId));
        handleCloseModal();
    };

    return (
        <>
            <div className="glass-card p-4 md:p-6 h-full text-secondary">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                    }}
                    initialView="dayGridMonth"
                    events={fullCalendarEvents}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    eventChange={handleEventChange}
                    height="100%"
                />
            </div>

            <EventModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveEvent}
                onDelete={selectedEventId ? handleDeleteEvent : undefined}
                initialData={modalInitialData}
            />
        </>
    );
};

export default Calendar;
