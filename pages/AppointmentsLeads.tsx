import React, { useState, useContext, useEffect, useCallback } from 'react';
import { UserContext } from '../App';
import { useDeviceType } from '../hooks/useDeviceType';
import { useAppointments, useLeads, useUserColors, archiveAppointmentToLead } from '../hooks/useAppointmentsLeads';
import { CalendarTab } from '../components/appointments-leads/CalendarTab';
import { LeadsTab } from '../components/appointments-leads/LeadsTab';
import { CalendarDaysIcon, UsersIcon } from '@heroicons/react/24/outline';
import type { ArchiveReason } from '../types';

type TabType = 'calendar' | 'leads';

const AppointmentsLeads: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('calendar');
    const { isMobile } = useDeviceType();
    const userContext = useContext(UserContext);
    const currentUserId = userContext?.user.id || '';
    const isAdmin = userContext?.user.role === 'admin';

    const {
        appointments,
        loading: appointmentsLoading,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        updateStatus,
    } = useAppointments();

    const {
        leads,
        loading: leadsLoading,
        createLead,
        updateLead,
        deleteLead,
        addFollowUp,
    } = useLeads();

    const { userColors, getOrAssignColor } = useUserColors();

    // Ensure current user has a color assigned
    useEffect(() => {
        if (currentUserId) {
            getOrAssignColor(currentUserId);
        }
    }, [currentUserId, getOrAssignColor]);

    // Archive appointment handler
    const handleArchiveAppointment = useCallback(async (appointmentId: string, reason: ArchiveReason) => {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (!appointment) return { error: 'Appointment not found' };

        const result = await archiveAppointmentToLead(appointment, reason);
        return { error: result.error };
    }, [appointments]);

    // Mobile view - use same components with bottom sheets auto-detected
    if (isMobile) {
        return (
            <div className="flex flex-col h-full">
                {/* Mobile Tab Bar */}
                <div className="px-4 pt-4">
                    <div className="liquid-tabs-list w-full">
                        <button
                            className={`liquid-tab flex-1 flex items-center justify-center gap-2 ${activeTab === 'calendar' ? 'active' : ''}`}
                            onClick={() => setActiveTab('calendar')}
                        >
                            <CalendarDaysIcon className="w-5 h-5" />
                            <span>Calendar</span>
                        </button>
                        <button
                            className={`liquid-tab flex-1 flex items-center justify-center gap-2 ${activeTab === 'leads' ? 'active' : ''}`}
                            onClick={() => setActiveTab('leads')}
                        >
                            <UsersIcon className="w-5 h-5" />
                            <span>Leads</span>
                            {leads.length > 0 && (
                                <span className="liquid-badge size-1 ml-1">
                                    {leads.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Content */}
                <div className="flex-1 overflow-hidden p-4">
                    {activeTab === 'calendar' ? (
                        <CalendarTab
                            appointments={appointments}
                            loading={appointmentsLoading}
                            userColors={userColors}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            onCreateAppointment={createAppointment}
                            onUpdateAppointment={updateAppointment}
                            onDeleteAppointment={deleteAppointment}
                            onUpdateStatus={updateStatus}
                            onArchiveAppointment={handleArchiveAppointment}
                        />
                    ) : (
                        <LeadsTab
                            leads={leads}
                            loading={leadsLoading}
                            userColors={userColors}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            onCreateLead={createLead}
                            onUpdateLead={updateLead}
                            onDeleteLead={deleteLead}
                            onAddFollowUp={addFollowUp}
                        />
                    )}
                </div>
            </div>
        );
    }

    // Desktop view
    return (
        <div className="flex flex-col h-full p-4 md:p-6 gap-4">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between">
                <div className="liquid-tabs-list">
                    <button
                        className={`liquid-tab flex items-center gap-2 ${activeTab === 'calendar' ? 'active' : ''}`}
                        onClick={() => setActiveTab('calendar')}
                    >
                        <CalendarDaysIcon className="w-5 h-5" />
                        <span>Calendar</span>
                    </button>
                    <button
                        className={`liquid-tab flex items-center gap-2 ${activeTab === 'leads' ? 'active' : ''}`}
                        onClick={() => setActiveTab('leads')}
                    >
                        <UsersIcon className="w-5 h-5" />
                        <span>Leads</span>
                        {leads.length > 0 && (
                            <span className="liquid-badge size-1 ml-1">
                                {leads.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'calendar' ? (
                    <CalendarTab
                        appointments={appointments}
                        loading={appointmentsLoading}
                        userColors={userColors}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onCreateAppointment={createAppointment}
                        onUpdateAppointment={updateAppointment}
                        onDeleteAppointment={deleteAppointment}
                        onUpdateStatus={updateStatus}
                        onArchiveAppointment={handleArchiveAppointment}
                    />
                ) : (
                    <LeadsTab
                        leads={leads}
                        loading={leadsLoading}
                        userColors={userColors}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onCreateLead={createLead}
                        onUpdateLead={updateLead}
                        onDeleteLead={deleteLead}
                        onAddFollowUp={addFollowUp}
                    />
                )}
            </div>
        </div>
    );
};

export default AppointmentsLeads;
