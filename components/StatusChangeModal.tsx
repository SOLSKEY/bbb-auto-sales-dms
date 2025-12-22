import React from 'react';
import { XMarkIcon, ClipboardDocumentCheckIcon, BeakerIcon } from '@heroicons/react/24/solid';
import { GlassButton } from '@/components/ui/glass-button';

interface StatusChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOfficial: () => void;
    onTesting: () => void;
    previousStatus: string;
    newStatus: string;
}

const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
    isOpen,
    onClose,
    onOfficial,
    onTesting,
    previousStatus,
    newStatus,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-[#1a1d21] rounded-lg shadow-2xl w-full max-w-md border border-border-high">
                <div className="flex justify-between items-center p-4 border-b border-border-low">
                    <h3 className="text-xl font-bold text-primary font-orbitron tracking-tight-lg">
                        Status Change Confirmation
                    </h3>
                    <GlassButton size="icon" onClick={onClose}>
                        <XMarkIcon className="h-6 w-6" />
                    </GlassButton>
                </div>

                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-sm text-muted mb-2">Changing status from:</p>
                        <p className="text-lg font-semibold text-primary">{previousStatus}</p>
                        <p className="text-sm text-muted mb-2 mt-4">To:</p>
                        <p className="text-lg font-semibold text-lava-core">{newStatus}</p>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-secondary mb-4">
                            Is this an <strong className="text-primary">Official Update</strong> or just <strong className="text-primary">Testing</strong>?
                        </p>
                        <div className="space-y-2 text-xs text-muted">
                            <p><strong className="text-primary">Official:</strong> This change will be logged in the status history and included in nightly reports.</p>
                            <p><strong className="text-primary">Testing:</strong> This change will update the vehicle status but will NOT be logged or appear in reports.</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex justify-end space-x-3 border-t border-border-low">
                    <GlassButton onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton
                        onClick={onTesting}
                        className="bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40"
                        contentClassName="flex items-center gap-2"
                    >
                        <BeakerIcon className="h-4 w-4" />
                        Testing
                    </GlassButton>
                    <GlassButton
                        onClick={onOfficial}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40"
                        contentClassName="flex items-center gap-2"
                    >
                        <ClipboardDocumentCheckIcon className="h-4 w-4" />
                        Official
                    </GlassButton>
                </div>
            </div>
        </div>
    );
};

export default StatusChangeModal;

