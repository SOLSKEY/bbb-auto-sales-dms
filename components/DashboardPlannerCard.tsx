import React, { useMemo } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/solid';
import type { CalendarEvent } from '../types';
import { toUtcMidnight } from '../utils/date';

interface DashboardPlannerCardProps {
    events: CalendarEvent[];
}

const formatDateLabel = (date: Date) =>
    date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

const DashboardPlannerCard: React.FC<DashboardPlannerCardProps> = ({ events }) => {
    const { upcomingEvents } = useMemo(() => {
        const today = toUtcMidnight(new Date());
        const processedEvents = events
            .map(event => ({ ...event, date: new Date(event.date) })) // Ensure date is a Date object
            .filter(event => toUtcMidnight(event.date).getTime() >= today.getTime()) // Filter for today and upcoming
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(event => ({
                ...event,
                time: event.date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) // Add time property
            }));

        return {
            upcomingEvents: processedEvents,
        };
    }, [events]);

    return (
        <div className="glass-card-outline p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-contrast uppercase tracking-wider">Upcoming Events</h3>
                <div className="p-2 rounded-lg bg-white/5">
                    <CalendarDaysIcon className="h-5 w-5 icon-neon" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-muted-contrast text-center py-4">No upcoming events</p>
                ) : (
                    upcomingEvents.map((event) => (
                        <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex-shrink-0 w-12 text-center bg-black/20 rounded p-1 flex flex-col justify-center">
                                <span className="text-xs text-muted-contrast uppercase">{event.date.toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-lg font-bold text-primary-contrast">{event.date.getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-primary-contrast truncate">{event.title}</p>
                                <p className="text-xs text-muted-contrast mt-0.5">{event.time}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DashboardPlannerCard;
