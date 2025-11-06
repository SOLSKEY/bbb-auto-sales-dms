import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

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
            <div className="glass-panel rounded-panel shadow-glass w-full max-w-md transform transition-all border border-border-high">
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
                <div className="bg-glass-panel backdrop-blur-glass px-6 py-4 flex justify-end space-x-4 border-t border-border-low">
                    <button type="button" className="px-4 py-2 rounded-md text-secondary bg-glass-panel hover:bg-glass-panel/80 transition-colors border border-border-low" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors font-semibold" onClick={onConfirm}>
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
