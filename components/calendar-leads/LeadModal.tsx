import React, { useState, useEffect, useContext, useMemo } from 'react';
import { XMarkIcon, TrashIcon, CalendarDaysIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/solid';
import type { Lead, LeadPriority, FollowUp, FollowUpMethod, FollowUpOutcome } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';
import { DataContext } from '../../App';

interface LeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Lead>) => Promise<void>;
    onDelete?: () => Promise<void>;
    onConvertToAppointment?: () => void;
    onAddFollowUp?: (followUp: Omit<FollowUp, 'id'>) => Promise<void>;
    initialData?: Partial<Lead>;
    leadSources: string[];
    duplicateWarning?: {
        exists: boolean;
        inAppointments: any[];
        inLeads: Lead[];
    } | null;
    onPhoneChange?: (phone: string) => void;
}

const PRIORITY_OPTIONS: { value: LeadPriority; label: string; color: string }[] = [
    { value: 'hot', label: 'Hot', color: 'priority-hot' },
    { value: 'warm', label: 'Warm', color: 'priority-warm' },
    { value: 'cold', label: 'Cold', color: 'priority-cold' },
];

const FOLLOW_UP_METHODS: { value: FollowUpMethod; label: string }[] = [
    { value: 'call', label: 'Call' },
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'in_person', label: 'In Person' },
];

const FOLLOW_UP_OUTCOMES: { value: FollowUpOutcome; label: string }[] = [
    { value: 'no_answer', label: 'No Answer' },
    { value: 'spoke_not_ready', label: 'Spoke - Not Ready' },
    { value: 'spoke_interested', label: 'Spoke - Interested' },
    { value: 'scheduled_appointment', label: 'Scheduled Appointment' },
];

