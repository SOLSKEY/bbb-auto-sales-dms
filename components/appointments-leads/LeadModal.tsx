import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon, PhoneIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import type { CalendarLead } from '../../types';
import { ModelInterestInput } from './ModelInterestInput';
import { useDuplicateDetection, useLeadSourceSuggestions } from '../../hooks/useAppointmentsLeads';
import { BottomSheet } from '../ui/BottomSheet';
import { useDeviceType } from '../../hooks/useDeviceType';

interface LeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<CalendarLead, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    onDelete?: () => Promise<void>;
    lead: CalendarLead | null;
    currentUserId: string;
}

export const LeadModal: React.FC<LeadModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    lead,
    currentUserId,
}) => {
    const { isMobile } = useDeviceType();
    const { checkDuplicate } = useDuplicateDetection();
    const { suggestions: leadSourceSuggestions } = useLeadSourceSuggestions();

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [leadSource, setLeadSource] = useState('');
    const [downPaymentBudget, setDownPaymentBudget] = useState('');
    const [notes, setNotes] = useState('');
    const [modelInterests, setModelInterests] = useState<string[]>([]);
    const [potentialDate, setPotentialDate] = useState('');

    const [saving, setSaving] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
    const [showLeadSourceSuggestions, setShowLeadSourceSuggestions] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (lead) {
                setCustomerName(lead.customer_name || '');
                setCustomerPhone(lead.customer_phone || '');
                setLeadSource(lead.lead_source || '');
                setDownPaymentBudget(lead.down_payment_budget?.toString() || '');
                setNotes(lead.notes || '');
                setModelInterests(lead.model_interests || []);
                setPotentialDate(lead.potential_date || '');
            } else {
                setCustomerName('');
                setCustomerPhone('');
                setLeadSource('');
                setDownPaymentBudget('');
                setNotes('');
                setModelInterests([]);
                setPotentialDate('');
            }
            setDuplicateWarning(null);
        }
    }, [isOpen, lead]);

    // Check for duplicates when phone changes
    useEffect(() => {
        const checkForDuplicate = async () => {
            if (customerPhone && customerPhone.length >= 10 && !lead) {
                const result = await checkDuplicate(customerPhone);
                if (result.hasDuplicate) {
                    if (result.existingAppointment) {
                        setDuplicateWarning(`Customer with this phone has an appointment on ${format(new Date(result.existingAppointment.appointment_time), 'MMM d, yyyy')}`);
                    } else if (result.existingLead) {
                        setDuplicateWarning(`Customer with this phone already exists in leads`);
                    }
                } else {
                    setDuplicateWarning(null);
                }
            }
        };
        checkForDuplicate();
    }, [customerPhone, checkDuplicate, lead]);

    const formatPhoneNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (match) {
            let formatted = '';
            if (match[1]) formatted = `(${match[1]}`;
            if (match[1].length === 3) formatted += ') ';
            if (match[2]) formatted += match[2];
            if (match[2].length === 3 && match[3]) formatted += `-${match[3]}`;
            return formatted;
        }
        return value;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setCustomerPhone(formatted);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                user_id: currentUserId,
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                lead_source: leadSource || null,
                down_payment_budget: downPaymentBudget ? parseFloat(downPaymentBudget) : null,
                notes: notes || null,
                model_interests: modelInterests.length > 0 ? modelInterests : null,
                potential_date: potentialDate || null,
                was_appointment: lead?.was_appointment || false,
                original_appointment_id: lead?.original_appointment_id || null,
                original_appointment_date: lead?.original_appointment_date || null,
                archive_reason: lead?.archive_reason || null,
                follow_ups: lead?.follow_ups || [],
            });
        } finally {
            setSaving(false);
        }
    };

    const filteredLeadSourceSuggestions = leadSourceSuggestions.filter(s =>
        s.toLowerCase().includes(leadSource.toLowerCase())
    );

    const modalContent = (
        <div className="space-y-6">
            {/* Was Appointment Info */}
            {lead?.was_appointment && (
                <div className="liquid-callout liquid-yellow">
                    <CalendarDaysIcon className="w-5 h-5 callout-icon" />
                    <div>
                        <p className="text-sm font-medium text-white">Originally an Appointment</p>
                        <p className="text-xs text-white/60">
                            {lead.original_appointment_date
                                ? `Scheduled for ${format(new Date(lead.original_appointment_date), 'MMM d, yyyy h:mm a')}`
                                : 'Date not available'}
                            {lead.archive_reason && ` • Archived: ${lead.archive_reason.replace('_', ' ')}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Customer Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Customer Name</label>
                    <div className="liquid-input size-2">
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Phone Number</label>
                    <div className="liquid-input size-2">
                        <PhoneIcon className="w-4 h-4 text-white/40 mr-2" />
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={handlePhoneChange}
                            placeholder="(555) 123-4567"
                        />
                    </div>
                    {duplicateWarning && (
                        <p className="text-amber-400 text-xs mt-1">{duplicateWarning}</p>
                    )}
                </div>
            </div>

            {/* Lead Source */}
            <div className="relative">
                <label className="block text-sm font-medium text-white/70 mb-2">Source of Lead</label>
                <div className="liquid-input size-2">
                    <input
                        type="text"
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        onFocus={() => setShowLeadSourceSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowLeadSourceSuggestions(false), 200)}
                        placeholder="Facebook, Walk-in, Phone Call..."
                    />
                </div>
                {showLeadSourceSuggestions && filteredLeadSourceSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 liquid-card p-2 max-h-40 overflow-y-auto">
                        {filteredLeadSourceSuggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition"
                                onClick={() => {
                                    setLeadSource(suggestion);
                                    setShowLeadSourceSuggestions(false);
                                }}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Budget and Potential Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Down Payment Budget</label>
                    <div className="liquid-input size-2">
                        <span className="text-white/40 mr-1">$</span>
                        <input
                            type="number"
                            value={downPaymentBudget}
                            onChange={(e) => setDownPaymentBudget(e.target.value)}
                            placeholder="2,000"
                            min="0"
                            step="100"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                        Potential Timeframe
                        <span className="text-white/40 font-normal ml-2">(when they might buy)</span>
                    </label>
                    <div className="liquid-input size-2">
                        <CalendarDaysIcon className="w-4 h-4 text-white/40 mr-2" />
                        <input
                            type="date"
                            value={potentialDate}
                            onChange={(e) => setPotentialDate(e.target.value)}
                            className="[color-scheme:dark]"
                        />
                    </div>
                </div>
            </div>

            {/* Model Interest */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Model Interest</label>
                <ModelInterestInput
                    models={modelInterests}
                    onChange={setModelInterests}
                />
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Notes</label>
                <div className="liquid-input" style={{ height: 'auto', padding: '12px' }}>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes about this lead..."
                        rows={3}
                        className="w-full resize-none"
                    />
                </div>
            </div>

            {/* Follow-up History (if editing) */}
            {lead && lead.follow_ups && lead.follow_ups.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                        Follow-up History ({lead.follow_ups.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {[...lead.follow_ups].reverse().map((followUp, index) => (
                            <div
                                key={index}
                                className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-white font-medium capitalize">
                                        {followUp.method.replace('_', ' ')}
                                    </span>
                                    <span className="text-white/40 text-xs">
                                        {format(new Date(followUp.date), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <p className="text-white/60 capitalize">
                                    {followUp.outcome.replace(/_/g, ' ')}
                                </p>
                                {followUp.notes && (
                                    <p className="text-white/40 text-xs mt-1">{followUp.notes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                    {onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="liquid-btn size-2 liquid-red flex items-center gap-2"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="liquid-btn size-2 liquid-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="liquid-btn size-3 liquid-cyan"
                    >
                        {saving ? 'Saving...' : lead ? 'Update Lead' : 'Add Lead'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <BottomSheet
                isOpen={isOpen}
                onClose={onClose}
                title={lead ? 'Edit Lead' : 'New Lead'}
                size="lg"
            >
                <div className="p-6">
                    {modalContent}
                </div>
            </BottomSheet>
        );
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto liquid-card animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">
                        {lead ? 'Edit Lead' : 'New Lead'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition"
                    >
                        <XMarkIcon className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {modalContent}
            </div>
        </div>
    );
};
