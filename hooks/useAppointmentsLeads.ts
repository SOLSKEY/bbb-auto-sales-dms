import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { UserContext } from '../App';
import type {
    CalendarAppointment,
    CalendarLead,
    UserColor,
    FollowUpLog,
    AppointmentStatus,
    ArchiveReason,
    USER_COLOR_PALETTE,
} from '../types';

// User color palette for auto-assignment
const COLOR_PALETTE = [
    { name: 'Amber', hex: '#f59e0b', r: 245, g: 158, b: 11 },
    { name: 'Emerald', hex: '#10b981', r: 16, g: 185, b: 129 },
    { name: 'Violet', hex: '#8b5cf6', r: 139, g: 92, b: 246 },
    { name: 'Pink', hex: '#ec4899', r: 236, g: 72, b: 153 },
    { name: 'Cyan', hex: '#06b6d4', r: 6, g: 182, b: 212 },
    { name: 'Orange', hex: '#f97316', r: 249, g: 115, b: 22 },
];

// =============================================
// Appointments Hook
// =============================================

export function useAppointments() {
    const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const userContext = useContext(UserContext);

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('calendar_appointments')
                .select('*')
                .order('appointment_time', { ascending: true });

            if (fetchError) throw fetchError;
            setAppointments(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
        } finally {
            setLoading(false);
        }
    }, []);

    const createAppointment = useCallback(async (
        appointment: Omit<CalendarAppointment, 'id' | 'created_at' | 'updated_at'>
    ) => {
        try {
            const { data, error: insertError } = await supabase
                .from('calendar_appointments')
                .insert([appointment])
                .select()
                .single();

            if (insertError) throw insertError;
            setAppointments(prev => [...prev, data]);
            return { data, error: null };
        } catch (err) {
            console.error('Error creating appointment:', err);
            return { data: null, error: err instanceof Error ? err.message : 'Failed to create appointment' };
        }
    }, []);

    const updateAppointment = useCallback(async (
        id: string,
        updates: Partial<CalendarAppointment>
    ) => {
        try {
            const { data, error: updateError } = await supabase
                .from('calendar_appointments')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            setAppointments(prev => prev.map(apt => apt.id === id ? data : apt));
            return { data, error: null };
        } catch (err) {
            console.error('Error updating appointment:', err);
            return { data: null, error: err instanceof Error ? err.message : 'Failed to update appointment' };
        }
    }, []);

    const deleteAppointment = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('calendar_appointments')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            setAppointments(prev => prev.filter(apt => apt.id !== id));
            return { error: null };
        } catch (err) {
            console.error('Error deleting appointment:', err);
            return { error: err instanceof Error ? err.message : 'Failed to delete appointment' };
        }
    }, []);

    const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
        return updateAppointment(id, { status });
    }, [updateAppointment]);

    // Subscribe to realtime changes
    useEffect(() => {
        fetchAppointments();

        const channel = supabase
            .channel('calendar_appointments_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'calendar_appointments',
                },
                () => {
                    fetchAppointments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAppointments]);

    return {
        appointments,
        loading,
        error,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        updateStatus,
    };
}

// =============================================
// Leads Hook
// =============================================

