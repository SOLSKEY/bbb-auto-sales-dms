import React, { useState, useEffect, useContext, useMemo } from 'react';
import { XMarkIcon, TrashIcon, ArchiveBoxIcon, CheckIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';
import type { Appointment, AppointmentStatus, Vehicle } from '../../types';
import { DataContext } from '../../App';
import { format } from 'date-fns';

// CST timezone utilities
const CST_TIMEZONE = 'America/Chicago';

// Convert a date to CST date string for datetime-local input
const formatDateForCSTInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Get date components in CST using Intl.DateTimeFormat for more reliable formatting
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const hours = parts.find(p => p.type === 'hour')?.value || '00';
    const minutes = parts.find(p => p.type === 'minute')?.value || '00';
    
    return `${year}-${month}-${day}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// Convert datetime-local input value to CST ISO string
const parseCSTInputToISO = (inputValue: string): string => {
    if (!inputValue) return '';
    // Parse the datetime-local value as if it's in CST
    const [datePart, timePart] = inputValue.split('T');
    if (!datePart || !timePart) return '';
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create a date string that we'll interpret as CST
    // Use Intl.DateTimeFormat to properly handle timezone conversion
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    
    // Create date assuming it's in CST, then convert to UTC
    // We'll create a date object and use toLocaleString to convert
    const tempDate = new Date(dateStr);
    // Get the UTC equivalent of this CST time
    // Calculate offset: CST is UTC-6, CDT is UTC-5
    const jan = new Date(tempDate.getFullYear(), 0, 1);
    const jul = new Date(tempDate.getFullYear(), 6, 1);
    const isDST = tempDate.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    const cstOffsetHours = isDST ? 5 : 6; // CDT is UTC-5, CST is UTC-6
    
    // Adjust the date by adding the offset
    const utcDate = new Date(tempDate.getTime() + (cstOffsetHours * 60 * 60 * 1000));
    return utcDate.toISOString();
};

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Appointment>) => Promise<void>;
    onDelete?: () => Promise<void>;
    onArchive?: () => void;
    initialData?: Partial<Appointment>;
    leadSources: string[];
    duplicateWarning?: {
        exists: boolean;
        inAppointments: Appointment[];
        inLeads: any[];
    } | null;
    onPhoneChange?: (phone: string) => void;
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string; color: string }[] = [
    { value: 'scheduled', label: 'Scheduled', color: 'status-scheduled' },
    { value: 'confirmed', label: 'Confirmed', color: 'status-confirmed' },
    { value: 'showed', label: 'Showed', color: 'status-showed' },
    { value: 'sold', label: 'Sold', color: 'status-sold' },
    { value: 'no_show', label: 'No Show', color: 'status-no-show' },
    { value: 'cancelled', label: 'Cancelled', color: 'status-cancelled' },
];

const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    onArchive,
    initialData,
    leadSources,
    duplicateWarning,
    onPhoneChange,
}) => {
    const dataContext = useContext(DataContext);
    const inventory = dataContext?.inventory || [];
    const sales = dataContext?.sales || [];
    
    // Filter out sold vehicles
    const availableInventory = inventory.filter(v => v.status !== 'Sold');
    
    // Get unique models from all vehicles (inventory + sales)
    const uniqueModels = useMemo(() => {
        const models = new Set<string>();
        // Add models from current inventory
        availableInventory.forEach(v => {
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
    }, [availableInventory, sales]);

    const [formData, setFormData] = useState<Partial<Appointment>>({
        title: '',
        customer_name: '',
        customer_phone: '',
        lead_source: '',
        appointment_time: '',
        down_payment_budget: null,
        notes: '',
        status: 'scheduled',
        vehicle_ids: [],
        model_interests: [],
    });

    const [modelInput, setModelInput] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dateTimeInputValue, setDateTimeInputValue] = useState('');

    const isEditing = Boolean(initialData?.id);

    // Initialize form with initial data
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                title: initialData.title || '',
                customer_name: initialData.customer_name || '',
                customer_phone: initialData.customer_phone || '',
                lead_source: initialData.lead_source || '',
                appointment_time: initialData.appointment_time || '',
                down_payment_budget: initialData.down_payment_budget || null,
                notes: initialData.notes || '',
                status: initialData.status || 'scheduled',
                vehicle_ids: initialData.vehicle_ids || [],
                model_interests: initialData.model_interests || [],
            });
            // Set the datetime input value for display
            if (initialData.appointment_time) {
                setDateTimeInputValue(formatDateForInput(initialData.appointment_time));
            } else {
                setDateTimeInputValue('');
            }
        } else if (isOpen) {
            // Reset form for new appointment
            setFormData({
                title: '',
                customer_name: '',
                customer_phone: '',
                lead_source: '',
                appointment_time: '',
                down_payment_budget: null,
                notes: '',
                status: 'scheduled',
                vehicle_ids: [],
                model_interests: [],
            });
            // Set current date/time as default
            const now = new Date();
            const defaultDateTime = formatDateForCSTInput(now.toISOString());
            setDateTimeInputValue(defaultDateTime);
        }
    }, [isOpen, initialData]);

    // Format date for datetime-local input (using CST)
    const formatDateForInput = (dateStr: string) => {
        return formatDateForCSTInput(dateStr);
    };

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

    // Filter vehicles for dropdown (only non-sold vehicles)
    const filteredVehicles = useMemo(() => {
        if (!vehicleSearch.trim()) return availableInventory.slice(0, 10);

        const search = vehicleSearch.toLowerCase();
        return availableInventory.filter(v => {
            const searchStr = `${v.year} ${v.make} ${v.model} ${v.vin} ${v.vinLast4} ${v.exterior}`.toLowerCase();
            return searchStr.includes(search);
        }).slice(0, 10);
    }, [availableInventory, vehicleSearch]);
    
    // Filter models for dropdown based on input
    const filteredModels = useMemo(() => {
        if (!modelInput.trim()) return uniqueModels.slice(0, 20);
        const search = modelInput.toLowerCase();
        return uniqueModels.filter(m => m.toLowerCase().includes(search)).slice(0, 20);
    }, [uniqueModels, modelInput]);

    // Get selected vehicles info
    const selectedVehicles = useMemo(() => {
        return (formData.vehicle_ids || [])
            .map(id => availableInventory.find(v => v.vehicleId === id || String(v.id) === id))
            .filter(Boolean) as Vehicle[];
    }, [formData.vehicle_ids, availableInventory]);

    // Handle input change
    const handleChange = (field: keyof Appointment, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (field === 'customer_phone' && onPhoneChange) {
            onPhoneChange(value);
        }
    };

    // Add model interest tag
    const addModelInterest = () => {
        if (!modelInput.trim()) return;
        const interests = formData.model_interests || [];
        if (!interests.includes(modelInput.trim())) {
            handleChange('model_interests', [...interests, modelInput.trim()]);
        }
        setModelInput('');
    };

    // Remove model interest tag
    const removeModelInterest = (model: string) => {
        const interests = formData.model_interests || [];
        handleChange('model_interests', interests.filter(m => m !== model));
    };

    // Add vehicle to selection
    const addVehicle = (vehicle: Vehicle) => {
        const ids = formData.vehicle_ids || [];
        const vehicleId = vehicle.vehicleId || String(vehicle.id);
        if (!ids.includes(vehicleId)) {
            handleChange('vehicle_ids', [...ids, vehicleId]);
        }
        setVehicleSearch('');
        setShowVehicleDropdown(false);
    };

    // Remove vehicle from selection
    const removeVehicle = (vehicleId: string) => {
        const ids = formData.vehicle_ids || [];
        handleChange('vehicle_ids', ids.filter(id => id !== vehicleId));
    };

    // Handle save
    const handleSave = async () => {
        if (!formData.customer_name?.trim()) {
            alert('Customer name is required');
            return;
        }
        if (!formData.appointment_time) {
            alert('Appointment date/time is required');
            return;
        }

        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            console.error('Error saving appointment:', err);
            alert('Failed to save appointment');
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
                        <CalendarDaysIcon className="h-6 w-6 text-amber-400" />
                        <h2 className="text-xl font-bold text-white">
                            {isEditing ? 'Edit Appointment' : 'New Appointment'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                        <XMarkIcon className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-5">
                    {/* Title (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Title <span className="text-slate-500">(optional)</span>
                        </label>
                        <div className="liquid-input size-2">
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="e.g., Test drive, Follow-up"
                            />
                        </div>
                    </div>

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

                    {/* Date & Time */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Date & Time <span className="text-red-400">*</span>
                        </label>
                        <div className="liquid-input size-2">
                            <input
                                type="datetime-local"
                                value={dateTimeInputValue}
                                onChange={(e) => {
                                    const rawValue = e.target.value;
                                    setDateTimeInputValue(rawValue);
                                    // Only update formData if the value is valid
                                    if (rawValue) {
                                        try {
                                            const isoValue = parseCSTInputToISO(rawValue);
                                            handleChange('appointment_time', isoValue);
                                        } catch (err) {
                                            // If parsing fails, still update the input value
                                            // but don't update formData yet
                                            console.warn('Failed to parse datetime:', err);
                                        }
                                    } else {
                                        handleChange('appointment_time', '');
                                    }
                                }}
                                className="w-full"
                            />
                        </div>
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

                    {/* Vehicle of Interest */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Vehicle of Interest
                        </label>

                        {/* Selected vehicles */}
                        {selectedVehicles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedVehicles.map(v => (
                                    <span
                                        key={v.vehicleId || v.id}
                                        className="model-tag removable"
                                        onClick={() => removeVehicle(v.vehicleId || String(v.id))}
                                    >
                                        {v.year} {v.make} {v.model}
                                        <XMarkIcon className="h-3 w-3" />
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="liquid-input size-2">
                            <input
                                type="text"
                                value={vehicleSearch}
                                onChange={(e) => setVehicleSearch(e.target.value)}
                                onFocus={() => setShowVehicleDropdown(true)}
                                onBlur={() => setTimeout(() => setShowVehicleDropdown(false), 200)}
                                placeholder="Search by year, make, model, VIN..."
                            />
                        </div>

                        {showVehicleDropdown && filteredVehicles.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 shadow-lg max-h-64 overflow-y-auto">
                                {filteredVehicles.map(v => {
                                    const images = v.images || [];
                                    const thumbnail = images.length > 0 ? images[0] : null;
                                    return (
                                        <button
                                            key={v.vehicleId || v.id}
                                            type="button"
                                            className="w-full px-3 py-2 text-left hover:bg-cyan-500/10 transition flex items-center gap-3"
                                            onMouseDown={() => addVehicle(v)}
                                        >
                                            {thumbnail && (
                                                <img
                                                    src={thumbnail}
                                                    alt={`${v.year} ${v.make} ${v.model}`}
                                                    className="w-12 h-12 object-cover rounded flex-shrink-0"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium">{v.year} {v.make} {v.model}</div>
                                                <div className="text-sm text-slate-400 truncate">
                                                    {v.exterior} | ${v.price?.toLocaleString()} | VIN: ...{v.vinLast4}
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                                                v.status === 'Available' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {v.status}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Model Interest */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Model Interest <span className="text-slate-500">(if no specific vehicle)</span>
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

                    {/* Status (only show when editing) */}
                    {isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Status
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleChange('status', option.value)}
                                        className={`liquid-badge size-2 ${option.color} ${
                                            formData.status === option.value ? 'active' : ''
                                        }`}
                                    >
                                        {formData.status === option.value && (
                                            <CheckIcon className="h-3 w-3 mr-1" />
                                        )}
                                        {option.label}
                                    </button>
                                ))}
                            </div>
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
                        {isEditing && onArchive && (
                            <button
                                type="button"
                                onClick={onArchive}
                                className="liquid-btn size-2 liquid-amber flex items-center gap-2"
                            >
                                <ArchiveBoxIcon className="h-4 w-4" />
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
                            className="liquid-btn size-2 liquid-cyan"
                        >
                            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create Appointment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentModal;
