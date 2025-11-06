import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="glass-panel rounded-panel shadow-glass w-full max-w-md transform transition-all border border-border-high">
                <div className="p-6">
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-900/50 sm:mx-0 sm:h-10 sm:w-10 status-glow">
                            <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
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
                <div className="bg-glass-panel backdrop-blur-glass px-6 py-4 flex justify-end border-t border-border-low">
                    <button type="button" className="btn-lava" onClick={onClose}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
