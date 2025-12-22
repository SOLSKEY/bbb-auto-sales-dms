import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../supabaseClient';
import type { Appointment, Lead, FollowUp, AppointmentStatus, LeadPriority } from '../types';
import { UserContext } from '../App';

// Field maps for Supabase
export const APPOINTMENT_FIELD_MAP = {
    id: 'id',
    user_id: 'user_id',
    title: 'title',
    customer_name: 'customer_name',
    customer_phone: 'customer_phone',
    lead_source: 'lead_source',
    appointment_time: 'appointment_time',
    down_payment_budget: 'down_payment_budget',
    notes: 'notes',
    status: 'status',
    vehicle_ids: 'vehicle_ids',
    model_interests: 'model_interests',
    created_at: 'created_at',
    updated_at: 'updated_at',
};

export const LEAD_FIELD_MAP = {
    id: 'id',
    user_id: 'user_id',
    customer_name: 'customer_name',
    customer_phone: 'customer_phone',
    lead_source: 'lead_source',
    down_payment_budget: 'down_payment_budget',
    notes: 'notes',
    model_interests: 'model_interests',
    potential_date: 'potential_date',
    priority: 'priority',
    was_appointment: 'was_appointment',
    original_appointment_id: 'original_appointment_id',
    original_appointment_date: 'original_appointment_date',
    follow_ups: 'follow_ups',
    created_at: 'created_at',
    updated_at: 'updated_at',
};

interface UseCalendarLeadsReturn {
    // Data
    appointments: Appointment[];
    leads: Lead[];
    leadSources: string[];

    // Loading states
    loading: boolean;
    appointmentsLoading: boolean;
    leadsLoading: boolean;

    // Error state
    error: string | null;

    // Appointment CRUD
    createAppointment: (data: Partial<Appointment>) => Promise<Appointment | null>;
    updateAppointment: (id: string, data: Partial<Appointment>) => Promise<boolean>;
    deleteAppointment: (id: string) => Promise<boolean>;

    // Lead CRUD
    createLead: (data: Partial<Lead>) => Promise<Lead | null>;
    updateLead: (id: string, data: Partial<Lead>) => Promise<boolean>;
    deleteLead: (id: string) => Promise<boolean>;
    addFollowUp: (leadId: string, followUp: Omit<FollowUp, 'id'>) => Promise<boolean>;

    // Archive flow
    archiveAppointmentToLead: (appointmentId: string, reason?: string) => Promise<Lead | null>;

    // Duplicate detection
    checkDuplicate: (phone: string) => Promise<{
        exists: boolean;
        inAppointments: Appointment[];
        inLeads: Lead[]
    }>;

    // Lead source management
    addLeadSource: (source: string) => Promise<void>;

    // Refresh
    refresh: () => Promise<void>;
}

