import { FunnelIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { BottomSheet } from './ui/BottomSheet';
import AppSelect from './AppSelect';
import { GlassButton } from './ui/glass-button';

interface InventoryFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    status: string;
    bodyStyle: string;
    downPayment: string;
  };
  onFilterChange: (input: { name: string; value: string }) => void;
  onReset: () => void;
  statusOptions: { value: string; label: string }[];
  bodyStyleOptions: { value: string; label: string }[];
  downPaymentOptions: { value: string; label: string }[];
  sortBy: string;
  onSortChange: (value: string) => void;
}

const SORT_OPTIONS = [
  { value: 'dateAdded-desc', label: 'Date added (newest)' },
  { value: 'downPayment-asc', label: 'Down Payment (low to high)' },
  { value: 'downPayment-desc', label: 'Down Payment (high to low)' },
  { value: 'price-asc', label: 'Price (low to high)' },
  { value: 'price-desc', label: 'Price (high to low)' },
  { value: 'make-asc', label: 'Make (A-Z)' },
  { value: 'model-asc', label: 'Model (A-Z)' },
];

export function InventoryFilterSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  statusOptions,
  bodyStyleOptions,
  downPaymentOptions,
  sortBy,
  onSortChange,
}: InventoryFilterSheetProps) {
  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Filters & Sort">
      <div className="p-6 space-y-6">
        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Sort By
          </label>
          <AppSelect
            value={sortBy}
            onChange={(value) => onSortChange(value)}
            options={SORT_OPTIONS}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Status
          </label>
          <AppSelect
            value={filters.status}
            onChange={(value) => onFilterChange({ name: 'status', value })}
            options={statusOptions}
          />
        </div>

        {/* Body Style Filter */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Body Style
          </label>
          <AppSelect
            value={filters.bodyStyle}
            onChange={(value) => onFilterChange({ name: 'bodyStyle', value })}
            options={bodyStyleOptions}
          />
        </div>

        {/* Down Payment Filter */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Down Payment Range
          </label>
          <AppSelect
            value={filters.downPayment}
            onChange={(value) => onFilterChange({ name: 'downPayment', value })}
            options={downPaymentOptions}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <GlassButton
            onClick={handleReset}
            className="flex-1"
            contentClassName="flex items-center justify-center gap-2"
          >
            <XCircleIcon className="h-5 w-5" />
            Reset All
          </GlassButton>
          <GlassButton
            onClick={onClose}
            className="flex-1"
            contentClassName="flex items-center justify-center gap-2"
          >
            <FunnelIcon className="h-5 w-5" />
            Apply
          </GlassButton>
        </div>
      </div>
    </BottomSheet>
  );
}
