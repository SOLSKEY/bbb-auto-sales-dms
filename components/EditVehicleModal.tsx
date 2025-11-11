import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../types';
import { XMarkIcon, ArrowUpCircleIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { decodeVin } from '../services/vinDecoderService';
import AppSelect from './AppSelect';
import { INVENTORY_STATUS_VALUES } from '../constants';
import { supabase } from '../supabaseClient';
import { GlassButton } from '@/components/ui/glass-button';

const CAPITALIZED_FIELDS: Array<keyof Vehicle> = [
    'make',
    'model',
    'interior',
    'exterior',
    'upholstery',
    'bodyStyle',
];

const CAPITALIZED_FIELD_SET = new Set<keyof Vehicle>(CAPITALIZED_FIELDS);

const capitalizeDisplayValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const normalizeVehicleDisplayFields = <T extends Partial<Vehicle>>(vehicle: T, statusNormalizer?: (value?: string) => string): T => {
    const next = { ...vehicle };
    CAPITALIZED_FIELDS.forEach(field => {
        const raw = (next as any)[field];
        if (typeof raw === 'string' && raw.trim().length > 0) {
            (next as any)[field] = capitalizeDisplayValue(raw);
        }
    });
    if (statusNormalizer) {
        const normalizedStatus = statusNormalizer((next as any).status);
        if (normalizedStatus) {
            (next as any).status = normalizedStatus;
        }
    }
    return next;
};


interface EditVehicleModalProps {
    vehicle: Vehicle;
    onClose: () => void;
    onSave: (vehicle: Vehicle) => void;
    isNewVehicle?: boolean;
    onImagesUpdated?: (vehicleId: number, urls: string[]) => void;
}

const EditVehicleModal: React.FC<EditVehicleModalProps> = ({ vehicle, onClose, onSave, isNewVehicle = false, onImagesUpdated }) => {
    const statusCanonicalMap = useMemo(() => {
        const map = new Map<string, string>();
        INVENTORY_STATUS_VALUES.forEach(status => {
            map.set(status.toLowerCase(), status);
        });
        return map;
    }, []);

    const normalizeStatus = (value?: string) => {
        if (!value) return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        return statusCanonicalMap.get(trimmed.toLowerCase()) ?? trimmed;
    };

    const [editedVehicle, setEditedVehicle] = useState<Vehicle>(() =>
        normalizeVehicleDisplayFields({ ...vehicle }, normalizeStatus),
    );
    const [imagePreviews, setImagePreviews] = useState<string[]>(vehicle.images || []);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [isDecoding, setIsDecoding] = useState(false);
    const [vinError, setVinError] = useState<string | null>(null);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [isResolvingId, setIsResolvingId] = useState(false);

    const deriveVinLast4 = (vin?: string) => {
        if (!vin) return '';
        const cleaned = vin.replace(/\s+/g, '').toUpperCase();
        return cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;
    };

    const computeVehicleIdValue = (
        vin?: string,
        yearInput?: unknown,
        model?: string,
        vinLast4Input?: string,
    ) => {
        const modelName = model ? model.trim() : '';
        const yearDigits =
            yearInput !== undefined && yearInput !== null
                ? String(yearInput).replace(/\D/g, '').slice(-2)
                : '';
        const vin4 =
            vinLast4Input && vinLast4Input.trim().length === 4
                ? vinLast4Input.trim().toUpperCase()
                : deriveVinLast4(vin);

        if (yearDigits.length === 0 || modelName.length === 0 || vin4.length < 4) {
            return '';
        }

        return `${yearDigits.padStart(2, '0')} ${modelName} ${vin4}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, type } = e.target;
        let value = e.target.value;

        setEditedVehicle(prev => {
            const next = { ...prev } as Vehicle;

            if (name === 'vinLast4') {
                const digitsOnly = value.replace(/\D/g, '').slice(0, 4).toUpperCase();
                next.vinLast4 = digitsOnly;
                const autoId = computeVehicleIdValue(next.vin, next.year, next.model, digitsOnly);
                if (autoId) next.vehicleId = autoId;
                return next;
            }

            if (name === 'vehicleId') {
                next.vehicleId = value;
                return next;
            }

            if (type === 'number') {
                value = value.replace(/[^\d.-]/g, '');
            }

            (next as any)[name] = value;

            if (name === 'vin') {
                setVinError(null);
                const derived = deriveVinLast4(value);
                next.vinLast4 = derived;
            }

            if (name === 'vin' || name === 'year' || name === 'model') {
                const autoId = computeVehicleIdValue(next.vin, next.year, next.model, next.vinLast4);
                if (autoId) {
                    next.vehicleId = autoId;
                }
            }

            return next;
        });
    };

    useEffect(() => {
        let cancelled = false;

        setEditedVehicle(normalizeVehicleDisplayFields({ ...vehicle }, normalizeStatus));
        setImagePreviews(vehicle.images || []);

        const resolveVehicleId = async () => {
            if ((vehicle.id && vehicle.id !== undefined) || vehicle.vehicleId || !vehicle.vin) return;
            try {
                setIsResolvingId(true);
                const { data, error } = await supabase
                    .from('Inventory')
                    .select('id, "Vehicle ID"')
                    .eq('VIN', vehicle.vin)
                    .maybeSingle();
                if (!cancelled) {
                    if (!error && data) {
                        setEditedVehicle(prev => ({
                            ...prev,
                            id: data.id ?? prev.id,
                            vehicleId: data['Vehicle ID'] ?? prev.vehicleId,
                        }));
                    } else if (error) {
                        console.error('Unable to resolve inventory id:', error);
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Unexpected error resolving inventory id:', error);
                }
            } finally {
                if (!cancelled) {
                    setIsResolvingId(false);
                }
            }
        };

        resolveVehicleId();

        return () => {
            cancelled = true;
        };
    }, [vehicle]);

    const getInventoryIdentifier = () => {
        return editedVehicle.id ?? editedVehicle.vehicleId ?? editedVehicle.vin ?? '';
    };

    const persistImageList = async (urls: string[]) => {
        const identifier = getInventoryIdentifier();
        if (!identifier) return false;

        if (editedVehicle.id === undefined && (!editedVehicle.vehicleId || String(editedVehicle.vehicleId).trim().length === 0)) {
            return true;
        }

        let query = supabase.from('Inventory').update({ image_urls: urls });

        if (editedVehicle.id !== undefined) {
            query = query.eq('id', editedVehicle.id);
        } else if (editedVehicle.vehicleId && String(editedVehicle.vehicleId).trim().length > 0) {
            query = query.eq('"Vehicle ID"', String(editedVehicle.vehicleId).trim());
        } else if (editedVehicle.vin) {
            query = query.eq('VIN', editedVehicle.vin);
        }

        const { error } = await query;

        if (error) {
            console.error('Error updating image URLs:', error);
            alert('Failed to update images. Please try again.');
            return false;
        }

        if (editedVehicle.id != null) {
            onImagesUpdated?.(editedVehicle.id, urls);
        }
        return true;
    };

    const handleVinDecode = async () => {
        if (editedVehicle.vin.length !== 17 || isDecoding) {
            if(editedVehicle.vin.length > 0) setVinError('VIN must be 17 characters.');
            return;
        }
        setIsDecoding(true);
        setVinError(null);
        try {
            const decodedData = await decodeVin(editedVehicle.vin);
            setEditedVehicle(prev => {
                const next = {
                    ...prev,
                    ...decodedData,
                } as Vehicle;
                const derived = deriveVinLast4(next.vin);
                if (derived) {
                    next.vinLast4 = derived;
                }
                const autoId = computeVehicleIdValue(next.vin, next.year, next.model, next.vinLast4);
                if (autoId) {
                    next.vehicleId = autoId;
                }
                return normalizeVehicleDisplayFields(next);
            });
        } catch (error) {
            if (error instanceof Error) {
                setVinError(error.message);
            } else {
                setVinError('An unknown error occurred.');
            }
        } finally {
            setIsDecoding(false);
        }
    };

    const handleFieldBlur = (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        if (!name || !CAPITALIZED_FIELD_SET.has(name as keyof Vehicle)) return;
        const normalized = capitalizeDisplayValue(value);
        if (normalized === value) return;
        setEditedVehicle(prev => {
            const currentValue = (prev as any)[name];
            if (currentValue === normalized) return prev;
            const next = { ...prev } as Vehicle;
            (next as any)[name] = normalized;
            return next;
        });
    };


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (!files.length) return;

        const identifier = getInventoryIdentifier();
        if (!identifier) {
            alert(isResolvingId ? 'We are still linking this vehicle record. Please try again in a moment.' : 'Please save this vehicle before uploading images.');
            e.target.value = '';
            return;
        }

        setIsUploadingImages(true);
        try {
            const updatedImages = [...(editedVehicle.images ?? [])];
            let hasNewImages = false;

            for (const file of files) {
                const timestamp = Date.now();
                const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storagePath = `inventory-images/${identifier}/${timestamp}-${sanitized}`;

                const { error: uploadError } = await supabase.storage
                    .from('inventory-images')
                    .upload(storagePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Error uploading image:', uploadError);
                    alert(`Failed to upload ${file.name}. Please try again.`);
                    continue;
                }

                const { data: publicData } = supabase.storage
                    .from('inventory-images')
                    .getPublicUrl(storagePath);

                const publicUrl = publicData?.publicUrl;
                if (publicUrl) {
                    updatedImages.push(publicUrl);
                    hasNewImages = true;
                }
            }

            if (hasNewImages) {
                const success = await persistImageList(updatedImages);
                if (success) {
                    setImagePreviews(updatedImages);
                    setEditedVehicle(prev => ({ ...prev, images: updatedImages }));
                }
            }
        } catch (error) {
            console.error('Unexpected error uploading images:', error);
            alert('An unexpected error occurred while uploading images. Please try again.');
        } finally {
            setIsUploadingImages(false);
            e.target.value = '';
        }
    };
    
    const handleRemoveImage = async (index: number) => {
        const nextImages = imagePreviews.filter((_, i) => i !== index);

        if (editedVehicle.id) {
            const success = await persistImageList(nextImages);
            if (!success) {
                return;
            }
        }

        setImagePreviews(nextImages);
        setEditedVehicle(prev => ({ ...prev, images: nextImages }));
    };

    const handleDrop = async (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const reorderedImages = [...imagePreviews];
        const [draggedItem] = reorderedImages.splice(draggedIndex, 1);
        reorderedImages.splice(targetIndex, 0, draggedItem);
        setDraggedIndex(null);

        if (editedVehicle.id) {
            const success = await persistImageList(reorderedImages);
            if (!success) {
                return;
            }
        }

        setImagePreviews(reorderedImages);
        setEditedVehicle(prev => ({ ...prev, images: reorderedImages }));
    };

    const handleSave = () => {
        const normalizedVehicle = normalizeVehicleDisplayFields(
            { ...editedVehicle, status: normalizeStatus(editedVehicle.status) },
            normalizeStatus,
        );
        setEditedVehicle(normalizedVehicle);
        const trimmedVehicleId = normalizedVehicle.vehicleId ? normalizedVehicle.vehicleId.trim() : '';
        const trimmedVinLast4 = normalizedVehicle.vinLast4 ? normalizedVehicle.vinLast4.trim().toUpperCase() : '';
        onSave({
            ...normalizedVehicle,
            vehicleId: trimmedVehicleId,
            vinLast4: trimmedVinLast4,
            images: imagePreviews,
        });
    };

    const vehicleStatusOptions = useMemo(() => {
        const base = INVENTORY_STATUS_VALUES.map(status => ({ value: status, label: status }));
        if (editedVehicle.status && !base.some(option => option.value === editedVehicle.status)) {
            base.push({ value: editedVehicle.status, label: editedVehicle.status });
        }
        return base;
    }, [editedVehicle.status]);

    const inventoryIdentifier = getInventoryIdentifier();

    const uploadDisabled = isUploadingImages || isResolvingId || !inventoryIdentifier;
    const uploadButtonText = isUploadingImages ? 'Uploading…' : isResolvingId ? 'Preparing…' : 'Upload Images';

    const inputFields = [
        { name: 'arrivalDate', label: 'Arrival Date', type: 'date' },
        { name: 'year', label: 'Year', type: 'number' }, { name: 'make', label: 'Make' },
        { name: 'model', label: 'Model' }, { name: 'trim', label: 'Trim' },
        { name: 'exterior', label: 'Exterior Color' }, { name: 'interior', label: 'Interior Color' },
        { name: 'upholstery', label: 'Upholstery' }, { name: 'bodyStyle', label: 'Body Style' },
        { name: 'driveTrain', label: 'Drivetrain' }, { name: 'mileage', label: 'Mileage', type: 'number' },
        { name: 'transmission', label: 'Transmission' }, { name: 'fuelType', label: 'Fuel Type' },
        { name: 'engine', label: 'Engine' },
        { name: 'vinLast4', label: 'VIN Last 4', type: 'text', placeholder: 'Auto-filled from VIN', maxLength: 4 },
        { name: 'vehicleId', label: 'Vehicle ID', type: 'text', placeholder: 'Auto-generated (e.g., 19 Maxima 2636)' },
        { name: 'price', label: 'Price', type: 'number' },
        { name: 'downPayment', label: 'Down Payment', type: 'number' },
    ];


    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-[#1a1d21] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border-high">
                <div className="flex justify-between items-center p-4 border-b border-border-low">
                     <h3 className="text-2xl font-bold text-primary font-orbitron tracking-tight-lg">{isNewVehicle ? 'Add New Vehicle' : 'Edit Vehicle'}</h3>
                     <GlassButton size="icon" onClick={onClose}><XMarkIcon className="h-6 w-6" /></GlassButton>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                     {/* VIN Section */}
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">VIN</label>
                        <div className="flex items-center gap-2">
                            <input
                                name="vin"
                                value={editedVehicle.vin}
                                onChange={handleChange}
                                onBlur={event => {
                                    handleFieldBlur(event);
                                    handleVinDecode();
                                }}
                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors uppercase"
                                maxLength={17}
                                disabled={!isNewVehicle} // Disable editing VIN for existing vehicles
                            />
                            <GlassButton
                                onClick={handleVinDecode}
                                disabled={isDecoding}
                                className="whitespace-nowrap"
                                contentClassName="flex items-center gap-2"
                            >
                                {isDecoding ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : <SparklesIcon className="h-5 w-5" />}
                                Decode VIN
                            </GlassButton>
                        </div>
                        {vinError && <p className="text-red-400 text-xs mt-1">{vinError}</p>}
                    </div>

                    {/* Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">Status</label>
                            <AppSelect
                                value={editedVehicle.status ?? ''}
                                onChange={value => {
                                    const normalized = normalizeStatus(value);
                                    setEditedVehicle(prev => ({ ...prev, status: normalized }));
                                }}
                                options={vehicleStatusOptions}
                            />
                        </div>
                        {inputFields.map(field => {
                            const rawValue = editedVehicle[field.name as keyof Vehicle];
                            const inputValue =
                                field.type === 'number'
                                    ? rawValue ?? ''
                                    : (rawValue ?? '').toString();
                            return (
                                <div key={field.name}>
                                    <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">{field.label}</label>
                                    <input
                                        name={field.name}
                                        type={field.type || 'text'}
                                        value={inputValue}
                                        onChange={handleChange}
                                        onBlur={handleFieldBlur}
                                        placeholder={field.placeholder}
                                        maxLength={field.maxLength}
                                        className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Image Management Section */}
                    <div>
                        <h4 className="text-lg font-semibold text-primary mb-2 tracking-tight-md">Image Management</h4>
                        <div className="p-4 bg-glass-panel rounded-lg border border-dashed border-border-low">
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-4">
                                {imagePreviews.map((src, index) => (
                                    <div 
                                        key={index} 
                                        className={`relative group aspect-square cursor-grab ${draggedIndex === index ? 'opacity-50' : ''}`}
                                        draggable={true}
                                        onDragStart={() => setDraggedIndex(index)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => void handleDrop(index)}
                                        onDragEnd={() => setDraggedIndex(null)}
                                    >
                                        <img src={src} className="w-full h-full object-cover rounded-md pointer-events-none" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                            <GlassButton size="icon" onClick={() => void handleRemoveImage(index)} title="Remove Image"><TrashIcon className="h-4 w-4"/></GlassButton>
                                        </div>
                                         {index === 0 && <div className="absolute top-1 left-1 bg-lava-core text-white text-xs px-2 py-0.5 rounded-full">Cover</div>}
                                    </div>
                                ))}
                            </div>
                            <label
                                htmlFor="image-upload"
                                className={`cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-colors border border-lava-warm/50 ${
                                    uploadDisabled
                                        ? 'text-muted hover:text-muted cursor-not-allowed opacity-60'
                                        : 'text-lava-warm hover:text-lava-core hover:bg-glass-panel'
                                }`}
                                title={uploadDisabled && !inventoryIdentifier ? (isResolvingId ? 'Linking this vehicle record. Please try again shortly.' : 'Save this vehicle before uploading images.') : undefined}
                            >
                                {isUploadingImages || isResolvingId ? (
                                    <svg className="animate-spin h-5 w-5 text-lava-core" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <ArrowUpCircleIcon className="h-5 w-5" />
                                )}
                                {uploadButtonText}
                            </label>
                            <input
                                id="image-upload"
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploadDisabled}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-4 flex justify-end space-x-4 border-t border-border-low">
                    <GlassButton onClick={onClose}>Cancel</GlassButton>
                    <GlassButton onClick={handleSave}>Save Changes</GlassButton>
                </div>
            </div>
        </div>
    );
};

export default EditVehicleModal;
