import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { GlassButton } from '@/components/ui/glass-button';

interface DeleteOptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompletelyDelete: () => void;
    onSendToNashville: () => void;
    vehicleInfo: string;
}

const DeleteOptionModal: React.FC<DeleteOptionModalProps> = ({ 
    isOpen, 
    onClose, 
    onCompletelyDelete, 
    onSendToNashville,
    vehicleInfo 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="w-full max-w-md transform transition-all bg-[#1b1f26] border border-border-high rounded-panel shadow-2xl">
                <div className="p-6">
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-900/50 sm:mx-0 sm:h-10 sm:w-10 status-glow">
                            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-4 text-left">
                            <h3 className="text-xl font-bold text-primary font-orbitron tracking-tight-lg" id="modal-title">
                                Delete Vehicle
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-secondary mb-4">
                                    How would you like to delete {vehicleInfo}?
                                </p>
                                <div className="space-y-2">
                                    <p className="text-xs text-muted">
                                        • <strong>Completely Delete:</strong> Permanently remove the vehicle from inventory. This will not appear in the inventory text out.
                                    </p>
                                    <p className="text-xs text-muted">
                                        • <strong>Sent to Nashville:</strong> Delete the vehicle and add it to the "To Nashville" section in the inventory text out.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#151821] px-6 py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 border-t border-border-low rounded-b-panel">
                    <GlassButton type="button" size="sm" onClick={onClose} className="w-full sm:w-auto">
                        Cancel
                    </GlassButton>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                        <GlassButton 
                            type="button" 
                            size="sm" 
                            onClick={onCompletelyDelete}
                            className="w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 border-red-600/50"
                        >
                            Completely Delete
                        </GlassButton>
                        <GlassButton 
                            type="button" 
                            size="sm" 
                            onClick={onSendToNashville}
                            className="w-full sm:w-auto bg-blue-600/20 hover:bg-blue-600/30 border-blue-600/50"
                        >
                            Sent to Nashville
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteOptionModal;