export function useLeads() {
    const [leads, setLeads] = useState<CalendarLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('calendar_leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setLeads(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching leads:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    }, []);

    const createLead = useCallback(async (
        lead: Omit<CalendarLead, 'id' | 'created_at' | 'updated_at'>
    ) => {
        try {
            const { data, error: insertError } = await supabase
                .from('calendar_leads')
                .insert([lead])
                .select()
                .single();

            if (insertError) throw insertError;
            setLeads(prev => [data, ...prev]);
            return { data, error: null };
        } catch (err) {
            console.error('Error creating lead:', err);
            return { data: null, error: err instanceof Error ? err.message : 'Failed to create lead' };
        }
    }, []);

    const updateLead = useCallback(async (
        id: string,
        updates: Partial<CalendarLead>
    ) => {
        try {
            const { data, error: updateError } = await supabase
                .from('calendar_leads')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            setLeads(prev => prev.map(lead => lead.id === id ? data : lead));
            return { data, error: null };
        } catch (err) {
            console.error('Error updating lead:', err);
            return { data: null, error: err instanceof Error ? err.message : 'Failed to update lead' };
        }
    }, []);

    const deleteLead = useCallback(async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('calendar_leads')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            setLeads(prev => prev.filter(lead => lead.id !== id));
            return { error: null };
        } catch (err) {
            console.error('Error deleting lead:', err);
            return { error: err instanceof Error ? err.message : 'Failed to delete lead' };
        }
    }, []);

    const addFollowUp = useCallback(async (id: string, followUp: FollowUpLog) => {
        const lead = leads.find(l => l.id === id);
        if (!lead) return { error: 'Lead not found' };

        const updatedFollowUps = [...(lead.follow_ups || []), followUp];
        return updateLead(id, { follow_ups: updatedFollowUps });
    }, [leads, updateLead]);

    // Subscribe to realtime changes
    useEffect(() => {
        fetchLeads();

        const channel = supabase
            .channel('calendar_leads_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'calendar_leads',
                },
                () => {
                    fetchLeads();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchLeads]);

    return {
        leads,
        loading,
        error,
        fetchLeads,
        createLead,
        updateLead,
        deleteLead,
        addFollowUp,
    };
}

// =============================================
// Archive Appointment to Lead (standalone function)
// =============================================

export async function archiveAppointmentToLead(
    appointment: CalendarAppointment,
    reason: ArchiveReason
): Promise<{ data: CalendarLead | null; error: string | null }> {
    try {
        // Create a new lead from the appointment
        const leadData = {
            user_id: appointment.user_id,
            customer_name: appointment.customer_name,
            customer_phone: appointment.customer_phone,
            lead_source: appointment.lead_source,
            down_payment_budget: appointment.down_payment_budget,
            notes: appointment.notes,
            model_interests: appointment.model_interests,
            potential_date: null,
            was_appointment: true,
            original_appointment_id: appointment.id,
            original_appointment_date: appointment.appointment_time,
            archive_reason: reason,
            follow_ups: [],
        };

        const { data: newLead, error: leadError } = await supabase
            .from('calendar_leads')
            .insert([leadData])
            .select()
            .single();

        if (leadError) throw leadError;

        // Update the appointment status based on reason
        const newStatus: AppointmentStatus = reason === 'no_show' ? 'no_show' : 'cancelled';
        const { error: updateError } = await supabase
            .from('calendar_appointments')
            .update({ status: newStatus })
            .eq('id', appointment.id);

        if (updateError) throw updateError;

        return { data: newLead, error: null };
    } catch (err) {
        console.error('Error archiving appointment to lead:', err);
        return { data: null, error: err instanceof Error ? err.message : 'Failed to archive appointment' };
    }
}

// =============================================
// User Colors Hook
// =============================================