const LeadModal: React.FC<LeadModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    onConvertToAppointment,
    onAddFollowUp,
    initialData,
    leadSources,
    duplicateWarning,
    onPhoneChange,
}) => {
    const dataContext = useContext(DataContext);
    const inventory = dataContext?.inventory || [];
    const sales = dataContext?.sales || [];
    
    // Get unique models from all vehicles (inventory + sales)
    const uniqueModels = useMemo(() => {
        const models = new Set<string>();
        // Add models from current inventory (excluding sold)
        inventory.filter(v => v.status !== 'Sold').forEach(v => {
            if (v.model && v.model.trim()) {
                models.add(v.model.trim());
            }
        });
        // Add models from sales (historical)
        sales.forEach(s => {
            if (s.model && s.model.trim()) {
                models.add(s.model.trim());
            }
        });
        return Array.from(models).sort();
    }, [inventory, sales]);
    
    const [formData, setFormData] = useState<Partial<Lead>>({
        customer_name: '',
        customer_phone: '',
        lead_source: '',
        down_payment_budget: null,
        notes: '',
        model_interests: [],
        potential_date: null,
        priority: 'warm',
    });

    const [modelInput, setModelInput] = useState('');
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const [showFollowUpForm, setShowFollowUpForm] = useState(false);
    const [followUpData, setFollowUpData] = useState<Omit<FollowUp, 'id'>>({
        date: new Date().toISOString(),
        method: 'call',
        outcome: 'no_answer',
        notes: null,
    });
    const [saving, setSaving] = useState(false);

    const isEditing = Boolean(initialData?.id);

    // Initialize form with initial data
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                customer_name: initialData.customer_name || '',
                customer_phone: initialData.customer_phone || '',
                lead_source: initialData.lead_source || '',
                down_payment_budget: initialData.down_payment_budget || null,
                notes: initialData.notes || '',
                model_interests: initialData.model_interests || [],
                potential_date: initialData.potential_date || null,
                priority: initialData.priority || 'warm',
            });
        } else if (isOpen) {
            setFormData({
                customer_name: '',
                customer_phone: '',
                lead_source: '',
                down_payment_budget: null,
                notes: '',
                model_interests: [],
                potential_date: null,
                priority: 'warm',
            });
        }
        setShowFollowUpForm(false);
    }, [isOpen, initialData]);

    // Format phone number as user types
    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    // Format currency
    const formatCurrency = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (!numbers) return '';
        return Number(numbers).toLocaleString('en-US');
    };

    // Handle input change
    const handleChange = (field: keyof Lead, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (field === 'customer_phone' && onPhoneChange) {
            onPhoneChange(value);
        }
    };

    // Filter models for dropdown based on input
    const filteredModels = useMemo(() => {
        if (!modelInput.trim()) return uniqueModels.slice(0, 20);
        const search = modelInput.toLowerCase();
        return uniqueModels.filter(m => m.toLowerCase().includes(search)).slice(0, 20);
    }, [uniqueModels, modelInput]);
    
    // Add model interest tag
    const addModelInterest = () => {
        const trimmed = modelInput.trim();
        if (!trimmed) return;
        const interests = formData.model_interests || [];
        if (!interests.includes(trimmed)) {
            handleChange('model_interests', [...interests, trimmed]);
        }
        setModelInput('');
        setShowModelDropdown(false);
    };

    // Remove model interest tag
    const removeModelInterest = (model: string) => {
        const interests = formData.model_interests || [];
        handleChange('model_interests', interests.filter(m => m !== model));
    };

    // Handle follow-up submit
    const handleAddFollowUp = async () => {
        if (!onAddFollowUp) return;
        await onAddFollowUp(followUpData);
        setShowFollowUpForm(false);
        setFollowUpData({
            date: new Date().toISOString(),
            method: 'call',
            outcome: 'no_answer',
            notes: null,
        });
    };

    // Handle save
    const handleSave = async () => {
        if (!formData.customer_name?.trim()) {
            alert('Customer name is required');
            return;
        }

        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            console.error('Error saving lead:', err);
            alert('Failed to save lead');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', margin: 0, padding: '1rem' }}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto liquid-card">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <UserGroupIcon className="h-6 w-6 text-cyan-400" />
                        <h2 className="text-xl font-bold text-white">
                            {isEditing ? 'Edit Lead' : 'New Lead'}
                        </h2>
                        {initialData?.was_appointment && (
                            <span className="was-appointment-badge">
                                <CalendarDaysIcon className="h-3 w-3" />
                                Was Appointment
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                        <XMarkIcon className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Original Appointment Info */}
                {initialData?.was_appointment && initialData?.original_appointment_date && (
                    <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <p className="text-sm text-amber-300">
                            Original appointment was on{' '}
                            <span className="font-medium time-display">
                                {format(new Date(initialData.original_appointment_date), 'MMM d, yyyy h:mm a')}
                            </span>
                        </p>
                    </div>
                )}

                {/* Form */}
                <div className="space-y-5">
                    {/* Customer Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Customer Name <span className="text-red-400">*</span>
                        </label>
                        <div className="liquid-input size-2">
                            <input
                                type="text"
                                value={formData.customer_name || ''}
                                onChange={(e) => handleChange('customer_name', e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Phone Number
                        </label>
                        <div className="liquid-input size-2">
                            <input
                                type="tel"
                                value={formData.customer_phone || ''}
                                onChange={(e) => handleChange('customer_phone', formatPhoneNumber(e.target.value))}
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        {duplicateWarning?.exists && (
                            <div className="duplicate-warning mt-2">
                                <p className="font-medium">Customer already exists:</p>
                                {duplicateWarning.inAppointments.length > 0 && (
                                    <p className="text-sm mt-1">
                                        {duplicateWarning.inAppointments.length} appointment(s) found
                                    </p>
                                )}
                                {duplicateWarning.inLeads.length > 0 && (
                                    <p className="text-sm mt-1">
                                        {duplicateWarning.inLeads.length} lead(s) found
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Lead Source */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Source of Lead
                        </label>
                        <div className="liquid-input size-2">
                            <input
                                type="text"
                                value={formData.lead_source || ''}
                                onChange={(e) => handleChange('lead_source', e.target.value)}
                                onFocus={() => setShowSourceDropdown(true)}
                                onBlur={() => setTimeout(() => setShowSourceDropdown(false), 200)}
                                placeholder="e.g., Facebook, Walk-in"
                            />
                        </div>
                        {showSourceDropdown && leadSources.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 shadow-lg max-h-48 overflow-y-auto">
                                {leadSources.map(source => (
                                    <button
                                        key={source}
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-cyan-500/10 transition"
                                        onMouseDown={() => handleChange('lead_source', source)}
                                    >
                                        {source}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Down Payment Budget */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Down Payment Budget
                        </label>
                        <div className="liquid-input size-2">
                            <span className="text-slate-400 mr-1">$</span>
                            <input
                                type="text"
                                value={formData.down_payment_budget ? formatCurrency(String(formData.down_payment_budget)) : ''}
                                onChange={(e) => {
                                    const numbers = e.target.value.replace(/\D/g, '');
                                    handleChange('down_payment_budget', numbers ? Number(numbers) : null);
                                }}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Model Interest */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Model Interest
                        </label>

                        {/* Tags */}
                        {(formData.model_interests || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.model_interests?.map(model => (
                                    <span
                                        key={model}
                                        className="model-tag removable"
                                        onClick={() => removeModelInterest(model)}
                                    >
                                        {model}
                                        <XMarkIcon className="h-3 w-3" />
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <div className="liquid-input size-2 flex-1 relative">
                                <input
                                    type="text"
                                    value={modelInput}
                                    onChange={(e) => setModelInput(e.target.value)}
                                    onFocus={() => setShowModelDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addModelInterest();
                                        }
                                    }}
                                    placeholder="e.g., Chrysler 300, Camaro"
                                />
                                {showModelDropdown && filteredModels.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 shadow-lg max-h-64 overflow-y-auto top-full">
                                        {filteredModels.map(model => (
                                            <button
                                                key={model}
                                                type="button"
                                                className="w-full px-3 py-2 text-left hover:bg-cyan-500/10 transition"
                                                onMouseDown={() => {
                                                    setModelInput(model);
                                                    addModelInterest();
                                                    setShowModelDropdown(false);
                                                }}
                                            >
                                                {model}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={addModelInterest}
                                className="liquid-btn size-2 liquid-cyan"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Potential Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Potential Timeframe <span className="text-slate-500">(when might they be ready)</span>
                        </label>
                        <div className="liquid-input size-2">
                            <input
                                type="date"
                                value={formData.potential_date || ''}
                                onChange={(e) => handleChange('potential_date', e.target.value || null)}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Priority
                        </label>
                        <div className="flex gap-2">
                            {PRIORITY_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleChange('priority', option.value)}
                                    className={`liquid-badge size-3 ${option.color} ${
                                        formData.priority === option.value ? 'active' : ''
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Notes
                        </label>
                        <div className="liquid-input" style={{ height: 'auto', padding: '12px' }}>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Additional notes..."
                                rows={3}
                                className="w-full resize-none"
                            />
                        </div>
                    </div>

                    {/* Follow-up History (only when editing) */}
                    {isEditing && initialData?.follow_ups && initialData.follow_ups.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Follow-up History
                            </label>
                            <div className="space-y-2">
                                {initialData.follow_ups.map((followUp, idx) => (
                                    <div
                                        key={followUp.id || idx}
                                        className="p-3 rounded-lg bg-white/5 border border-white/10"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium capitalize">
                                                {followUp.method.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-slate-400 time-display">
                                                {format(new Date(followUp.date), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 capitalize">
                                            {followUp.outcome.replace(/_/g, ' ')}
                                        </p>
                                        {followUp.notes && (
                                            <p className="text-sm text-slate-400 mt-1">{followUp.notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Follow-up (only when editing) */}
                    {isEditing && onAddFollowUp && (
                        <div>
                            {!showFollowUpForm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowFollowUpForm(true)}
                                    className="liquid-btn size-2 liquid-cyan w-full flex items-center justify-center gap-2"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Log Follow-up
                                </button>
                            ) : (
                                <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/30 space-y-4">
                                    <h4 className="font-medium text-white">Log Follow-up</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Method</label>
                                            <select
                                                value={followUpData.method}
                                                onChange={(e) => setFollowUpData(prev => ({ ...prev, method: e.target.value as FollowUpMethod }))}
                                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-cyan-500/30 text-white"
                                            >
                                                {FOLLOW_UP_METHODS.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Outcome</label>
                                            <select
                                                value={followUpData.outcome}
                                                onChange={(e) => setFollowUpData(prev => ({ ...prev, outcome: e.target.value as FollowUpOutcome }))}
                                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-cyan-500/30 text-white"
                                            >
                                                {FOLLOW_UP_OUTCOMES.map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Notes</label>
                                        <div className="liquid-input size-2">
                                            <input
                                                type="text"
                                                value={followUpData.notes || ''}
                                                onChange={(e) => setFollowUpData(prev => ({ ...prev, notes: e.target.value || null }))}
                                                placeholder="Optional notes..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowFollowUpForm(false)}
                                            className="liquid-btn size-1 liquid-white flex-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAddFollowUp}
                                            className="liquid-btn size-1 liquid-cyan flex-1"
                                        >
                                            Save Follow-up
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                    <div className="flex gap-2">
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="liquid-btn size-2 liquid-red flex items-center gap-2"
                            >
                                <TrashIcon className="h-4 w-4" />
                                Delete
                            </button>
                        )}
                        {isEditing && onConvertToAppointment && (
                            <button
                                type="button"
                                onClick={onConvertToAppointment}
                                className="liquid-btn size-2 liquid-amber flex items-center gap-2"
                            >
                                <CalendarDaysIcon className="h-4 w-4" />
                                Schedule Appointment
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
                            className="liquid-btn size-2 liquid-cyan"
                        >
                            {saving ? 'Saving...' : isEditing ? 'Update Lead' : 'Create Lead'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadModal;
