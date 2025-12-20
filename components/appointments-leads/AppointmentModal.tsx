import React, { useState, useEffect, useCallback, useContext } from 'react';
import { XMarkIcon, TrashIcon, ArchiveBoxIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import type { CalendarAppointment, AppointmentStatus } from '../../types';
import { VehicleSearchDropdown } from './VehicleSearchDropdown';
import { ModelInterestInput } from './ModelInterestInput';
import { useDuplicateDetection, useLeadSourceSuggestions } from '../../hooks/useAppointmentsLeads';
import { DataContext } from '../../App';
import { BottomSheet } from '../ui/BottomSheet';
import { useDeviceType } from '../../hooks/useDeviceType';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<CalendarAppointment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    onDelete?: () => Promise<void>;
    onArchive?: () => void;
    appointment: CalendarAppointment | null;
    initialDate: Date | null;
    currentUserId: string;
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string; color: string }[] = [
    { value: 'scheduled', label: 'Scheduled', color: 'liquid-blue' },
    { value: 'confirmed', label: 'Confirmed', color: 'liquid-green' },
    { value: 'showed', label: 'Showed', color: 'liquid-emerald' },
    { value: 'sold', label: 'Sold', color: 'liquid-purple' },
    { value: 'no_show', label: 'No-Show', color: 'liquid-red' },
    { value: 'cancelled', label: 'Cancelled', color: 'liquid-white' },
];

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    onArchive,
    appointment,
    initialDate,
    currentUserId,
}) => {
    const { isMobile } = useDeviceType();
    const { checkDuplicate } = useDuplicateDetection();
    const { suggestions: leadSourceSuggestions } = useLeadSourceSuggestions();

    // Form state
    const [title, setTitle] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [leadSource, setLeadSource] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');
    const [downPaymentBudget, setDownPaymentBudget] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<AppointmentStatus>('scheduled');
    const [vehicleIds, setVehicleIds] = useState<string[]>([]);
    const [modelInterests, setModelInterests] = useState<string[]>([]);

    const [saving, setSaving] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
    const [showLeadSourceSuggestions, setShowLeadSourceSuggestions] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (appointment) {
                setTitle(appointment.title || '');
                setCustomerName(appointment.customer_name || '');
                setCustomerPhone(appointment.customer_phone || '');
                setLeadSource(appointment.lead_source || '');
                setAppointmentTime(formatDateTimeLocal(new Date(appointment.appointment_time)));
                setDownPaymentBudget(appointment.down_payment_budget?.toString() || '');
                setNotes(appointment.notes || '');
                setStatus(appointment.status);
                setVehicleIds(appointment.vehicle_ids || []);
                setModelInterests(appointment.model_interests || []);
            } else {
                setTitle('');
                setCustomerName('');
                setCustomerPhone('');
                setLeadSource('');
                setAppointmentTime(initialDate ? formatDateTimeLocal(initialDate) : formatDateTimeLocal(new Date()));
                setDownPaymentBudget('');
                setNotes('');
                setStatus('scheduled');
                setVehicleIds([]);
                setModelInterests([]);
            }
            setDuplicateWarning(null);
        }
    }, [isOpen, appointment, initialDate]);

    // Check for duplicates when phone changes
    useEffect(() => {
        const checkForDuplicate = async () => {
            if (customerPhone && customerPhone.length >= 10 && !appointment) {
                const result = await checkDuplicate(customerPhone);
                if (result.hasDuplicate) {
                    if (result.existingAppointment) {
                        setDuplicateWarning(`Customer with this phone has an existing appointment on ${format(new Date(result.existingAppointment.appointment_time), 'MMM d, yyyy')}`);
                    } else if (result.existingLead) {
                        setDuplicateWarning(`Customer with this phone exists in your leads`);
                    }
                } else {
                    setDuplicateWarning(null);
                }
            }
        };
        checkForDuplicate();
    }, [customerPhone, checkDuplicate, appointment]);

    const formatDateTimeLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

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
                title: title || null,
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                lead_source: leadSource || null,
                appointment_time: new Date(appointmentTime).toISOString(),
                down_payment_budget: downPaymentBudget ? parseFloat(downPaymentBudget) : null,
                notes: notes || null,
                status,
                vehicle_ids: vehicleIds.length > 0 ? vehicleIds : null,
                model_interests: modelInterests.length > 0 ? modelInterests : null,
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
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Title</label>
                <div className="liquid-input size-2">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Test Drive, Vehicle Viewing"
                    />
                </div>
            </div>

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

            {/* Date/Time and Budget Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Date & Time</label>
                    <div className="liquid-input size-2">
                        <input
                            type="datetime-local"
                            value={appointmentTime}
                            onChange={(e) => setAppointmentTime(e.target.value)}
                            className="[color-scheme:dark]"
                        />
                    </div>
                </div>
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
            </div>

            {/* Vehicle of Interest */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Vehicle of Interest</label>
                <VehicleSearchDropdown
                    selectedIds={vehicleIds}
                    onSelectionChange={setVehicleIds}
                />
            </div>

            {/* Model Interest */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                    Model Interest
                    <span className="text-white/40 font-normal ml-2">(when specific vehicle not in stock)</span>
                </label>
                <ModelInterestInput
                    models={modelInterests}
                    onChange={setModelInterests}
                />
            </div>

            {/* Status (only show when editing) */}
            {appointment && (
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Status</label>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`liquid-badge size-2 ${option.color} ${status === option.value ? 'ring-2 ring-white/50' : 'opacity-60'}`}
                                onClick={() => setStatus(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Notes</label>
                <div className="liquid-input" style={{ height: 'auto', padding: '12px' }}>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes about the appointment..."
                        rows={3}
                        className="w-full resize-none"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex gap-2">
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
                    {onArchive && appointment && (
                        <button
                            type="button"
                            onClick={onArchive}
                            className="liquid-btn size-2 liquid-yellow flex items-center gap-2"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            Archive to Leads
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
                        {saving ? 'Saving...' : appointment ? 'Update' : 'Create Appointment'}
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
                title={appointment ? 'Edit Appointment' : 'New Appointment'}
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
                        {appointment ? 'Edit Appointment' : 'New Appointment'}
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