export function useUserColors() {
    const [userColors, setUserColors] = useState<Record<string, UserColor>>({});
    const [loading, setLoading] = useState(true);
    const userContext = useContext(UserContext);

    const fetchUserColors = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('user_colors')
                .select('*');

            if (fetchError) throw fetchError;

            const colorsMap: Record<string, UserColor> = {};
            (data || []).forEach(uc => {
                colorsMap[uc.user_id] = uc;
            });
            setUserColors(colorsMap);
        } catch (err) {
            console.error('Error fetching user colors:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const getOrAssignColor = useCallback(async (userId: string): Promise<string> => {
        // Check if user already has a color
        if (userColors[userId]) {
            return userColors[userId].color;
        }

        // Get used colors
        const usedColors = Object.values(userColors).map(uc => uc.color);

        // Find first unused color from palette
        let assignedColor = COLOR_PALETTE[0].hex;
        for (const color of COLOR_PALETTE) {
            if (!usedColors.includes(color.hex)) {
                assignedColor = color.hex;
                break;
            }
        }

        // If all colors used, cycle through
        if (usedColors.length >= COLOR_PALETTE.length) {
            const index = Object.keys(userColors).length % COLOR_PALETTE.length;
            assignedColor = COLOR_PALETTE[index].hex;
        }

        // Save to database
        try {
            const { data, error } = await supabase
                .from('user_colors')
                .upsert({
                    user_id: userId,
                    color: assignedColor,
                    assigned_by: 'auto',
                })
                .select()
                .single();

            if (!error && data) {
                setUserColors(prev => ({ ...prev, [userId]: data }));
            }
        } catch (err) {
            console.error('Error assigning user color:', err);
        }

        return assignedColor;
    }, [userColors]);

    const updateUserColor = useCallback(async (userId: string, color: string, assignedBy: 'auto' | 'admin' = 'admin') => {
        try {
            const { data, error } = await supabase
                .from('user_colors')
                .upsert({
                    user_id: userId,
                    color,
                    assigned_by: assignedBy,
                })
                .select()
                .single();

            if (error) throw error;
            setUserColors(prev => ({ ...prev, [userId]: data }));
            return { error: null };
        } catch (err) {
            console.error('Error updating user color:', err);
            return { error: err instanceof Error ? err.message : 'Failed to update color' };
        }
    }, []);

    useEffect(() => {
        fetchUserColors();
    }, [fetchUserColors]);

    return {
        userColors,
        loading,
        getOrAssignColor,
        updateUserColor,
        fetchUserColors,
    };
}

// =============================================
// Duplicate Detection Hook
// =============================================

export function useDuplicateDetection() {
    const checkDuplicate = useCallback(async (phone: string): Promise<{
        hasDuplicate: boolean;
        existingAppointment?: CalendarAppointment;
        existingLead?: CalendarLead;
    }> => {
        if (!phone || phone.trim() === '') {
            return { hasDuplicate: false };
        }

        try {
            // Check appointments
            const { data: appointments } = await supabase
                .from('calendar_appointments')
                .select('*')
                .eq('customer_phone', phone)
                .limit(1);

            if (appointments && appointments.length > 0) {
                return { hasDuplicate: true, existingAppointment: appointments[0] };
            }

            // Check leads
            const { data: leads } = await supabase
                .from('calendar_leads')
                .select('*')
                .eq('customer_phone', phone)
                .limit(1);

            if (leads && leads.length > 0) {
                return { hasDuplicate: true, existingLead: leads[0] };
            }

            return { hasDuplicate: false };
        } catch (err) {
            console.error('Error checking for duplicates:', err);
            return { hasDuplicate: false };
        }
    }, []);

    return { checkDuplicate };
}

// =============================================
// Lead Source Suggestions Hook
// =============================================

export function useLeadSourceSuggestions() {
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const fetchSuggestions = useCallback(async () => {
        try {
            // Get unique lead sources from both tables
            const { data: appointmentSources } = await supabase
                .from('calendar_appointments')
                .select('lead_source')
                .not('lead_source', 'is', null);

            const { data: leadSources } = await supabase
                .from('calendar_leads')
                .select('lead_source')
                .not('lead_source', 'is', null);

            const allSources = new Set<string>();
            appointmentSources?.forEach(a => a.lead_source && allSources.add(a.lead_source));
            leadSources?.forEach(l => l.lead_source && allSources.add(l.lead_source));

            // Add default suggestions
            ['Facebook', 'Walk-in', 'Phone Call', 'Referral', 'Website', 'CarGurus', 'Marketplace'].forEach(s => allSources.add(s));

            setSuggestions(Array.from(allSources).sort());
        } catch (err) {
            console.error('Error fetching lead source suggestions:', err);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    return { suggestions, fetchSuggestions };
}
