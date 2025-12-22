import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { GlassButton } from '@/components/ui/glass-button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText = 'Confirm' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="w-full max-w-md transform transition-all bg-[#1b1f26] border border-border-high rounded-panel shadow-2xl">
                <div className="p-6">
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10 status-glow">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-4 text-left">
                            <h3 className="text-xl font-bold text-primary font-orbitron tracking-tight-lg" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-secondary">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#151821] px-6 py-4 flex justify-end space-x-4 border-t border-border-low rounded-b-panel">
                    <GlassButton type="button" size="sm" onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton type="button" size="sm" onClick={onConfirm}>
                        {confirmButtonText}
                    </GlassButton>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
