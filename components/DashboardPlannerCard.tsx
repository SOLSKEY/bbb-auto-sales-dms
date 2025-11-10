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
    const { todayEvents, upcomingEvents, todayLabel } = useMemo(() => {
        const today = toUtcMidnight(new Date());
        const sorted = [...events]
            .map(event => ({ ...event, date: new Date(event.date) }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        const normalizedTodayEvents = sorted.filter(event => toUtcMidnight(event.date).getTime() === today.getTime());
        const normalizedUpcoming = sorted
            .filter(event => toUtcMidnight(event.date).getTime() > today.getTime())
            .slice(0, 4);

        return {
            todayEvents: normalizedTodayEvents,
            upcomingEvents: normalizedUpcoming,
            todayLabel: formatDateLabel(today),
        };
    }, [events]);

    return (
        <div className="glass-card p-4 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <CalendarDaysIcon className="h-6 w-6 text-lava-core" />
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Today's Appointments</p>
                    <p className="text-lg font-semibold text-primary">{todayLabel}</p>
                </div>
            </div>

            <div className="space-y-3 flex-1">
                {todayEvents.length > 0 ? (
                    todayEvents.map(event => (
                        <div key={`today-${event.id}`} className="rounded-lg border border-border-low p-3 bg-glass-panel/60">
                            <p className="text-sm font-semibold text-primary">{event.title}</p>
                            <p className="text-xs text-secondary">
                                {event.customer} • {event.salesperson}
                            </p>
                            <p className="text-xs text-muted mt-1">
                                {event.date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-secondary border border-dashed border-border-low rounded-lg p-3">
                        No appointments scheduled for today.
                    </p>
                )}
            </div>

            <div className="border-t border-border-low mt-4 pt-4">
                <p className="text-xs uppercase tracking-wide text-muted mb-3">Upcoming</p>
                {upcomingEvents.length > 0 ? (
                    <div className="space-y-2">
                        {upcomingEvents.map(event => (
                            <div key={`upcoming-${event.id}`} className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-primary">{event.title}</p>
                                    <p className="text-xs text-secondary">
                                        {event.customer} • {event.salesperson}
                                    </p>
                                </div>
                                <div className="text-xs text-muted text-right">
                                    <p>{formatDateLabel(event.date)}</p>
                                    <p>{event.date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-secondary">No upcoming appointments on the calendar.</p>
                )}
            </div>
        </div>
    );
};

export default DashboardPlannerCard;
