import React, { useState } from 'react';
import { XMarkIcon, ArchiveBoxIcon, CalendarIcon, UserMinusIcon, TruckIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import type { CalendarAppointment, ArchiveReason } from '../../types';
import { format } from 'date-fns';
import { BottomSheet } from '../ui/BottomSheet';
import { useDeviceType } from '../../hooks/useDeviceType';

interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: ArchiveReason) => Promise<void>;
    appointment: CalendarAppointment | null;
}

const ARCHIVE_REASONS: { value: ArchiveReason; label: string; description: string; icon: React.ReactNode }[] = [
    {
        value: 'no_show',
        label: 'No-Show',
        description: 'Customer did not show up for appointment',
        icon: <UserMinusIcon className="w-6 h-6" />,
    },
    {
        value: 'cancelled',
        label: 'Cancelled',
        description: 'Customer cancelled the appointment',
        icon: <NoSymbolIcon className="w-6 h-6" />,
    },
    {
        value: 'vehicle_sold',
        label: 'Vehicle Sold',
        description: 'The vehicle they wanted was already sold',
        icon: <TruckIcon className="w-6 h-6" />,
    },
    {
        value: 'not_ready',
        label: 'Not Ready',
        description: 'Customer is not ready to buy yet',
        icon: <CalendarIcon className="w-6 h-6" />,
    },
];

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    appointment,
}) => {
    const { isMobile } = useDeviceType();
    const [selectedReason, setSelectedReason] = useState<ArchiveReason | null>(null);
    const [archiving, setArchiving] = useState(false);

    const handleConfirm = async () => {
        if (!selectedReason) return;

        setArchiving(true);
        try {
            await onConfirm(selectedReason);
            setSelectedReason(null);
        } finally {
            setArchiving(false);
        }
    };

    const modalContent = (
        <div className="space-y-6">
            {/* Appointment Info */}
            {appointment && (
                <div className="liquid-callout liquid-yellow">
                    <ArchiveBoxIcon className="w-5 h-5 callout-icon" />
                    <div>
                        <p className="text-sm font-medium text-white">
                            {appointment.customer_name || appointment.title || 'Appointment'}
                        </p>
                        <p className="text-xs text-white/60">
                            {format(new Date(appointment.appointment_time), 'MMMM d, yyyy \'at\' h:mm a')}
                        </p>
                    </div>
                </div>
            )}

            <p className="text-white/70 text-sm">
                This appointment will be moved to Leads so you can follow up later.
                Select a reason for archiving:
            </p>

            {/* Reason Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ARCHIVE_REASONS.map((reason) => (
                    <button
                        key={reason.value}
                        type="button"
                        onClick={() => setSelectedReason(reason.value)}
                        className={`
                            p-4 rounded-xl text-left transition-all border
                            ${selectedReason === reason.value
                                ? 'liquid-surface liquid-yellow border-amber-500/60'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }
                        `}
                    >
                        <div className="flex items-start gap-3">
                            <span className={selectedReason === reason.value ? 'text-amber-400' : 'text-white/40'}>
                                {reason.icon}
                            </span>
                            <div>
                                <p className={`font-medium ${selectedReason === reason.value ? 'text-white' : 'text-white/80'}`}>
                                    {reason.label}
                                </p>
                                <p className="text-xs text-white/50 mt-0.5">
                                    {reason.description}
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onClose}
                    className="liquid-btn size-2 liquid-white"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selectedReason || archiving}
                    className="liquid-btn size-3 liquid-yellow disabled:opacity-50"
                >
                    {archiving ? 'Archiving...' : 'Archive to Leads'}
                </button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <BottomSheet
                isOpen={isOpen}
                onClose={onClose}
                title="Archive to Leads"
                size="md"
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
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto liquid-card animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Archive to Leads</h2>
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
