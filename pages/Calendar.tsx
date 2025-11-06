import React, { useState, useMemo } from 'react';
import { CALENDAR_EVENTS } from '../constants';
import type { CalendarEvent } from '../types';
import { TrashIcon } from '@heroicons/react/24/solid';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventChangeArg } from '@fullcalendar/core';

// Modal component for adding/editing events
const EventModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<CalendarEvent, 'id'>) => void;
    onDelete?: () => void;
    initialData: Omit<CalendarEvent, 'id'>;
}> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
    const [formData, setFormData] = useState(initialData);

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
            <div className="glass-panel rounded-panel shadow-glass p-8 w-full max-w-md transform transition-all border border-border-high">
                <h3 className="text-2xl font-bold text-primary mb-6 font-orbitron tracking-tight-lg">{onDelete ? 'Edit Appointment' : 'New Appointment'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Title</label>
                        <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Customer</label>
                        <input name="customer" value={formData.customer} onChange={handleChange} className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Salesperson</label>
                        <input name="salesperson" value={formData.salesperson} onChange={handleChange} className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Date & Time</label>
                        <input type="datetime-local" name="date" value={formatDateForInput(formData.date)} onChange={handleDateChange} className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors" />
                    </div>
                </div>
                <div className="mt-8 flex justify-between items-center">
                    <div>
                        {onDelete && (
                            <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 rounded-md text-red-400 bg-glass-panel hover:bg-red-900/50 transition-colors border border-border-low">
                                <TrashIcon className="h-5 w-5"/> Delete
                            </button>
                        )}
                    </div>
                    <div className="flex space-x-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-md text-secondary bg-glass-panel hover:bg-glass-panel/80 transition-colors border border-border-low">Cancel</button>
                        <button onClick={handleSave} className="btn-lava">Save Appointment</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Calendar: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>(CALENDAR_EVENTS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<Omit<CalendarEvent, 'id'>>({
        title: '', customer: '', salesperson: '', date: new Date()
    });
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    
    const fullCalendarEvents = useMemo(() => {
        return events.map(e => ({
            id: String(e.id),
            title: e.title,
            start: e.date,
            extendedProps: {
                customer: e.customer,
                salesperson: e.salesperson,
            }
        }));
    }, [events]);

    const handleDateSelect = (selectInfo: DateSelectArg) => {
        setModalInitialData({
            title: '',
            customer: '',
            salesperson: '',
            date: selectInfo.start,
        });
        setSelectedEventId(null);
        setIsModalOpen(true);
    };

    const handleEventClick = (clickInfo: EventClickArg) => {
        const { id, title, start, extendedProps } = clickInfo.event;
        setModalInitialData({
            title,
            date: start || new Date(),
            customer: extendedProps.customer,
            salesperson: extendedProps.salesperson
        });
        setSelectedEventId(id);
        setIsModalOpen(true);
    };

    const handleEventChange = (changeInfo: EventChangeArg) => {
        const { id, start } = changeInfo.event;
        setEvents(prev => prev.map(event => 
            String(event.id) === id ? { ...event, date: start || event.date } : event
        ));
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSaveEvent = (data: Omit<CalendarEvent, 'id'>) => {
        if (selectedEventId) { // Editing existing event
            setEvents(prev => prev.map(event =>
                String(event.id) === selectedEventId ? { ...data, id: parseInt(selectedEventId) } : event
            ));
        } else { // Creating new event
            const newEvent: CalendarEvent = {
                ...data,
                id: Date.now(),
            };
            setEvents(prev => [...prev, newEvent]);
        }
        handleCloseModal();
    };

    const handleDeleteEvent = () => {
        if (!selectedEventId) return;
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