export const useCalendarLeads = (): UseCalendarLeadsReturn => {
    const userContext = useContext(UserContext);
    const currentUserId = userContext?.user?.id;

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [leadSources, setLeadSources] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [appointmentsLoading, setAppointmentsLoading] = useState(true);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load appointments
    const loadAppointments = useCallback(async () => {
        try {
            setAppointmentsLoading(true);
            const { data, error: err } = await supabase
                .from('calendar_appointments')
                .select('*')
                .order('appointment_time', { ascending: true });

            if (err) throw err;
            setAppointments(data || []);
        } catch (err) {
            console.error('Error loading appointments:', err);
            setError(String(err));
        } finally {
            setAppointmentsLoading(false);
        }
    }, []);

    // Load leads
    const loadLeads = useCallback(async () => {
        try {
            setLeadsLoading(true);
            const { data, error: err } = await supabase
                .from('calendar_leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (err) throw err;
            // Parse follow_ups JSON if needed
            const parsedLeads = (data || []).map(lead => ({
                ...lead,
                follow_ups: Array.isArray(lead.follow_ups) ? lead.follow_ups : [],
            }));
            setLeads(parsedLeads);
        } catch (err) {
            console.error('Error loading leads:', err);
            setError(String(err));
        } finally {
            setLeadsLoading(false);
        }
    }, []);

    // Load lead sources for autocomplete
    const loadLeadSources = useCallback(async () => {
        try {
            const { data, error: err } = await supabase
                .from('lead_sources')
                .select('name')
                .order('usage_count', { ascending: false });

            if (err) {
                // Check if it's a 404 (table doesn't exist) or other error
                const isNotFound = err.code === 'PGRST116' || err.message?.includes('404') || err.message?.includes('not found');
                
                if (isNotFound) {
                    // Table doesn't exist yet, use defaults (silently)
                    setLeadSources(['Facebook', 'Walk-in', 'Referral', 'Phone Call', 'Website', 'Craigslist', 'Offerup']);
                    return;
                }
                
                // Other errors - log but still use defaults
                console.warn('Error loading lead sources:', err);
                setLeadSources(['Facebook', 'Walk-in', 'Referral', 'Phone Call', 'Website', 'Craigslist', 'Offerup']);
                return;
            }
            
            // Success - use data from database, fallback to defaults if empty
            const sources = data?.map(s => s.name) || [];
            setLeadSources(sources.length > 0 ? sources : ['Facebook', 'Walk-in', 'Referral', 'Phone Call', 'Website', 'Craigslist', 'Offerup']);
        } catch (err) {
            // Unexpected error - use defaults
            console.warn('Error loading lead sources:', err);
            setLeadSources(['Facebook', 'Walk-in', 'Referral', 'Phone Call', 'Website', 'Craigslist', 'Offerup']);
        }
    }, []);

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        await Promise.all([loadAppointments(), loadLeads(), loadLeadSources()]);
        setLoading(false);
    }, [loadAppointments, loadLeads, loadLeadSources]);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Create appointment
    const createAppointment = useCallback(async (data: Partial<Appointment>): Promise<Appointment | null> => {
        try {
            const insertData = {
                ...data,
                user_id: data.user_id || currentUserId,
                status: data.status || 'scheduled',
                vehicle_ids: data.vehicle_ids || [],
                model_interests: data.model_interests || [],
            };

            const { data: result, error: err } = await supabase
                .from('calendar_appointments')
                .insert(insertData)
                .select()
                .single();

            if (err) throw err;

            // Update local state
            setAppointments(prev => [...prev, result].sort((a, b) =>
                new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
            ));

            return result;
        } catch (err) {
            console.error('Error creating appointment:', err);
            setError(String(err));
            return null;
        }
    }, [currentUserId]);

    // Update appointment
    const updateAppointment = useCallback(async (id: string, data: Partial<Appointment>): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('calendar_appointments')
                .update(data)
                .eq('id', id);

            if (err) throw err;

            // Update local state
            setAppointments(prev => prev.map(apt =>
                apt.id === id ? { ...apt, ...data } : apt
            ));

            return true;
        } catch (err) {
            console.error('Error updating appointment:', err);
            setError(String(err));
            return false;
        }
    }, []);

    // Delete appointment
    const deleteAppointment = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('calendar_appointments')
                .delete()
                .eq('id', id);

            if (err) throw err;

            // Update local state
            setAppointments(prev => prev.filter(apt => apt.id !== id));

            return true;
        } catch (err) {
            console.error('Error deleting appointment:', err);
            setError(String(err));
            return false;
        }
    }, []);

    // Create lead
    const createLead = useCallback(async (data: Partial<Lead>): Promise<Lead | null> => {
        try {
            const insertData = {
                ...data,
                user_id: data.user_id || currentUserId,
                priority: data.priority || 'warm',
                model_interests: data.model_interests || [],
                follow_ups: data.follow_ups || [],
                was_appointment: data.was_appointment || false,
            };

            const { data: result, error: err } = await supabase
                .from('calendar_leads')
                .insert(insertData)
                .select()
                .single();

            if (err) throw err;

            // Update local state
            setLeads(prev => [result, ...prev]);

            return result;
        } catch (err) {
            console.error('Error creating lead:', err);
            setError(String(err));
            return null;
        }
    }, [currentUserId]);

    // Update lead
    const updateLead = useCallback(async (id: string, data: Partial<Lead>): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('calendar_leads')
                .update(data)
                .eq('id', id);

            if (err) throw err;

            // Update local state
            setLeads(prev => prev.map(lead =>
                lead.id === id ? { ...lead, ...data } : lead
            ));

            return true;
        } catch (err) {
            console.error('Error updating lead:', err);
            setError(String(err));
            return false;
        }
    }, []);

    // Delete lead
    const deleteLead = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error: err } = await supabase
                .from('calendar_leads')
                .delete()
                .eq('id', id);

            if (err) throw err;

            // Update local state
            setLeads(prev => prev.filter(lead => lead.id !== id));

            return true;
        } catch (err) {
            console.error('Error deleting lead:', err);
            setError(String(err));
            return false;
        }
    }, []);

    // Add follow-up to lead
    const addFollowUp = useCallback(async (leadId: string, followUp: Omit<FollowUp, 'id'>): Promise<boolean> => {
        try {
            const lead = leads.find(l => l.id === leadId);
            if (!lead) throw new Error('Lead not found');

            const newFollowUp: FollowUp = {
                ...followUp,
                id: crypto.randomUUID(),
            };

            const updatedFollowUps = [...(lead.follow_ups || []), newFollowUp];

            const { error: err } = await supabase
                .from('calendar_leads')
                .update({ follow_ups: updatedFollowUps })
                .eq('id', leadId);

            if (err) throw err;

            // Update local state
            setLeads(prev => prev.map(l =>
                l.id === leadId ? { ...l, follow_ups: updatedFollowUps } : l
            ));

            return true;
        } catch (err) {
            console.error('Error adding follow-up:', err);
            setError(String(err));
            return false;
        }
    }, [leads]);

    // Archive appointment to lead
    const archiveAppointmentToLead = useCallback(async (
        appointmentId: string,
        reason?: string
    ): Promise<Lead | null> => {
        try {
            const appointment = appointments.find(a => a.id === appointmentId);
            if (!appointment) throw new Error('Appointment not found');

            // Create new lead from appointment
            const leadData: Partial<Lead> = {
                user_id: appointment.user_id,
                customer_name: appointment.customer_name,
                customer_phone: appointment.customer_phone,
                lead_source: appointment.lead_source,
                down_payment_budget: appointment.down_payment_budget,
                notes: appointment.notes ? `${appointment.notes}\n\nArchived from appointment: ${reason || 'No reason provided'}` : `Archived from appointment: ${reason || 'No reason provided'}`,
                model_interests: appointment.model_interests,
                was_appointment: true,
                original_appointment_id: appointment.id,
                original_appointment_date: appointment.appointment_time,
                priority: 'warm',
            };

            // Create the lead
            const newLead = await createLead(leadData);
            if (!newLead) throw new Error('Failed to create lead');

            // Update appointment status
            await updateAppointment(appointmentId, {
                status: reason === 'No-Show' ? 'no_show' : 'cancelled'
            });

            return newLead;
        } catch (err) {
            console.error('Error archiving appointment to lead:', err);
            setError(String(err));
            return null;
        }
    }, [appointments, createLead, updateAppointment]);

    // Check for duplicate phone number
    const checkDuplicate = useCallback(async (phone: string): Promise<{
        exists: boolean;
        inAppointments: Appointment[];
        inLeads: Lead[];
    }> => {
        if (!phone || phone.length < 7) {
            return { exists: false, inAppointments: [], inLeads: [] };
        }

        // Normalize phone number - remove all non-digits
        const normalizedPhone = phone.replace(/\D/g, '');

        // Check appointments
        const matchingAppointments = appointments.filter(apt =>
            apt.customer_phone?.replace(/\D/g, '') === normalizedPhone
        );

        // Check leads
        const matchingLeads = leads.filter(lead =>
            lead.customer_phone?.replace(/\D/g, '') === normalizedPhone
        );

        return {
            exists: matchingAppointments.length > 0 || matchingLeads.length > 0,
            inAppointments: matchingAppointments,
            inLeads: matchingLeads,
        };
    }, [appointments, leads]);

    // Add lead source
    const addLeadSource = useCallback(async (source: string) => {
        if (!source || leadSources.includes(source)) return;

        try {
            const { error: err } = await supabase
                .from('lead_sources')
                .upsert({
                    name: source,
                    usage_count: 1
                }, {
                    onConflict: 'name'
                });

            if (err) {
                // Check if it's a 404 (table doesn't exist) - fail silently
                const isNotFound = err.code === 'PGRST116' || err.message?.includes('404') || err.message?.includes('not found');
                if (!isNotFound) {
                    console.warn('Error adding lead source:', err);
                }
                // Still add to local state even if DB operation fails
                setLeadSources(prev => prev.includes(source) ? prev : [...prev, source]);
                return;
            }

            // Success - add to local state
            setLeadSources(prev => prev.includes(source) ? prev : [...prev, source]);
        } catch (err) {
            // Unexpected error - still add to local state
            console.warn('Error adding lead source:', err);
            setLeadSources(prev => prev.includes(source) ? prev : [...prev, source]);
        }
    }, [leadSources]);

    return {
        appointments,
        leads,
        leadSources,
        loading,
        appointmentsLoading,
        leadsLoading,
        error,
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
        refresh: loadData,
    };
};

export default useCalendarLeads;
