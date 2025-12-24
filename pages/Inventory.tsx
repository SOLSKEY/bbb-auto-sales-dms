import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import type { Vehicle, Sale } from '../types';
import { UserContext, DataContext } from '../App';
import { PhotoIcon, PencilSquareIcon, CheckCircleIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon, ArrowUpTrayIcon, FolderIcon, ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/solid';
import EditVehicleModal from '../components/EditVehicleModal';
import MarkSoldModal from '../components/MarkSoldModal';
import ConfirmationModal from '../components/ConfirmationModal';
import AppSelect from '../components/AppSelect';
import { supabase } from '../supabaseClient';
import { computeNextAccountNumber, computeNextStockNumbers, getStockPrefix } from '../utils/stockNumbers';
import { toSupabase, fromSupabase, SALE_FIELD_MAP, VEHICLE_FIELD_MAP, quoteSupabaseColumn } from '../supabaseMapping';
import { INVENTORY_STATUS_VALUES } from '../constants';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { LiquidContainer } from '@/components/ui/liquid-container';
import { useDeviceType } from '../hooks/useDeviceType';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { InventoryFilterSheet } from '../components/InventoryFilterSheet';

const INVENTORY_STATUS_OPTIONS = INVENTORY_STATUS_VALUES.map(status => ({
    value: status,
    label: status,
})) as { value: string; label: string }[];

const STATUS_BADGE_CLASSES: Record<string, string> = {
    'Available': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Available (Pending Title)': 'bg-sky-500/20 text-sky-200 border-sky-500/35',
    'Deposit': 'bg-amber-500/20 text-amber-200 border-amber-500/35',
    'Repairs': 'bg-orange-500/20 text-orange-200 border-orange-500/35',
    'Cash': 'bg-purple-500/25 text-purple-200 border-purple-500/35',
    'Sold': 'bg-gray-600/20 text-gray-300 border-gray-600/35',
};

// Status to outline color mapping for inventory card borders
const STATUS_OUTLINE_COLORS: Record<string, string> = {
    'Available': 'rgba(16, 185, 129, 0.8)',           // emerald-500 - Green
    'Available (Pending Title)': 'rgba(6, 182, 212, 0.8)', // cyan-500 - Cyan Blue (keep current)
    'Deposit': 'rgba(245, 158, 11, 0.8)',             // amber-500 - Yellow
    'Repairs': 'rgba(249, 115, 22, 0.8)',             // orange-500 - Orange
    'Cash': 'rgba(168, 85, 247, 0.8)',                // purple-500 - Purple
    'Sold': 'rgba(107, 114, 128, 0.8)',               // gray-500 - Gray (fallback)
};

const ACTIVE_RETAIL_STATUSES = new Set(
    INVENTORY_STATUS_VALUES.filter(status => status !== 'Repairs'),
);

const BHPH_STATUSES = new Set(
    INVENTORY_STATUS_VALUES.filter(
        status => status !== 'Repairs' && status !== 'Cash',
    ),
);

const numericVehicleFields: Array<keyof Vehicle> = ['year', 'mileage', 'price', 'downPayment'];

const parseNumberOrNull = (value: unknown): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const cleaned = String(value).replace(/,/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
};

const normalizeVehicleNumbers = (vehicle: Vehicle): Vehicle => {
    const normalized = { ...vehicle } as Vehicle;
    numericVehicleFields.forEach(field => {
        const parsed = parseNumberOrNull((normalized as any)[field]);
        if (parsed !== null) {
            (normalized as any)[field] = parsed;
        }
    });
    if ((normalized as any).vehicleId !== undefined && (normalized as any).vehicleId !== null) {
        (normalized as any).vehicleId = String((normalized as any).vehicleId);
    }
    if ((normalized as any).vinLast4 !== undefined && (normalized as any).vinLast4 !== null) {
        (normalized as any).vinLast4 = String((normalized as any).vinLast4).toUpperCase();
    }
    return normalized;
};

const formatNumberDisplay = (value: unknown): string => {
    const parsed = parseNumberOrNull(value);
    if (parsed === null) return '0';
    return parsed.toLocaleString();
};

const VehicleCard: React.FC<{
    vehicle: Vehicle;
    onEdit: () => void;
    onSold: () => void;
    onTrash: () => void;
    onView: () => void;
    canEdit: boolean;
    canMarkSold: boolean;
    canDelete: boolean;
}> = ({ vehicle, onEdit, onSold, onTrash, onView, canEdit, canMarkSold, canDelete }) => {
    const images = vehicle.images ?? [];
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [binCopied, setBinCopied] = useState(false);
    const [vinCopied, setVinCopied] = useState(false);
    const [captionCopied, setCaptionCopied] = useState(false);
    const [folderCopied, setFolderCopied] = useState(false);

    useEffect(() => {
        setActiveImageIndex(prev => {
            if (images.length === 0) return 0;
            return Math.min(prev, images.length - 1);
        });
    }, [images.length]);

    const showPrevious = () => {
        setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const showNext = () => {
        setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const generateSocialCaption = (): string => {
        const year = vehicle.year || '';
        const make = vehicle.make || '';
        const model = vehicle.model || '';
        const trim = vehicle.trim || '';
        const mileage = formatNumberDisplay(vehicle.mileage || 0);

        return `🔥 | New car alert
${year} ${make} ${model}${trim ? ` ${trim}` : ''}
${mileage} miles
Rebuilt Title

🚗 | Take it home TODAY!
• Buy here pay here
• No credit, Bad Credit, No Problem!
• Free Warranty Included

📞 | Call/Text Now
615-878-5233
Sales Rep: Key

📍 | ⭐️⭐️⭐️⭐️⭐️
BBB Auto Sales of Smyrna
375 South Lowry Street,
Smyrna, Tennessee 37167
https://www.bbbofsmyrna.com/

#cardealer #cardealership #carshopping #newcar #usedcar #carfinance #carleasing #carbuying #auto #carsofinstagram #carlifestyle #luxurycars #carphotography #carcommunity #carswithoutlimits #instacar #supercars #exoticcars #carshow #carculture`;
    };

    const handleCopyCaption = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const caption = generateSocialCaption();
            await navigator.clipboard.writeText(caption);
            setCaptionCopied(true);
            setTimeout(() => setCaptionCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy social caption:', error);
        }
    };

    const generateFolderName = (): string => {
        const vin = vehicle.vin || '';
        const last4Vin = vin.length >= 4 ? vin.slice(-4) : vin;
        const year = vehicle.year || '';
        const make = vehicle.make || '';
        const model = vehicle.model || '';
        const trim = vehicle.trim || '';
        
        return `${last4Vin} ${year} ${make} ${model}${trim ? ` ${trim}` : ''}`.trim();
    };

    const handleCopyFolderName = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const folderName = generateFolderName();
            await navigator.clipboard.writeText(folderName);
            setFolderCopied(true);
            setTimeout(() => setFolderCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy folder name:', error);
        }
    };

    const badgeClasses = STATUS_BADGE_CLASSES[vehicle.status] || STATUS_BADGE_CLASSES['Sold'] || 'bg-gray-500/20 text-gray-300 border-gray-600/30';

    // Get outline color for the card border based on vehicle status
    const outlineColor = STATUS_OUTLINE_COLORS[vehicle.status] || STATUS_OUTLINE_COLORS['Sold'] || 'rgba(107, 114, 128, 0.8)';

    const isSold = vehicle.status === 'Sold';

    return (
        <div 
            className={`glass-card-outline-colored overflow-hidden glass-card-hover flex flex-col ${isSold ? 'opacity-50' : ''}`}
            style={{ '--outline-color': outlineColor } as React.CSSProperties}
        >
            <div className="relative h-48 bg-glass-panel flex items-center justify-center">
                 {images.length > 0 ? (
                    <img
                        src={images[activeImageIndex]}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <PhotoIcon className="h-16 w-16 text-muted" />
                )}
                {images.length > 1 && (
                    <>
                        <GlassButton
                            type="button"
                            size="icon"
                            onClick={showPrevious}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            aria-label="Previous image"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </GlassButton>
                        <GlassButton
                            type="button"
                            size="icon"
                            onClick={showNext}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            aria-label="Next image"
                        >
                            <ChevronRightIcon className="h-5 w-5" />
                        </GlassButton>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                            {activeImageIndex + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                    <GlassButton
                        type="button"
                        onClick={onView}
                    >
                        {vehicle.year} {vehicle.make} {vehicle.model}{vehicle.trim ? ` ${vehicle.trim}` : ''}
                    </GlassButton>
                    <div className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${badgeClasses}`}>
                        {vehicle.status}
                    </div>
                </div>
                 <div className="mt-4 space-y-2 text-sm text-secondary">
                    <div className="flex justify-between"><span>Mileage:</span> <span className="font-semibold">{formatNumberDisplay(vehicle.mileage)} mi</span></div>
                    <div className="flex justify-between"><span>Exterior:</span> <span className="font-semibold">{vehicle.exterior}</span></div>
                    <div className="flex justify-between"><span>Drivetrain:</span> <span className="font-semibold">{vehicle.driveTrain}</span></div>
                    {vehicle.vin && (
                        <div className="flex justify-between items-center">
                            <span>VIN:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{vehicle.vin}</span>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await navigator.clipboard.writeText(vehicle.vin);
                                            setVinCopied(true);
                                            setTimeout(() => setVinCopied(false), 2000);
                                        } catch (error) {
                                            console.error('Failed to copy VIN:', error);
                                        }
                                    }}
                                    className="p-1 transition-colors group touch-target"
                                    title="Copy VIN"
                                >
                                    {vinCopied ? (
                                        <CheckIcon className="h-4 w-4 text-sky-300" />
                                    ) : (
                                        <ClipboardDocumentIcon className="h-4 w-4 text-sky-300 group-hover:text-sky-200" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    {vehicle.binNumber !== null && vehicle.binNumber !== undefined && (
                        <div className="flex justify-between items-center">
                            <span>Bin Number:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{vehicle.binNumber}</span>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await navigator.clipboard.writeText(String(vehicle.binNumber));
                                            setBinCopied(true);
                                            setTimeout(() => setBinCopied(false), 2000);
                                        } catch (error) {
                                            console.error('Failed to copy bin number:', error);
                                        }
                                    }}
                                    className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors touch-target"
                                    title="Copy bin number"
                                >
                                    {binCopied ? (
                                        <CheckIcon className="h-4 w-4" />
                                    ) : (
                                        <ClipboardDocumentIcon className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-glass-panel p-4 mt-auto border-t border-border-low">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <p className="text-2xl font-orbitron text-lava-core font-bold tracking-tight-lg">${formatNumberDisplay(vehicle.price)}</p>
                        <p className="text-xs text-muted">Down: ${formatNumberDisplay(vehicle.downPayment)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <LiquidButton
                            onClick={handleCopyCaption}
                            size="icon"
                            color="blue"
                            className="flex-shrink-0"
                            title={captionCopied ? "Copied!" : "Copy Social Caption"}
                        >
                            {captionCopied ? (
                                <CheckIcon className="h-5 w-5" />
                            ) : (
                                <ArrowUpTrayIcon className="h-5 w-5" />
                            )}
                        </LiquidButton>
                        <LiquidButton
                            onClick={handleCopyFolderName}
                            size="icon"
                            color="blue"
                            className="flex-shrink-0"
                            title={folderCopied ? "Copied!" : "Copy Folder Name"}
                        >
                            {folderCopied ? (
                                <CheckIcon className="h-5 w-5" />
                            ) : (
                                <FolderIcon className="h-5 w-5" />
                            )}
                        </LiquidButton>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {canEdit && (
                        <LiquidButton
                            size="sm"
                            onClick={onEdit}
                            className="flex-shrink-0"
                        >
                            <PencilSquareIcon className="h-4 w-4" /> Edit
                        </LiquidButton>
                    )}
                    {canMarkSold && (
                        <LiquidButton
                            size="sm"
                            onClick={onSold}
                            disabled={isSold}
                            className="flex-shrink-0"
                        >
                            <CheckCircleIcon className="h-4 w-4" /> Sold
                        </LiquidButton>
                    )}
                    {canDelete && (
                        <LiquidButton size="icon" onClick={onTrash} className="flex-shrink-0">
                            <TrashIcon className="h-4 w-4" />
                        </LiquidButton>
                    )}
                </div>
            </div>
            <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-lava-warm via-lava-core to-lava-cool group-hover:w-full transition-all duration-300"></div>
        </div>
    );
};

const VehicleDetailsModal: React.FC<{ vehicle: Vehicle; onClose: () => void }> = ({ vehicle, onClose }) => {
    const images = vehicle.images ?? [];
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        setActiveImageIndex(0);
    }, [vehicle.id, images.length]);

    const showPrevious = () => {
        setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const showNext = () => {
        setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#14171b] border border-border-low rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border-low">
                    <div>
                        <h2 className="text-2xl font-orbitron text-primary tracking-wide">{vehicle.year} {vehicle.make} {vehicle.model}</h2>
                        <p className="text-sm text-muted">VIN ending in {vehicle.vin.slice(-4)}</p>
                    </div>
                    <GlassButton size="icon" onClick={onClose}>
                        <XMarkIcon className="h-6 w-6" />
                    </GlassButton>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="relative h-96 bg-glass-panel flex items-center justify-center">
                        {images.length > 0 ? (
                            <img
                                src={images[activeImageIndex]}
                                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                            />
                        ) : (
                            <PhotoIcon className="h-20 w-20 text-muted" />
                        )}
                        {images.length > 1 && (
                            <>
                                <GlassButton
                                    type="button"
                                    size="icon"
                                    onClick={showPrevious}
                                    className="absolute left-6 top-1/2 -translate-y-1/2"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeftIcon className="h-6 w-6" />
                                </GlassButton>
                                <GlassButton
                                    type="button"
                                    size="icon"
                                    onClick={showNext}
                                    className="absolute right-6 top-1/2 -translate-y-1/2"
                                    aria-label="Next image"
                                >
                                    <ChevronRightIcon className="h-6 w-6" />
                                </GlassButton>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-4 py-1 rounded-full">
                                    {activeImageIndex + 1} / {images.length}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-primary">
                        <div className="space-y-2">
                            <h3 className="text-sm uppercase tracking-[0.3em] text-muted">Vehicle Details</h3>
                            <p className="text-lg font-semibold text-primary">{vehicle.trim || 'N/A'}</p>
                            <div className="space-y-1 text-sm text-secondary">
                                <div className="flex justify-between"><span>Status</span><span className="text-primary font-semibold">{vehicle.status}</span></div>
                                <div className="flex justify-between"><span>Mileage</span><span className="text-primary font-semibold">{formatNumberDisplay(vehicle.mileage)} mi</span></div>
                                <div className="flex justify-between"><span>Exterior</span><span className="text-primary font-semibold">{vehicle.exterior || 'N/A'}</span></div>
                                <div className="flex justify-between"><span>Interior</span><span className="text-primary font-semibold">{vehicle.interior || 'N/A'}</span></div>
                                <div className="flex justify-between"><span>Drivetrain</span><span className="text-primary font-semibold">{vehicle.driveTrain || 'N/A'}</span></div>
                                <div className="flex justify-between"><span>Transmission</span><span className="text-primary font-semibold">{vehicle.transmission || 'N/A'}</span></div>
                                <div className="flex justify-between"><span>Engine</span><span className="text-primary font-semibold">{vehicle.engine || 'N/A'}</span></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm uppercase tracking-[0.3em] text-muted">Sales Price</h3>
                            <div className="text-3xl font-orbitron text-lava-core font-bold">${formatNumberDisplay(vehicle.price)}</div>
                            <p className="text-sm text-muted">Down payment: ${formatNumberDisplay(vehicle.downPayment)}</p>
                            <div className="space-y-1 text-sm text-secondary">
                                <div className="flex justify-between"><span>Arrival Date</span><span className="text-primary font-semibold">{vehicle.arrivalDate || 'N/A'}</span></div>
                                <div className="flex justify-between"><span>VIN</span><span className="text-primary font-semibold">{vehicle.vin}</span></div>
                                <div className="flex justify-between"><span>Vehicle ID</span><span className="text-primary font-semibold">{vehicle.vehicleId || 'N/A'}</span></div>
                                <div className="flex justify-between"><span>VIN Last 4</span><span className="text-primary font-semibold">{vehicle.vinLast4 || vehicle.vin.slice(-4)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-border-low flex justify-end">
                    <GlassButton onClick={onClose}>Close</GlassButton>
                </div>
            </div>
        </div>
    );
};

// Helper function to get current date in CST as YYYY-MM-DD format
const getCurrentDateCST = (): string => {
    const now = new Date();
    // Get date components in CST (America/Chicago timezone)
    const year = now.toLocaleString('en-US', { timeZone: 'America/Chicago', year: 'numeric' });
    const month = now.toLocaleString('en-US', { timeZone: 'America/Chicago', month: '2-digit' });
    const day = now.toLocaleString('en-US', { timeZone: 'America/Chicago', day: '2-digit' });
    return `${year}-${month}-${day}`;
};

const blankVehicle: Vehicle = {
  status: 'Available',
  arrivalDate: getCurrentDateCST(),
  vinLast4: '',
  year: new Date().getFullYear(),
  make: '',
  model: '',
  trim: '',
  exterior: '',
  interior: '',
  upholstery: 'Cloth',
  bodyStyle: 'Sedan',
  driveTrain: 'FWD',
  mileage: 0,
  mileageUnit: 'MI',
  transmission: 'AUTOMATIC',
  fuelType: 'GASOLINE',
  engine: '',
  price: 0,
  downPayment: 0,
  vin: '',
  vehicleId: '',
  images: [],
};

const downPaymentRanges: Record<string, string> = {
    '': 'Any Down Payment',
    '0-2000': 'Up to $2,000',
    '2001-2500': '$2,001 - $2,500',
    '2501-3100': '$2,501 - $3,100',
    '3101-3500': '$3,101 - $3,500',
    '3501-4000': '$3,501 - $4,000',
    '4001+': 'Over $4,000',
};


// Helper to convert empty strings to null for numeric fields
const prepareVehicleForDb = (vehicle: Vehicle) => {
    const { id, vehicleId, ...rest } = vehicle;
    const trimmedVehicleId =
        vehicleId !== undefined && vehicleId !== null ? vehicleId.toString().trim() : '';

    const prepared: Record<string, any> = {
        ...rest,
        year: parseNumberOrNull(vehicle.year),
        mileage: parseNumberOrNull(vehicle.mileage),
        price: parseNumberOrNull(vehicle.price),
        downPayment: parseNumberOrNull(vehicle.downPayment),
        images: vehicle.images ?? [],
    };

    if (trimmedVehicleId.length > 0) {
        prepared.vehicleId = trimmedVehicleId;
    }

    return prepared;
};

const Inventory: React.FC = () => {
    const userContext = useContext(UserContext);
    const dataContext = useContext(DataContext);
    const role = userContext?.user.role ?? 'user';
    const isAdmin = role === 'admin';
    const canAddInventory = isAdmin || role === 'user';
    const canEditInventory = isAdmin || role === 'user';
    const canMarkSold = isAdmin;
    const canDeleteInventory = isAdmin;

    const { isMobile } = useDeviceType();

    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [sellingVehicle, setSellingVehicle] = useState<Vehicle | null>(null);
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);

    const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    // State for filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        bodyStyle: '',
        downPayment: '',
    });
    const [sortBy, setSortBy] = useState<string>('dateAdded-desc');
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const sortDropdownRef = useRef<HTMLDivElement>(null);

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setSortDropdownOpen(false);
            }
        };

        if (sortDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [sortDropdownOpen]);

    if (!dataContext) return null;
    const { inventory, setInventory, sales, setSales, users } = dataContext;

    const normalizedInventory = useMemo(() => inventory.map(normalizeVehicleNumbers), [inventory]);

    const salespeople = useMemo(() => {
        if (!users || users.length === 0) return [];
        return users.filter(user => user.name && user.name.trim().length > 0);
    }, [users]);

    const uniqueBodyStyles = useMemo(() => [...new Set(normalizedInventory.map(v => v.bodyStyle))].sort(), [normalizedInventory]);

    const nextAccountNumberValue = useMemo(() => computeNextAccountNumber(sales), [sales]);
    const nextStockData = useMemo(() => computeNextStockNumbers(sales), [sales]);
    const defaultAccountNumberForSale = sellingVehicle && nextAccountNumberValue ? String(nextAccountNumberValue) : '';
    const defaultStockNumberForSale = sellingVehicle ? nextStockData.nextByPrefix[getStockPrefix(sellingVehicle.make)]?.formatted ?? '' : '';

    const filteredInventory = useMemo(() => {
        const filtered = normalizedInventory.filter(vehicle => {
            // Instantly hide sold vehicles from the inventory view
            if (vehicle.status === 'Sold') return false;

            const searchTermLower = searchTerm.toLowerCase();
            if (searchTerm && !(
                vehicle.make.toLowerCase().includes(searchTermLower) ||
                vehicle.model.toLowerCase().includes(searchTermLower) ||
                String(vehicle.year).includes(searchTermLower) ||
                vehicle.vin.toLowerCase().includes(searchTermLower)
            )) {
                return false;
            }

            if (filters.status && vehicle.status !== filters.status) return false;
            if (filters.bodyStyle && vehicle.bodyStyle !== filters.bodyStyle) return false;

            if (filters.downPayment) {
                const down = vehicle.downPayment ?? 0;
                if (filters.downPayment === '0-2000' && down > 2000) return false;
                if (filters.downPayment === '2001-2500' && (down < 2001 || down > 2500)) return false;
                if (filters.downPayment === '2501-3100' && (down < 2501 || down > 3100)) return false;
                if (filters.downPayment === '3101-3500' && (down < 3101 || down > 3500)) return false;
                if (filters.downPayment === '3501-4000' && (down < 3501 || down > 4000)) return false;
                if (filters.downPayment === '4001+' && down <= 4000) return false;
            }

            return true;
        });

        // Apply sorting
        const [sortField, sortDirection] = sortBy.split('-') as [string, 'asc' | 'desc'];
        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'dateAdded':
                    // Sort by arrival date (most recent first when descending)
                    const dateA = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
                    const dateB = b.arrivalDate ? new Date(b.arrivalDate).getTime() : 0;
                    comparison = dateA - dateB; // ascending = older first, descending = newer first
                    break;
                case 'downPayment':
                    const downA = a.downPayment ?? 0;
                    const downB = b.downPayment ?? 0;
                    comparison = downA - downB;
                    break;
                case 'price':
                    const priceA = a.price ?? 0;
                    const priceB = b.price ?? 0;
                    comparison = priceA - priceB;
                    break;
                case 'make':
                    comparison = (a.make || '').localeCompare(b.make || '');
                    break;
                case 'model':
                    comparison = (a.model || '').localeCompare(b.model || '');
                    break;
                default:
                    return 0;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [inventory, searchTerm, filters, sortBy]);

    // Infinite scroll for both mobile and desktop (improves performance)
    const { displayedItems: displayedVehicles, hasMore, isLoading: isLoadingMore, sentinelRef } = useInfiniteScroll(
        filteredInventory,
        { initialItemsPerPage: isMobile ? 10 : 20 } // Load 10 on mobile, 20 on desktop
    );

    const vehiclesToDisplay = displayedVehicles; // Use paginated results for both mobile and desktop

    const inventoryCounts = useMemo(() => {
        let total = 0;
        let bhph = 0;
        let cash = 0;

        inventory.forEach(vehicle => {
            if (vehicle.status === 'Sold') return;
            if (ACTIVE_RETAIL_STATUSES.has(vehicle.status)) {
                total += 1;
                if (BHPH_STATUSES.has(vehicle.status)) {
                    bhph += 1;
                }
                if (vehicle.status === 'Cash') {
                    cash += 1;
                }
            }
        });

        return { total, bhph, cash };
    }, [normalizedInventory]);

    type FilterChangeInput = React.ChangeEvent<HTMLSelectElement> | { name: string; value: string };

    const handleFilterChange = (input: FilterChangeInput) => {
        const { name, value } = 'target' in input ? input.target : input;
        setFilters(prev => {
            const next = { ...prev, [name]: value } as typeof filters;
            return next;
        });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilters({ status: '', bodyStyle: '', downPayment: '' });
        setSortBy('dateAdded-desc');
    };

    const handleVehicleImagesUpdated = (vehicleId: number, urls: string[]) => {
        setInventory(prev =>
            prev.map(vehicle =>
                vehicle.id === vehicleId ? { ...vehicle, images: urls } : vehicle,
            ),
        );
        setEditingVehicle(prev =>
            prev && prev.id === vehicleId ? { ...prev, images: urls } : prev,
        );
        setViewingVehicle(prev =>
            prev && prev.id === vehicleId ? { ...prev, images: urls } : prev,
        );
    };
    const applyInventoryIdentifier = (query: any, vehicle: Vehicle) => {
    if (vehicle.id !== undefined) {
        return query.eq('id', vehicle.id);
    }
    if (vehicle.vehicleId && vehicle.vehicleId.trim().length > 0) {
        const column = quoteSupabaseColumn(VEHICLE_FIELD_MAP.vehicleId);
        return query.eq(column, vehicle.vehicleId.trim());
    }
    return query.eq(VEHICLE_FIELD_MAP.vin, vehicle.vin);
};

    const handleSaveVehicle = async (updatedVehicle: Vehicle, isOfficialStatusChange?: boolean, previousStatus?: string) => {
        if (!canEditInventory) {
            alert('You do not have permission to edit vehicles.');
            return;
        }
        try {
            const normalizedVehicle = normalizeVehicleNumbers(updatedVehicle);
            const vehicleForDb = prepareVehicleForDb(normalizedVehicle);
            const vehicleForSupabase = toSupabase(vehicleForDb, VEHICLE_FIELD_MAP);

            let query = supabase
                .from('Inventory')
                .update(vehicleForSupabase);

            query = applyInventoryIdentifier(query, normalizedVehicle);

            const { error } = await query;

            if (error) {
                console.error('Error updating vehicle:', error);
                alert('Failed to update vehicle. Please try again.');
                return;
            }

            // If this is an official status change, log it to status_logs
            if (isOfficialStatusChange && previousStatus && previousStatus !== normalizedVehicle.status) {
                const vehicleId = normalizedVehicle.vehicleId || normalizedVehicle.vin;
                if (vehicleId) {
                    const { error: logError } = await supabase
                        .from('status_logs')
                        .insert({
                            vehicle_id: vehicleId,
                            previous_status: previousStatus,
                            new_status: normalizedVehicle.status,
                            changed_at: new Date().toISOString(),
                        });

                    if (logError) {
                        console.error('Error logging status change:', logError);
                        // Don't fail the whole operation if logging fails, just warn
                        console.warn('Vehicle updated but status change was not logged.');
                    }
                }
            }

            // Update local state
            setInventory(prev => prev.map(v => {
                if (normalizedVehicle.id !== undefined) {
                    return v.id === normalizedVehicle.id ? normalizedVehicle : v;
                }
                return v.vin === normalizedVehicle.vin ? normalizedVehicle : v;
            }));
            setEditingVehicle(null);
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Failed to save vehicle. Please try again.');
        }
    };

    const handleAddNewVehicle = async (newVehicle: Vehicle) => {
        if (!canAddInventory) {
            alert('You do not have permission to add vehicles.');
            return;
        }
        if (!newVehicle.vin || !newVehicle.make || !newVehicle.model) {
            alert('VIN, Make, and Model are required fields.');
            return;
        }
        if (inventory.some(v => v.vin === newVehicle.vin)) {
            alert('A vehicle with this VIN already exists.');
            return;
        }

        try {
            const normalizedVehicle = normalizeVehicleNumbers(newVehicle);
            const vehicleForDb = prepareVehicleForDb(normalizedVehicle);
            if (!vehicleForDb.vehicleId) {
                alert('Vehicle ID is required. Please ensure year, model, and VIN are entered so it can auto-populate.');
                return;
            }
            const vehicleForSupabase = toSupabase(vehicleForDb, VEHICLE_FIELD_MAP);

            const { data, error } = await supabase
                .from('Inventory')
                .insert([vehicleForSupabase])
                .select('*')
                .single();

            if (error) {
                console.error('Error adding vehicle:', error);
                alert('Failed to add vehicle. Please try again.');
                return;
            }

            const mapped = normalizeVehicleNumbers(fromSupabase(data, VEHICLE_FIELD_MAP) as Vehicle);
            mapped.images = Array.isArray(mapped.images) ? mapped.images : [];

            // Update local state
            setInventory(prev => [mapped, ...prev]);
            setIsAddingVehicle(false);
        } catch (error) {
            console.error('Error adding vehicle:', error);
            alert('Failed to add vehicle. Please try again.');
        }
    };

    const startDeleteProcess = (vehicle: Vehicle) => {
        if (!canDeleteInventory) {
            alert('You do not have permission to delete vehicles.');
            return;
        }
        setVehicleToDelete(vehicle);
    };

    const confirmDeleteVehicle = async () => {
        if (!vehicleToDelete) return;
        if (!canDeleteInventory) {
            alert('You do not have permission to delete vehicles.');
            setVehicleToDelete(null);
            return;
        }

        try {
            let query = supabase
                .from('Inventory')
                .delete();

            query = applyInventoryIdentifier(query, vehicleToDelete);

            const { error } = await query;

            if (error) {
                console.error('Error deleting vehicle:', error);
                alert('Failed to delete vehicle. Please try again.');
                return;
            }

            // Update local state
            setInventory(prev => prev.filter(v => {
                if (vehicleToDelete.id !== undefined) {
                    return v.id !== vehicleToDelete.id;
                }
                return v.vin !== vehicleToDelete.vin;
            }));
            setVehicleToDelete(null);
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            alert('Failed to delete vehicle. Please try again.');
        }
    };
    
    const handleConfirmSold = async (saleDetails: {
        primarySalesperson: string;
        salespersonSplit: Array<{ name: string; share: number }>;
        downPayment: number;
        saleType: 'Sale' | 'Trade-in' | 'Name Change' | 'Cash Sale';
        stockNumber: string;
        accountNumber: string;
    }) => {
        if (!sellingVehicle) return;
        if (!canMarkSold) {
            alert('You do not have permission to mark vehicles as sold.');
            setSellingVehicle(null);
            return;
        }

        try {
            // 1. Update vehicle status to Sold in Supabase
            const vehicleUpdate = toSupabase({ status: 'Sold' }, VEHICLE_FIELD_MAP);
            let vehicleQuery = supabase
                .from('Inventory')
                .update(vehicleUpdate);

            vehicleQuery = applyInventoryIdentifier(vehicleQuery, sellingVehicle);

            const { error: updateError } = await vehicleQuery;

            if (updateError) {
                console.error('Error updating vehicle status:', updateError);
                alert('Failed to mark vehicle as sold. Please try again.');
                return;
            }

            // 2. Create a new Sale record
            const { status, ...vehicleDetails } = sellingVehicle;
            const saleId = saleDetails.accountNumber?.trim() || `SALE-${Date.now()}`;
            
            // Get local date in YYYY-MM-DD format (not UTC)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const localDateString = `${year}-${month}-${day}`;
            
            const newSale: Sale = {
                ...vehicleDetails,
                saleId,
                salePrice: sellingVehicle.price,
                saleDate: localDateString,
                salesperson: saleDetails.primarySalesperson,
                salespersonSplit: saleDetails.salespersonSplit,
                saleDownPayment: saleDetails.downPayment || null,
                saleType: saleDetails.saleType,
                stockNumber: saleDetails.stockNumber,
                accountNumber: saleDetails.accountNumber,
                downPayment: sellingVehicle.downPayment,
            };

            const saleForSupabase = toSupabase(newSale, SALE_FIELD_MAP);

            const performInsert = async (payload: Record<string, any>, allowFallback: boolean) => {
                const result = await supabase
                    .from('Sales')
                    .insert([payload])
                    .select('*')
                    .limit(1);

                if (
                    allowFallback &&
                    result.error &&
                    typeof result.error.message === 'string' &&
                    result.error.message.includes('Salesperson Split')
                ) {
                    console.warn(
                        '[Inventory] Sales table missing "Salesperson Split" column. Falling back without split payload.',
                        result.error,
                    );
                    const fallbackPayload = { ...payload };
                    const quotedSplit = quoteSupabaseColumn(SALE_FIELD_MAP.salespersonSplit);
                    delete fallbackPayload[SALE_FIELD_MAP.salespersonSplit];
                    delete fallbackPayload[quotedSplit];
                    const fallbackResult = await supabase
                        .from('Sales')
                        .insert([fallbackPayload])
                        .select('*')
                        .limit(1);
                    return { ...fallbackResult, usedFallback: !fallbackResult.error };
                }

                return { ...result, usedFallback: false };
            };

            const { data: insertedRows, error: insertError, usedFallback } = await performInsert(
                saleForSupabase,
                true,
            );

            if (insertError) {
                console.error('Error creating sale record:', insertError);
                alert('Failed to create sale record. Please try again.');
                return;
            }

            if (usedFallback) {
                alert(
                    'Sale saved, but the Supabase "Sales" table is missing the "Salesperson Split" column. Please run the schema migration to store split data.',
                );
            }

            const insertedSale =
                insertedRows && insertedRows.length > 0
                    ? { ...fromSupabase(insertedRows[0], SALE_FIELD_MAP), salespersonSplit: newSale.salespersonSplit }
                    : newSale;

            // Update local state
            setInventory(prev => prev.map(v => {
                if (sellingVehicle.id !== undefined) {
                    return v.id === sellingVehicle.id ? { ...v, status: 'Sold' } : v;
                }
                return v.vin === sellingVehicle.vin ? { ...v, status: 'Sold' } : v;
            }));
            setSales(prev => [insertedSale, ...prev]);
            setSellingVehicle(null);
        } catch (error) {
            console.error('Error marking vehicle as sold:', error);
            alert('Failed to complete sale. Please try again.');
        }
    };

    const handleSelectVehicleForEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
    };

    const handleSelectVehicleForSale = (vehicle: Vehicle) => {
        if (!canMarkSold) return;
        setSellingVehicle(vehicle);
    };

    return (
        <div>
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-6">
                <LiquidContainer variant="cyan-blue" className="w-full sm:w-auto sm:min-w-[260px] lg:min-w-[320px] px-4 py-3">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4">
                        <div className="flex-1 min-w-[150px]">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Inventory Count</p>
                            <p className="text-3xl font-orbitron font-bold mt-1 bg-gradient-to-r from-lava-core via-lava-warm to-lava-core/80 text-transparent bg-clip-text">
                                {inventoryCounts.total.toLocaleString()}
                            </p>
                        </div>
                        <div className="hidden lg:block h-12 w-px bg-border-low/60" aria-hidden="true"></div>
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 lg:mt-0">
                            <LiquidContainer variant="neon-green" className="flex-1 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted">BHPH</p>
                                <p className="text-base font-semibold text-primary mt-1">
                                    {inventoryCounts.bhph.toLocaleString()}
                                </p>
                            </LiquidContainer>
                            <div className="hidden sm:block h-10 w-px bg-border-low/60" aria-hidden="true"></div>
                            <LiquidContainer variant="neon-pink" className="flex-1 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted">Cash</p>
                                <p className="text-base font-semibold text-primary mt-1">
                                    {inventoryCounts.cash.toLocaleString()}
                                </p>
                            </LiquidContainer>
                        </div>
                    </div>
                </LiquidContainer>
                <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
                    <GlassButton
                        onClick={canAddInventory ? () => setIsAddingVehicle(true) : undefined}
                        disabled={!canAddInventory}
                        contentClassName="flex items-center gap-2"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add Inventory
                    </GlassButton>
                </div>
            </div>

            {/* Mobile Filter Button */}
            <div className="mb-4 md:hidden">
                <GlassButton
                    size="sm"
                    onClick={() => setIsFilterSheetOpen(true)}
                    contentClassName="flex items-center gap-2 w-full justify-center"
                >
                    <FunnelIcon className="h-5 w-5" />
                    Filters & Sort
                </GlassButton>
            </div>

            {/* Desktop Filter and Search Bar */}
            <div className="hidden md:flex mb-6 glass-card p-4 flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 flex-grow min-w-[250px] bg-[rgba(35,35,40,0.9)] border border-border-low rounded-md px-3 py-2 focus-within:border-lava-core transition-colors">
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted" />
                    <input
                        type="text"
                        placeholder="Search Make, Model, Year, VIN..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent text-primary focus:outline-none placeholder:text-[#D5D5D5]"
                    />
                </div>
                <div className="min-w-[150px]">
                    <AppSelect
                        value={filters.status}
                        onChange={value => handleFilterChange({ name: 'status', value })}
                        options={[
                            { value: '', label: 'Any Status' },
                            ...INVENTORY_STATUS_OPTIONS,
                        ]}
                    />
                </div>
                <div className="min-w-[150px]">
                    <AppSelect
                        value={filters.bodyStyle}
                        onChange={value => handleFilterChange({ name: 'bodyStyle', value })}
                        options={[
                            { value: '', label: 'Any Body Style' },
                            ...uniqueBodyStyles.map(style => ({ value: style, label: style })),
                        ]}
                    />
                </div>
                <div className="min-w-[150px]">
                    <AppSelect
                        value={filters.downPayment}
                        onChange={value => handleFilterChange({ name: 'downPayment', value })}
                        options={Object.entries(downPaymentRanges).map(([key, label]) => ({
                            value: key,
                            label,
                        }))}
                    />
                </div>
                <div className="relative" ref={sortDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                        className="flex items-center gap-2 text-primary hover:text-lava-core transition-colors cursor-pointer"
                    >
                        <span>Sort by</span>
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {sortDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 min-w-[220px] bg-[rgba(18,18,18,0.95)] border border-border-low rounded-xl shadow-2xl z-50 backdrop-filter backdrop-blur-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy('dateAdded-desc');
                                    setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                    sortBy === 'dateAdded-desc' ? 'bg-white/10 text-lava-core' : 'text-primary'
                                }`}
                            >
                                Date added (newest)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy('downPayment-asc');
                                    setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                    sortBy === 'downPayment-asc' ? 'bg-white/10 text-lava-core' : 'text-primary'
                                }`}
                            >
                                Down Payment (ascending)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy('downPayment-desc');
                                    setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                    sortBy === 'downPayment-desc' ? 'bg-white/10 text-lava-core' : 'text-primary'
                                }`}
                            >
                                Down Payment (descending)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy('price-asc');
                                    setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                    sortBy === 'price-asc' ? 'bg-white/10 text-lava-core' : 'text-primary'
                                }`}
                            >
                                Price (ascending)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy('price-desc');
                                    setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                    sortBy === 'price-desc' ? 'bg-white/10 text-lava-core' : 'text-primary'
                                }`}
                            >
                                Price (descending)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy('make-asc');
                                    setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                    sortBy === 'make-asc' ? 'bg-white/10 text-lava-core' : 'text-primary'
                                }`}
                            >
                                Make (alphabetical)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy('model-asc');
                                    setSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                                    sortBy === 'model-asc' ? 'bg-white/10 text-lava-core' : 'text-primary'
                                }`}
                            >
                                Model (alphabetical)
                            </button>
                        </div>
                    )}
                </div>
                <GlassButton size="sm" onClick={handleResetFilters} contentClassName="flex items-center gap-2">
                    <XCircleIcon className="h-5 w-5"/> Reset
                </GlassButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehiclesToDisplay.length > 0 ? vehiclesToDisplay.map(vehicle => (
                    <VehicleCard
                        key={vehicle.id ?? vehicle.vin}
                        vehicle={vehicle}
                        onEdit={() => handleSelectVehicleForEdit(vehicle)}
                        onSold={() => handleSelectVehicleForSale(vehicle)}
                        onTrash={() => startDeleteProcess(vehicle)}
                        onView={() => setViewingVehicle(vehicle)}
                        canEdit={canEditInventory}
                        canMarkSold={canMarkSold}
                        canDelete={canDeleteInventory}
                    />
                )) : (
                        <div className="col-span-full text-center py-16">
                        <h3 className="text-2xl font-semibold text-primary tracking-tight-lg">No Vehicles Found</h3>
                        <p className="text-muted mt-2">Try adjusting your search or filter criteria.</p>
                    </div>
                )}
            </div>

            {/* Infinite Scroll Sentinel */}
            {hasMore && (
                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                    {isLoadingMore && (
                        <div className="flex items-center gap-2 text-muted">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm">Loading more...</span>
                        </div>
                    )}
                </div>
            )}

            {editingVehicle && (
                <EditVehicleModal
                    vehicle={editingVehicle}
                    onClose={() => setEditingVehicle(null)}
                    onSave={handleSaveVehicle}
                    onImagesUpdated={handleVehicleImagesUpdated}
                />
            )}
            {sellingVehicle && canMarkSold && (
                <MarkSoldModal
                    vehicle={sellingVehicle}
                    onClose={() => setSellingVehicle(null)}
                    onConfirm={handleConfirmSold}
                    defaultAccountNumber={defaultAccountNumberForSale}
                    defaultStockNumber={defaultStockNumberForSale}
                    salespeople={salespeople}
                />
            )}
            {isAddingVehicle && canAddInventory && (
                <EditVehicleModal
                    vehicle={blankVehicle}
                    onClose={() => setIsAddingVehicle(false)}
                    onSave={handleAddNewVehicle}
                    isNewVehicle={true}
                    onImagesUpdated={handleVehicleImagesUpdated}
                />
            )}
            {vehicleToDelete && (
                <ConfirmationModal
                    isOpen={!!vehicleToDelete}
                    onClose={() => setVehicleToDelete(null)}
                    onConfirm={confirmDeleteVehicle}
                    title="Delete Vehicle"
                    message={`Are you sure you want to permanently delete the ${vehicleToDelete.year} ${vehicleToDelete.make} ${vehicleToDelete.model} (VIN: ...${vehicleToDelete.vin.slice(-4)}) from inventory? This action cannot be undone.`}
                    confirmButtonText="Delete Vehicle"
                />
            )}
            {viewingVehicle && (
                <VehicleDetailsModal
                    vehicle={viewingVehicle}
                    onClose={() => setViewingVehicle(null)}
                />
            )}

            {/* Mobile Filter Sheet */}
            <InventoryFilterSheet
                isOpen={isFilterSheetOpen}
                onClose={() => setIsFilterSheetOpen(false)}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                sortBy={sortBy}
                onSortChange={setSortBy}
                uniqueBodyStyles={uniqueBodyStyles}
                downPaymentRanges={downPaymentRanges}
            />
        </div>
    );
};

export default Inventory;
