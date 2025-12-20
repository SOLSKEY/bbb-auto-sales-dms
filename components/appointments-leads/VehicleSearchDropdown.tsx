import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { DataContext } from '../../App';
import type { Vehicle } from '../../types';

interface VehicleSearchDropdownProps {
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

export const VehicleSearchDropdown: React.FC<VehicleSearchDropdownProps> = ({
    selectedIds,
    onSelectionChange,
}) => {
    const dataContext = useContext(DataContext);
    const inventory = dataContext?.inventory || [];

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter vehicles based on search query
    const filteredVehicles = useMemo(() => {
        if (!searchQuery.trim()) return inventory.filter(v => v.status === 'Available');

        const query = searchQuery.toLowerCase();
        return inventory.filter(vehicle => {
            if (vehicle.status !== 'Available') return false;

            const searchFields = [
                vehicle.year?.toString(),
                vehicle.make,
                vehicle.model,
                vehicle.trim,
                vehicle.vin,
                vehicle.vinLast4,
                vehicle.exterior,
                vehicle.price?.toString(),
            ].filter(Boolean);

            return searchFields.some(field =>
                field?.toLowerCase().includes(query)
            );
        });
    }, [inventory, searchQuery]);

    // Get selected vehicles for display
    const selectedVehicles = useMemo(() => {
        return inventory.filter(v => selectedIds.includes(v.vehicleId || v.id?.toString() || ''));
    }, [inventory, selectedIds]);

    const toggleVehicle = (vehicle: Vehicle) => {
        const vehicleId = vehicle.vehicleId || vehicle.id?.toString() || '';
        if (selectedIds.includes(vehicleId)) {
            onSelectionChange(selectedIds.filter(id => id !== vehicleId));
        } else {
            onSelectionChange([...selectedIds, vehicleId]);
        }
    };

    const removeVehicle = (vehicleId: string) => {
        onSelectionChange(selectedIds.filter(id => id !== vehicleId));
    };

    const formatVehicleDisplay = (vehicle: Vehicle) => {
        return `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ''}`;
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Selected Vehicles Display */}
            {selectedVehicles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedVehicles.map((vehicle) => {
                        const vehicleId = vehicle.vehicleId || vehicle.id?.toString() || '';
                        return (
                            <div
                                key={vehicleId}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-sm"
                            >
                                <span className="text-white">
                                    {formatVehicleDisplay(vehicle)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeVehicle(vehicleId)}
                                    className="p-0.5 rounded-full hover:bg-white/20 transition"
                                >
                                    <XMarkIcon className="w-3.5 h-3.5 text-white/70" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Search Input */}
            <div
                className="liquid-input size-2 cursor-pointer"
                onClick={() => setIsOpen(true)}
            >
                <MagnifyingGlassIcon className="w-4 h-4 text-white/40 mr-2" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search by year, make, model, VIN, color, price..."
                    className="flex-1"
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 liquid-card p-0 max-h-64 overflow-y-auto animate-slide-up">
                    {filteredVehicles.length === 0 ? (
                        <div className="p-4 text-center text-white/50 text-sm">
                            {searchQuery ? 'No vehicles found matching your search' : 'No available vehicles'}
                        </div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {filteredVehicles.slice(0, 20).map((vehicle) => {
                                const vehicleId = vehicle.vehicleId || vehicle.id?.toString() || '';
                                const isSelected = selectedIds.includes(vehicleId);

                                return (
                                    <button
                                        key={vehicleId}
                                        type="button"
                                        className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition text-left ${isSelected ? 'bg-cyan-500/10' : ''}`}
                                        onClick={() => toggleVehicle(vehicle)}
                                    >
                                        {/* Vehicle Image */}
                                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                            {vehicle.images && vehicle.images.length > 0 ? (
                                                <img
                                                    src={vehicle.images[0]}
                                                    alt={formatVehicleDisplay(vehicle)}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                                                    No Image
                                                </div>
                                            )}
                                        </div>

                                        {/* Vehicle Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {formatVehicleDisplay(vehicle)}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-white/50">
                                                <span>{vehicle.exterior}</span>
                                                <span>•</span>
                                                <span>{vehicle.mileage?.toLocaleString()} mi</span>
                                                {vehicle.vinLast4 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>...{vehicle.vinLast4}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-semibold text-cyan-400">
                                                {formatPrice(vehicle.price)}
                                            </p>
                                            {vehicle.downPayment && (
                                                <p className="text-xs text-white/40">
                                                    ${vehicle.downPayment.toLocaleString()} down
                                                </p>
                                            )}
                                        </div>

                                        {/* Selection Indicator */}
                                        <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-cyan-500' : 'border border-white/30'}`}>
                                            {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredVehicles.length > 20 && (
                                <div className="p-3 text-center text-white/40 text-sm">
                                    Showing first 20 results. Refine your search for more specific results.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
