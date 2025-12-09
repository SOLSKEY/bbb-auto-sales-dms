import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { UserContext, DataContext } from '../App';
import { supabase } from '../supabaseClient';
import { ClipboardDocumentIcon, CheckIcon, ArrowPathIcon, DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentIcon as ClipboardDocumentIconSolid } from '@heroicons/react/24/solid';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidContainer } from '@/components/ui/liquid-container';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { getNextStockNumberForMake } from '../utils/stockNumbers';
import type { WarrantyData } from '../utils/warrantyGenerator';
import type { ContractPacketData } from '../utils/contractPacketGenerator';
import type { Vehicle, Sale } from '../types';

// Google Places API types
declare global {
    interface Window {
        google: any;
        initGooglePlaces: () => void;
    }
}

// Input field component with copy button - defined outside to prevent recreation on each render
const InputWithCopy: React.FC<{
    label: string;
    value: string;
    fieldName: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    className?: string;
    copiedField: string | null;
    onCopy: (value: string, fieldName: string) => void;
    onBlur?: (value: string) => void;
    required?: boolean;
}> = ({ label, value, fieldName, onChange, type = 'text', placeholder, className = '', copiedField, onCopy, onBlur, required = false }) => {
    const hasValue = value.trim().length > 0;
    const isCopied = copiedField === fieldName;

    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative flex items-center gap-2">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => onBlur && onBlur(value)}
                    placeholder={placeholder}
                    className={`w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors ${className}`}
                />
                {hasValue && (
                    <button
                        type="button"
                        onClick={() => onCopy(value, fieldName)}
                        tabIndex={-1}
                        className="flex-shrink-0 p-1.5 rounded-md hover:bg-glass-panel transition-colors"
                        title="Copy to clipboard"
                    >
                        {isCopied ? (
                            <CheckIcon className="h-5 w-5 text-emerald-400" />
                        ) : (
                            <ClipboardDocumentIcon className="h-5 w-5 text-muted hover:text-primary" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

interface SalesPrepLog {
    id: number;
    created_at: string;
    updated_at: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    dob: string | null;
    dl_number: string | null;
    ssn: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    county: string | null;
    vin: string | null;
    vin_last_4: string | null;
    stock_number: string | null;
    body_style: string | null;
    color: string | null;
    gps: string | null;
    miles: string | null;
    warranty_months: string | null;
    warranty_miles: string | null;
    pickup_payment_dates: string[] | null;
    pickup_payment_amounts: string[] | null;
}

interface FormData {
    firstName: string;
    lastName: string;
    phone: string;
    dob: string;
    dlNumber: string;
    ssn: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    county: string;
    vin: string;
    vinLast4: string;
    stockNumber: string;
    bodyStyle: string;
    color: string;
    gps: string;
    miles: string;
    warrantyMonths: string;
    warrantyMiles: string;
}

const SalePrep: React.FC = () => {
    const dataContext = useContext(DataContext);
    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        phone: '',
        dob: '',
        dlNumber: '',
        ssn: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        county: '',
        vin: '',
        vinLast4: '',
        stockNumber: '',
        bodyStyle: '',
        color: '',
        gps: '',
        miles: '',
        warrantyMonths: '',
        warrantyMiles: '',
    });

    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [savedLogs, setSavedLogs] = useState<SalesPrepLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<SalesPrepLog | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [pickupDates, setPickupDates] = useState<string[]>([]);
    const [pickupAmounts, setPickupAmounts] = useState<string[]>(['250', '250', '250', '250']);
    const [addressAutocomplete, setAddressAutocomplete] = useState<boolean>(false);
    const [isSavedLogsExpanded, setIsSavedLogsExpanded] = useState<boolean>(false);
    const [addressPredictions, setAddressPredictions] = useState<any[]>([]);
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);
    const [highlightedAddressIndex, setHighlightedAddressIndex] = useState<number>(-1);
    const [highlightedVehicleIndex, setHighlightedVehicleIndex] = useState<number>(-1);
    const [isGeneratingWarranty, setIsGeneratingWarranty] = useState(false);
    const [isGeneratingContractPacket, setIsGeneratingContractPacket] = useState(false);
    const [deletingLogId, setDeletingLogId] = useState<number | null>(null);

    const vehicleSearchRef = useRef<HTMLDivElement>(null);
    const addressInputRef = useRef<HTMLInputElement>(null);

    if (!dataContext) return null;
    const { inventory, sales } = dataContext;

    // Calculate pickup payment dates (2, 4, 6, 8 weeks from today in CST)
    const calculatePickupDates = (): string[] => {
        const now = new Date();
        // Convert to CST (America/Chicago timezone)
        const cstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        const dates: string[] = [];
        
        for (let weeks = 2; weeks <= 8; weeks += 2) {
            const date = new Date(cstDate);
            date.setDate(date.getDate() + (weeks * 7));
            dates.push(date.toLocaleDateString('en-US', { 
                month: '2-digit', 
                day: '2-digit', 
                year: 'numeric',
                timeZone: 'America/Chicago'
            }));
        }
        
        return dates;
    };

    // Initialize pickup dates
    useEffect(() => {
        setPickupDates(calculatePickupDates());
    }, []);

    // Initialize pickup amounts when dates are calculated
    useEffect(() => {
        if (pickupDates.length > 0 && pickupAmounts.length !== pickupDates.length) {
            setPickupAmounts(Array(pickupDates.length).fill('250'));
        }
    }, [pickupDates]);

    // Load Google Places API
    useEffect(() => {
        // Check if script is already loaded
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            if (window.google && window.google.maps && window.google.maps.places) {
                setAddressAutocomplete(true); // Mark as ready
            }
            return;
        }

        // Load Google Places API script
        const script = document.createElement('script');
        // Use provided API key or fall back to environment variable
        const apiKey = (import.meta as any).env?.VITE_GOOGLE_PLACES_API_KEY || 'AIzaSyC9tIUCvMaTapPNSo3Eg4B22_GB1grNrfw';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                setAddressAutocomplete(true); // Mark as ready
            }
        };
        document.head.appendChild(script);
    }, []);

    // Handle address input changes for predictions
    const handleAddressInputChange = (value: string) => {
        setFormData(prev => ({ ...prev, address: value }));
        setHighlightedAddressIndex(-1);
        if (value.length > 2 && window.google && window.google.maps && window.google.maps.places) {
            const service = new window.google.maps.places.AutocompleteService();
            service.getPlacePredictions(
                {
                    input: value,
                    componentRestrictions: { country: 'us' },
                    types: ['address'],
                },
                (predictions: any[], status: string) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                        setAddressPredictions(predictions);
                        setShowAddressDropdown(true);
                        setHighlightedAddressIndex(-1);
                    } else {
                        setAddressPredictions([]);
                        setShowAddressDropdown(false);
                        setHighlightedAddressIndex(-1);
                    }
                }
            );
        } else {
            setAddressPredictions([]);
            setShowAddressDropdown(false);
            setHighlightedAddressIndex(-1);
        }
    };

    // Handle address prediction selection
    const handleAddressSelect = (prediction: any) => {
        if (!window.google || !window.google.maps || !window.google.maps.places) return;
        
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        service.getDetails(
            {
                placeId: prediction.place_id,
                fields: ['address_components', 'formatted_address'],
            },
            (place: any, status: string) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    let streetNumber = '';
                    let route = '';
                    let city = '';
                    let state = '';
                    let zip = '';
                    let county = '';

                    place.address_components.forEach((component: any) => {
                        const types = component.types;
                        if (types.includes('street_number')) {
                            streetNumber = component.long_name;
                        } else if (types.includes('route')) {
                            route = component.long_name;
                        } else if (types.includes('locality')) {
                            city = component.long_name;
                        } else if (types.includes('administrative_area_level_1')) {
                            // State code (short_name) - should always be 2 characters like "TN"
                            state = (component.short_name || component.long_name || '').toUpperCase().slice(0, 2);
                        } else if (types.includes('postal_code')) {
                            zip = component.long_name;
                        } else if (types.includes('administrative_area_level_2')) {
                            county = component.long_name;
                        }
                    });

                    // Remove "County" suffix from county name if present
                    let cleanedCounty = county;
                    if (cleanedCounty) {
                        cleanedCounty = cleanedCounty.replace(/\s+County\s*$/i, '').trim();
                    }

                    setFormData(prev => ({
                        ...prev,
                        address: `${streetNumber} ${route}`.trim() || place.formatted_address || '',
                        city: city || prev.city,
                        state: state || prev.state,
                        zip: zip || prev.zip,
                        county: cleanedCounty || prev.county,
                    }));
                }
                setShowAddressDropdown(false);
                setHighlightedAddressIndex(-1);
            }
        );
    };

    // Handle address keyboard navigation
    const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showAddressDropdown || addressPredictions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedAddressIndex(prev => 
                prev < addressPredictions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedAddressIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && highlightedAddressIndex >= 0) {
            e.preventDefault();
            handleAddressSelect(addressPredictions[highlightedAddressIndex]);
        } else if (e.key === 'Escape') {
            setShowAddressDropdown(false);
            setHighlightedAddressIndex(-1);
        }
    };

    // Filter vehicles based on search
    const filteredVehicles = useMemo(() => {
        if (!vehicleSearchTerm.trim()) return [];
        
        const term = vehicleSearchTerm.toLowerCase();
        return inventory
            .filter(v => v.status !== 'Sold')
            .filter(v => 
                v.make?.toLowerCase().includes(term) ||
                v.model?.toLowerCase().includes(term) ||
                v.vin?.toLowerCase().includes(term) ||
                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(term)
            )
            .slice(0, 10); // Limit to 10 results
    }, [vehicleSearchTerm, inventory]);

    // Handle vehicle selection
    const handleVehicleSelect = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setFormData(prev => ({
            ...prev,
            vin: vehicle.vin || '',
            vinLast4: vehicle.vin ? vehicle.vin.slice(-4) : '',
            color: vehicle.exterior || prev.color, // Autopopulate color from vehicle
            // Note: bodyStyle is NOT autopopulated - must be filled manually
        }));
        setVehicleSearchTerm('');
        setShowVehicleDropdown(false);
        setHighlightedVehicleIndex(-1);
        
        // Calculate stock number
        if (vehicle.make && sales) {
            const nextStock = getNextStockNumberForMake(sales, vehicle.make);
            if (nextStock) {
                setFormData(prev => ({
                    ...prev,
                    stockNumber: nextStock.formatted,
                }));
            }
        }
    };

    // Handle vehicle search keyboard navigation
    const handleVehicleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showVehicleDropdown || filteredVehicles.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedVehicleIndex(prev => 
                prev < filteredVehicles.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedVehicleIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && highlightedVehicleIndex >= 0) {
            e.preventDefault();
            handleVehicleSelect(filteredVehicles[highlightedVehicleIndex]);
        } else if (e.key === 'Escape') {
            setShowVehicleDropdown(false);
            setHighlightedVehicleIndex(-1);
        }
    };

    // Format DOB input (08011997 -> 08/01/1997)
    const formatDOB = (input: string): string => {
        // Remove all non-numeric characters
        const numbers = input.replace(/\D/g, '');
        
        // If it's 8 digits, format as MM/DD/YYYY
        if (numbers.length === 8) {
            const month = numbers.slice(0, 2);
            const day = numbers.slice(2, 4);
            const year = numbers.slice(4, 8);
            return `${month}/${day}/${year}`;
        }
        
        // If it's already formatted or partially formatted, return as is
        // This handles cases where user types with slashes already
        if (input.includes('/')) {
            return input;
        }
        
        // If less than 8 digits, return as is (user might still be typing)
        return input;
    };

    // Handle DOB blur to auto-format
    const handleDOBBlur = (value: string) => {
        if (value && !value.includes('/')) {
            const formatted = formatDOB(value);
            if (formatted !== value) {
                setFormData(prev => ({ ...prev, dob: formatted }));
            }
        }
    };

    // Format phone number input (1234567890 -> (123) 456-7890)
    const formatPhone = (input: string): string => {
        // Remove all non-numeric characters
        const numbers = input.replace(/\D/g, '');
        
        // If it's 10 digits, format as (###) ###-####
        if (numbers.length === 10) {
            const areaCode = numbers.slice(0, 3);
            const firstPart = numbers.slice(3, 6);
            const secondPart = numbers.slice(6, 10);
            return `(${areaCode}) ${firstPart}-${secondPart}`;
        }
        
        // If it's already formatted, return as is
        if (input.includes('(') || input.includes('-')) {
            return input;
        }
        
        // If less than 10 digits, return as is (user might still be typing)
        return input;
    };

    // Handle phone blur to auto-format
    const handlePhoneBlur = (value: string) => {
        if (value && !value.includes('(') && !value.includes('-')) {
            const formatted = formatPhone(value);
            if (formatted !== value) {
                setFormData(prev => ({ ...prev, phone: formatted }));
            }
        }
    };

    // Format SSN input (123456789 -> 123-45-6789)
    const formatSSN = (input: string): string => {
        // Remove all non-numeric characters
        const numbers = input.replace(/\D/g, '');
        
        // If it's 9 digits, format as ###-##-####
        if (numbers.length === 9) {
            const firstPart = numbers.slice(0, 3);
            const secondPart = numbers.slice(3, 5);
            const thirdPart = numbers.slice(5, 9);
            return `${firstPart}-${secondPart}-${thirdPart}`;
        }
        
        // If it's already formatted, return as is
        if (input.includes('-')) {
            return input;
        }
        
        // If less than 9 digits, return as is (user might still be typing)
        return input;
    };

    // Handle SSN blur to auto-format
    const handleSSNBlur = (value: string) => {
        if (value && !value.includes('-')) {
            const formatted = formatSSN(value);
            if (formatted !== value) {
                setFormData(prev => ({ ...prev, ssn: formatted }));
            }
        }
    };

    // Refresh stock number
    const refreshStockNumber = () => {
        if (!sales || sales.length === 0) return;
        
        // Try to get make from selected vehicle first
        let make: string | undefined = selectedVehicle?.make;
        
        // If no selected vehicle but we have a VIN, try to find the vehicle in inventory
        if (!make && formData.vin) {
            const vehicleFromInventory = inventory.find(v => v.vin === formData.vin);
            if (vehicleFromInventory) {
                make = vehicleFromInventory.make;
            }
        }
        
        // If we have a make, calculate the next stock number
        if (make) {
            const nextStock = getNextStockNumberForMake(sales, make);
            if (nextStock) {
                setFormData(prev => ({
                    ...prev,
                    stockNumber: nextStock.formatted,
                }));
            }
        } else {
            // If no make found, show an alert
            alert('Please select a vehicle or enter a VIN to refresh the stock number.');
        }
    };

    // Refresh pickup dates
    const refreshPickupDates = () => {
        const newDates = calculatePickupDates();
        setPickupDates(newDates);
        // Reset amounts to default when refreshing dates
        setPickupAmounts(Array(newDates.length).fill('250'));
    };

    // Copy to clipboard
    const copyToClipboard = async (value: string, fieldName: string) => {
        // For phone numbers, strip formatting and copy only raw numbers
        let textToCopy = value;
        if (fieldName === 'phone') {
            textToCopy = value.replace(/\D/g, '');
        }
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Load saved logs
    useEffect(() => {
        const loadLogs = async () => {
            const { data, error } = await supabase
                .from('sales_prep_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setSavedLogs(data as SalesPrepLog[]);
            }
        };

        loadLogs();
    }, []);

    // Delete a saved log
    const handleDeleteLog = async (logId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the log selection
        
        if (!confirm('Are you sure you want to delete this log? This action cannot be undone.')) {
            return;
        }

        setDeletingLogId(logId);
        try {
            const { error } = await supabase
                .from('sales_prep_logs')
                .delete()
                .eq('id', logId);

            if (error) throw error;

            // Remove from local state
            setSavedLogs(prev => prev.filter(log => log.id !== logId));
            
            // If the deleted log was selected, clear the selection
            if (selectedLog?.id === logId) {
                setSelectedLog(null);
            }
        } catch (error) {
            console.error('Error deleting log:', error);
            alert('Failed to delete log. Please try again.');
        } finally {
            setDeletingLogId(null);
        }
    };

    // Load selected log into form
    const loadLogIntoForm = (log: SalesPrepLog) => {
            setFormData({
                firstName: log.first_name || '',
                lastName: log.last_name || '',
                phone: log.phone || '',
                dob: log.dob || '',
                dlNumber: log.dl_number || '',
                ssn: log.ssn || '',
                address: log.address || '',
                city: log.city || '',
                state: log.state || '',
                zip: log.zip || '',
                county: log.county || '',
                vin: log.vin || '',
                vinLast4: log.vin_last_4 || '',
                stockNumber: log.stock_number || '',
                bodyStyle: log.body_style || '',
                color: log.color || '',
                gps: log.gps || '',
                miles: log.miles || '',
                warrantyMonths: log.warranty_months || '',
                warrantyMiles: log.warranty_miles || '',
            });
        
        if (log.pickup_payment_dates) {
            setPickupDates(log.pickup_payment_dates);
        }
        if (log.pickup_payment_amounts) {
            setPickupAmounts(log.pickup_payment_amounts);
        } else if (log.pickup_payment_dates) {
            // If dates exist but amounts don't, default to 250
            setPickupAmounts(Array(log.pickup_payment_dates.length).fill('250'));
        }
        
        // Find and set selected vehicle if VIN matches
        if (log.vin) {
            const vehicle = inventory.find(v => v.vin === log.vin);
            if (vehicle) {
                setSelectedVehicle(vehicle);
            }
        }
        
        setSelectedLog(log);
    };

    // Check if warranty can be generated (has required fields)
    const canGenerateWarranty = (): boolean => {
        return !!(
            formData.firstName &&
            formData.lastName &&
            formData.vin &&
            (selectedVehicle || (formData.vin && inventory.find(v => v.vin === formData.vin))) &&
            formData.miles &&
            formData.warrantyMonths &&
            formData.warrantyMiles
        );
    };

    // Check if all form fields are filled (for contract packet generation)
    const canGenerateContractPacket = (): boolean => {
        // Check all form data fields
        const allFieldsFilled = 
            formData.firstName.trim() !== '' &&
            formData.lastName.trim() !== '' &&
            formData.phone.trim() !== '' &&
            formData.dob.trim() !== '' &&
            formData.dlNumber.trim() !== '' &&
            formData.ssn.trim() !== '' &&
            formData.address.trim() !== '' &&
            formData.city.trim() !== '' &&
            formData.state.trim() !== '' &&
            formData.zip.trim() !== '' &&
            formData.county.trim() !== '' &&
            formData.vin.trim() !== '' &&
            formData.vinLast4.trim() !== '' &&
            formData.stockNumber.trim() !== '' &&
            formData.bodyStyle.trim() !== '' &&
            formData.color.trim() !== '' &&
            formData.gps.trim() !== '' &&
            formData.miles.trim() !== '' &&
            formData.warrantyMonths.trim() !== '' &&
            formData.warrantyMiles.trim() !== '';
        
        return allFieldsFilled;
    };

    // Generate warranty contract
    const handleGenerateWarranty = async () => {
        if (!canGenerateWarranty()) {
            alert('Please fill in all required fields: First Name, Last Name, VIN, Miles, and Warranty Months/Miles.');
            return;
        }

        setIsGeneratingWarranty(true);
        try {
            // Get vehicle data from selected vehicle or find by VIN
            let vehicle: Vehicle | undefined = selectedVehicle;
            if (!vehicle && formData.vin) {
                vehicle = inventory.find(v => v.vin === formData.vin);
            }

            if (!vehicle) {
                alert('Vehicle information not found. Please select a vehicle from inventory.');
                setIsGeneratingWarranty(false);
                return;
            }

            // Prepare warranty data
            const warrantyData: WarrantyData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                year: vehicle.year?.toString() || '',
                make: vehicle.make || '',
                model: vehicle.model || '',
                vin: formData.vin,
                mileage: formData.miles || vehicle.mileage?.toString() || '0',
                warrantyMonths: parseInt(formData.warrantyMonths) || 12,
                warrantyMiles: parseInt(formData.warrantyMiles) || 12000,
                saleDate: new Date(),
            };

            // Generate and open PDF (dynamic import to avoid bundling pdf-lib)
            const { generateWarrantyPDF } = await import('../utils/warrantyGenerator');
            await generateWarrantyPDF(warrantyData);
        } catch (error) {
            console.error('Error generating warranty:', error);
            alert('Failed to generate warranty contract. Please try again.');
        } finally {
            setIsGeneratingWarranty(false);
        }
    };

    // Generate contract packet
    const handleGenerateContractPacket = async () => {
        if (!canGenerateContractPacket()) {
            alert('Please fill in all fields before generating the contract packet.');
            return;
        }

        setIsGeneratingContractPacket(true);
        try {
            // Get vehicle data from selected vehicle or find by VIN
            let vehicle: Vehicle | undefined = selectedVehicle;
            if (!vehicle && formData.vin) {
                vehicle = inventory.find(v => v.vin === formData.vin);
            }

            // Prepare contract packet data
            const contractData: ContractPacketData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                dob: formData.dob,
                dlNumber: formData.dlNumber,
                ssn: formData.ssn,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zip: formData.zip,
                county: formData.county,
                vin: formData.vin,
                vinLast4: formData.vinLast4,
                stockNumber: formData.stockNumber,
                bodyStyle: formData.bodyStyle,
                color: formData.color,
                gps: formData.gps,
                miles: formData.miles,
                warrantyMonths: formData.warrantyMonths,
                warrantyMiles: formData.warrantyMiles,
                // Vehicle fields (if available)
                year: vehicle?.year,
                make: vehicle?.make,
                model: vehicle?.model,
                trim: vehicle?.trim,
                price: vehicle?.price,
                downPayment: vehicle?.downPayment,
            };

            // Generate and download PDF (dynamic import to avoid bundling pdf-lib)
            const { generateContractPacket } = await import('../utils/contractPacketGenerator');
            await generateContractPacket(contractData);
        } catch (error) {
            console.error('Error generating contract packet:', error);
            alert('Failed to generate contract packet. Please try again.');
        } finally {
            setIsGeneratingContractPacket(false);
        }
    };

    // Save form data
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const logData = {
                first_name: formData.firstName || null,
                last_name: formData.lastName || null,
                phone: formData.phone || null,
                dob: formData.dob || null,
                dl_number: formData.dlNumber || null,
                ssn: formData.ssn || null,
                address: formData.address || null,
                city: formData.city || null,
                state: formData.state || null,
                zip: formData.zip || null,
                county: formData.county || null,
                vin: formData.vin || null,
                vin_last_4: formData.vinLast4 || null,
                stock_number: formData.stockNumber || null,
                body_style: formData.bodyStyle || null,
                color: formData.color || null,
                gps: formData.gps || null,
                miles: formData.miles || null,
                warranty_months: formData.warrantyMonths || null,
                warranty_miles: formData.warrantyMiles || null,
                pickup_payment_dates: pickupDates,
                pickup_payment_amounts: pickupAmounts,
                updated_at: new Date().toISOString(),
            };

            if (selectedLog) {
                // Update existing log
                const { error } = await supabase
                    .from('sales_prep_logs')
                    .update(logData)
                    .eq('id', selectedLog.id);

                if (error) throw error;
            } else {
                // Create new log
                const { error } = await supabase
                    .from('sales_prep_logs')
                    .insert([logData]);

                if (error) throw error;
            }

            // Clear form
            setFormData({
                firstName: '',
                lastName: '',
                phone: '',
                dob: '',
                dlNumber: '',
                ssn: '',
                address: '',
                city: '',
                state: '',
                zip: '',
                county: '',
                vin: '',
                vinLast4: '',
                stockNumber: '',
                bodyStyle: '',
                color: '',
                gps: '',
                miles: '',
                warrantyMonths: '',
                warrantyMiles: '',
            });
            setSelectedVehicle(null);
            setSelectedLog(null);
            setPickupDates(calculatePickupDates());
            setVehicleSearchTerm('');

            // Reload logs
            const { data } = await supabase
                .from('sales_prep_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                setSavedLogs(data as SalesPrepLog[]);
            }
        } catch (error) {
            console.error('Error saving log:', error);
            alert('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };


    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (vehicleSearchRef.current && !vehicleSearchRef.current.contains(event.target as Node)) {
                setShowVehicleDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex gap-6 h-full">
            {/* Main Form */}
            <div className="flex-1">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-primary">Sale Prep</h1>
                        <div className="flex items-center gap-2">
                            <LiquidButton
                                onClick={handleGenerateContractPacket}
                                disabled={isGeneratingContractPacket || !canGenerateContractPacket()}
                                size="default"
                                color="blue"
                                className="flex items-center gap-2"
                            >
                                {isGeneratingContractPacket ? (
                                    <>
                                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                        <span>Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <DocumentTextIcon className="h-5 w-5" />
                                        <span>Generate Contract Packet</span>
                                    </>
                                )}
                            </LiquidButton>
                            <LiquidButton
                                onClick={handleSave}
                                disabled={isSaving}
                                size="default"
                                color="blue"
                                className="flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <DocumentTextIcon className="h-5 w-5" />
                                        <span>Log / Save</span>
                                    </>
                                )}
                            </LiquidButton>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Warranty Container - Full Width */}
                        <LiquidContainer variant="yellow" className="p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-4 border-b border-border-low pb-2">
                                <h3 className="text-lg font-bold text-lava-warm tracking-tight-md text-center flex-1">
                                    Warranty
                                </h3>
                                <LiquidButton
                                    onClick={handleGenerateWarranty}
                                    disabled={isGeneratingWarranty || !canGenerateWarranty()}
                                    size="default"
                                    color="blue"
                                    className="flex items-center gap-2"
                                >
                                    {isGeneratingWarranty ? (
                                        <>
                                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <DocumentTextIcon className="h-5 w-5" />
                                            <span>Generate Warranty</span>
                                        </>
                                    )}
                                </LiquidButton>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Months Field */}
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-muted uppercase tracking-wide whitespace-nowrap">
                                        Warranty Months
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.warrantyMonths}
                                        onChange={(e) => {
                                            const months = e.target.value;
                                            const miles = months ? (parseInt(months) * 1000).toString() : '';
                                            setFormData(prev => ({
                                                ...prev,
                                                warrantyMonths: months,
                                                warrantyMiles: miles,
                                            }));
                                        }}
                                        placeholder="Enter months"
                                        className="flex-1 bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                                    />
                                </div>
                                {/* Miles Field (Read-only) */}
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-muted uppercase tracking-wide whitespace-nowrap">
                                        Warranty Miles
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.warrantyMiles}
                                        readOnly
                                        placeholder="Auto-calculated"
                                        className="flex-1 bg-glass-panel border border-border-low text-primary rounded-md p-2 focus:outline-none transition-colors opacity-75 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </LiquidContainer>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Left Column - Customer Info */}
                            <LiquidContainer variant="cyan-blue" className="p-4 flex flex-col">
                                <h3 className="text-lg font-bold text-lava-warm mb-4 border-b border-border-low pb-2 tracking-tight-md">
                                    Customer Info
                                </h3>
                                <div className="space-y-4 flex-grow">
                                <InputWithCopy
                                    label="First Name"
                                    value={formData.firstName}
                                    fieldName="firstName"
                                    onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
                                    placeholder="Enter first name"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                    required={true}
                                />
                                <InputWithCopy
                                    label="Last Name"
                                    value={formData.lastName}
                                    fieldName="lastName"
                                    onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
                                    placeholder="Enter last name"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                    required={true}
                                />
                                
                                {/* Address with autocomplete */}
                                <div className="relative" ref={vehicleSearchRef}>
                                    <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">
                                        Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            ref={addressInputRef}
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => handleAddressInputChange(e.target.value)}
                                            onKeyDown={handleAddressKeyDown}
                                            placeholder="Start typing address..."
                                            className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                                        />
                                        {formData.address && (
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(formData.address, 'address')}
                                                tabIndex={-1}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-glass-panel transition-colors"
                                                title="Copy to clipboard"
                                            >
                                                {copiedField === 'address' ? (
                                                    <CheckIcon className="h-5 w-5 text-emerald-400" />
                                                ) : (
                                                    <ClipboardDocumentIcon className="h-5 w-5 text-muted hover:text-primary" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {showAddressDropdown && addressPredictions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-[rgba(18,18,18,0.98)] border border-border-low rounded-md shadow-lg max-h-60 overflow-y-auto backdrop-blur-sm">
                                            {addressPredictions.map((prediction, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleAddressSelect(prediction)}
                                                    className={`w-full text-left px-4 py-2 text-primary ${
                                                        idx === highlightedAddressIndex 
                                                            ? 'bg-lava-core/30 border-l border-lava-core' 
                                                            : 'hover:bg-white/10'
                                                    }`}
                                                >
                                                    {prediction.description}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <InputWithCopy
                                    label="City"
                                    value={formData.city}
                                    fieldName="city"
                                    onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                                    placeholder="City"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                />
                                <InputWithCopy
                                    label="State"
                                    value={formData.state}
                                    fieldName="state"
                                    onChange={(value) => setFormData(prev => ({ ...prev, state: value.toUpperCase().slice(0, 2) }))}
                                    placeholder="State Code (e.g., TN)"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                    className="uppercase"
                                />
                                <InputWithCopy
                                    label="Zip"
                                    value={formData.zip}
                                    fieldName="zip"
                                    onChange={(value) => setFormData(prev => ({ ...prev, zip: value }))}
                                    placeholder="Zip Code"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                />
                                <InputWithCopy
                                    label="County"
                                    value={formData.county}
                                    fieldName="county"
                                    onChange={(value) => setFormData(prev => ({ ...prev, county: value }))}
                                    placeholder="County"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                />
                                <InputWithCopy
                                    label="Phone"
                                    value={formData.phone}
                                    fieldName="phone"
                                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                                    onBlur={handlePhoneBlur}
                                    placeholder="(555) 123-4567"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                />
                                <InputWithCopy
                                    label="DOB"
                                    value={formData.dob}
                                    fieldName="dob"
                                    onChange={(value) => setFormData(prev => ({ ...prev, dob: value }))}
                                    onBlur={handleDOBBlur}
                                    placeholder="MM/DD/YYYY"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                />
                                <InputWithCopy
                                    label="DL #"
                                    value={formData.dlNumber}
                                    fieldName="dlNumber"
                                    onChange={(value) => setFormData(prev => ({ ...prev, dlNumber: value }))}
                                    placeholder="Driver's License Number"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                />
                                <InputWithCopy
                                    label="SSN"
                                    value={formData.ssn}
                                    fieldName="ssn"
                                    onChange={(value) => setFormData(prev => ({ ...prev, ssn: value }))}
                                    onBlur={handleSSNBlur}
                                    placeholder="Social Security Number"
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                />
                            </div>
                        </LiquidContainer>

                        {/* Right Column - Vehicle Info and Pickup Payments */}
                        <div className="flex flex-col gap-6">
                            {/* Vehicle Info Container */}
                            <LiquidContainer variant="neon-pink" className="p-4 flex flex-col">
                                <h3 className="text-lg font-bold text-lava-warm mb-4 border-b border-border-low pb-2 tracking-tight-md">
                                    Vehicle Info
                                </h3>
                                <div className="space-y-4 flex-grow">
                                    {/* VIN Search */}
                                    <div className="relative" ref={vehicleSearchRef}>
                                        <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">
                                            VIN / Vehicle Search
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={vehicleSearchTerm}
                                            onChange={(e) => {
                                                setVehicleSearchTerm(e.target.value);
                                                setShowVehicleDropdown(e.target.value.length > 0);
                                            }}
                                            placeholder="Type Make, Model, or VIN..."
                                            className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                                        />
                                        {showVehicleDropdown && filteredVehicles.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-[rgba(18,18,18,0.98)] border border-border-low rounded-md shadow-lg max-h-60 overflow-y-auto backdrop-blur-sm">
                                                {filteredVehicles.map((vehicle, idx) => (
                                                    <button
                                                        key={vehicle.vehicleId || vehicle.id}
                                                        type="button"
                                                        onClick={() => handleVehicleSelect(vehicle)}
                                                        className={`w-full text-left px-4 py-2 text-primary ${
                                                            idx === highlightedVehicleIndex 
                                                                ? 'bg-lava-core/30 border-l border-lava-core' 
                                                                : 'hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <div className="font-medium">
                                                            {vehicle.year} {vehicle.make} {vehicle.model}
                                                        </div>
                                                        <div className="text-sm text-muted">
                                                            VIN: {vehicle.vin}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* VIN Field */}
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">
                                            VIN
                                        </label>
                                        <div className="relative flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={formData.vin}
                                                onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                                                placeholder="Vehicle VIN"
                                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors uppercase"
                                            />
                                            {formData.vin && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(formData.vin, 'vin')}
                                                    tabIndex={-1}
                                                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-glass-panel transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    {copiedField === 'vin' ? (
                                                        <CheckIcon className="h-5 w-5 text-emerald-400" />
                                                    ) : (
                                                        <ClipboardDocumentIcon className="h-5 w-5 text-muted hover:text-primary" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Body Style Dropdown */}
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">
                                            Body Style
                                        </label>
                                        <select
                                            value={formData.bodyStyle}
                                            onChange={(e) => setFormData(prev => ({ ...prev, bodyStyle: e.target.value }))}
                                            className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                                        >
                                            <option value="">Select Body Style</option>
                                            <option value="Convertible">Convertible</option>
                                            <option value="Coupe">Coupe</option>
                                            <option value="Hatchback">Hatchback</option>
                                            <option value="4 Dr Sedan">4 Dr Sedan</option>
                                            <option value="SUV">SUV</option>
                                            <option value="Pickup">Pickup</option>
                                        </select>
                                    </div>
                                    
                                    {/* Color Field */}
                                    <InputWithCopy
                                        label="Color"
                                        value={formData.color}
                                        fieldName="color"
                                        onChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                                        placeholder="Vehicle Color"
                                        copiedField={copiedField}
                                        onCopy={copyToClipboard}
                                    />
                                    
                                    <InputWithCopy
                                        label="GPS"
                                        value={formData.gps}
                                        fieldName="gps"
                                        onChange={(value) => setFormData(prev => ({ ...prev, gps: value }))}
                                        placeholder="GPS Information"
                                        copiedField={copiedField}
                                        onCopy={copyToClipboard}
                                    />
                                    
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-muted mb-1 uppercase tracking-wide">
                                            Stock Number
                                        </label>
                                        <div className="relative flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={formData.stockNumber}
                                                onChange={(e) => setFormData(prev => ({ ...prev, stockNumber: e.target.value }))}
                                                placeholder="Stock Number"
                                                className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-md p-2 focus:outline-none transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={refreshStockNumber}
                                                className="flex-shrink-0 p-1.5 rounded-md hover:bg-glass-panel transition-colors"
                                                title="Refresh Stock Number"
                                            >
                                                <ArrowPathIcon className="h-5 w-5 text-muted hover:text-primary" />
                                            </button>
                                            {formData.stockNumber && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(formData.stockNumber, 'stockNumber')}
                                                    tabIndex={-1}
                                                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-glass-panel transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    {copiedField === 'stockNumber' ? (
                                                        <CheckIcon className="h-5 w-5 text-emerald-400" />
                                                    ) : (
                                                        <ClipboardDocumentIcon className="h-5 w-5 text-muted hover:text-primary" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <InputWithCopy
                                        label="Last 4 of Vin"
                                        value={formData.vinLast4}
                                        fieldName="vinLast4"
                                        onChange={(value) => setFormData(prev => ({ ...prev, vinLast4: value }))}
                                        placeholder="Last 4 digits"
                                        copiedField={copiedField}
                                        onCopy={copyToClipboard}
                                    />
                                    
                                    <InputWithCopy
                                        label="Miles"
                                        value={formData.miles}
                                        fieldName="miles"
                                        onChange={(value) => setFormData(prev => ({ ...prev, miles: value }))}
                                        placeholder="Mileage"
                                        copiedField={copiedField}
                                        onCopy={copyToClipboard}
                                        required={true}
                                    />
                                </div>
                            </LiquidContainer>

                            {/* Pickup Payments Container */}
                            <LiquidContainer variant="neon-green" className="p-4 flex flex-col">
                                <div className="flex items-center justify-between mb-4 border-b border-border-low pb-2">
                                    <h3 className="text-lg font-bold text-lava-warm tracking-tight-md">
                                        Pickup Payments
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={refreshPickupDates}
                                        className="p-1.5 rounded-md hover:bg-glass-panel transition-colors"
                                        title="Refresh Dates"
                                    >
                                        <ArrowPathIcon className="h-4 w-4 text-muted hover:text-primary" />
                                    </button>
                                </div>
                                <div className="space-y-0 border border-border-low rounded-md overflow-hidden">
                                    {pickupDates.map((date, idx) => {
                                        const fieldName = `pickupDate${idx + 1}`;
                                        return (
                                            <div 
                                                key={idx} 
                                                className={`flex items-center border-b border-border-low last:border-b-0 ${
                                                    idx % 2 === 0 ? 'bg-glass-panel' : 'bg-transparent'
                                                }`}
                                            >
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        value={date}
                                                        readOnly
                                                        className="w-full bg-transparent border-0 text-primary p-2 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(date, fieldName)}
                                                        tabIndex={-1}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/5 transition-colors"
                                                        title="Copy to clipboard"
                                                    >
                                                        {copiedField === fieldName ? (
                                                            <CheckIcon className="h-4 w-4 text-emerald-400" />
                                                        ) : (
                                                            <ClipboardDocumentIcon className="h-4 w-4 text-muted hover:text-primary" />
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="w-24 relative">
                                                    <input
                                                        type="text"
                                                        value={pickupAmounts[idx] || '250'}
                                                        onChange={(e) => {
                                                            const newAmounts = [...pickupAmounts];
                                                            newAmounts[idx] = e.target.value;
                                                            setPickupAmounts(newAmounts);
                                                        }}
                                                        className="w-full bg-transparent border-0 text-right font-medium text-primary px-3 py-2 border-l border-border-low focus:outline-none focus:bg-white/5"
                                                        placeholder="250"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </LiquidContainer>
                        </div>
                    </div>
                </div>

                </div>
            </div>

            {/* Saved Logs Sidebar */}
            <div className={`${isSavedLogsExpanded ? 'w-80' : 'w-16'} glass-card p-4 transition-all duration-300 flex flex-col`}>
                <div className={`flex items-center ${isSavedLogsExpanded ? 'justify-between' : 'justify-center'} mb-4`}>
                    {isSavedLogsExpanded && (
                        <h2 className="text-lg font-semibold text-primary">Saved Logs</h2>
                    )}
                    {!isSavedLogsExpanded && (
                        <DocumentTextIcon className="h-6 w-6 text-muted" />
                    )}
                    <LiquidButton
                        type="button"
                        onClick={() => setIsSavedLogsExpanded(!isSavedLogsExpanded)}
                        size="icon"
                        color="blue"
                        className={`${isSavedLogsExpanded ? 'ml-auto' : ''} flex-shrink-0`}
                        title={isSavedLogsExpanded ? "Collapse" : "Expand Saved Logs"}
                    >
                        {isSavedLogsExpanded ? (
                            <ChevronRightIcon className="h-5 w-5" />
                        ) : (
                            <ChevronLeftIcon className="h-5 w-5" />
                        )}
                    </LiquidButton>
                </div>
                {isSavedLogsExpanded && (
                    <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto flex-1">
                    {savedLogs.length === 0 ? (
                        <p className="text-muted text-sm">No saved logs yet.</p>
                    ) : (
                        savedLogs.map((log) => {
                            // Create label from first and last name
                            const firstName = log.first_name?.trim() || '';
                            const lastName = log.last_name?.trim() || '';
                            const fullName = `${firstName} ${lastName}`.trim();
                            const displayLabel = fullName || 'Unnamed Customer';
                            const isDeleting = deletingLogId === log.id;
                            
                            return (
                                <div
                                    key={log.id}
                                    className={`relative group rounded-md border transition-colors ${
                                        selectedLog?.id === log.id
                                            ? 'bg-lava-core/20 border-lava-core'
                                            : 'bg-glass-panel border-border-low hover:border-border-high'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => loadLogIntoForm(log)}
                                        className="w-full text-left p-3 pr-10"
                                    >
                                        <div className="font-medium text-primary">
                                            {displayLabel}
                                        </div>
                                        <div className="text-xs text-muted mt-1">
                                            {log.created_at ? new Date(log.created_at).toLocaleDateString() : 'No date'}
                                        </div>
                                        {log.vin && (
                                            <div className="text-xs text-muted mt-1">
                                                VIN: {log.vin}
                                            </div>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteLog(log.id, e)}
                                        disabled={isDeleting}
                                        className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        title="Delete log"
                                    >
                                        {isDeleting ? (
                                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <TrashIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            );
                        })
                    )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalePrep;

