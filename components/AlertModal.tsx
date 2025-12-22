import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { GlassButton } from '@/components/ui/glass-button';

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
            <div className="w-full max-w-md transform transition-all bg-[#1b1f26] border border-border-high rounded-panel shadow-2xl">
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
                <div className="bg-[#151821] px-6 py-4 flex justify-end border-t border-border-low rounded-b-panel">
                    <GlassButton type="button" onClick={onClose}>
                        OK
                    </GlassButton>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
