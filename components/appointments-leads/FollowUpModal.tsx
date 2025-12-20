import React, { useState } from 'react';
import { XMarkIcon, PhoneIcon, ChatBubbleLeftIcon, EnvelopeIcon, UserIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import type { CalendarLead, FollowUpLog, FollowUpMethod, FollowUpOutcome } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';
import { useDeviceType } from '../../hooks/useDeviceType';

interface FollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (followUp: FollowUpLog) => Promise<void>;
    lead: CalendarLead | null;
}

const FOLLOW_UP_METHODS: { value: FollowUpMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'call', label: 'Phone Call', icon: <PhoneIcon className="w-5 h-5" /> },
    { value: 'text', label: 'Text Message', icon: <ChatBubbleLeftIcon className="w-5 h-5" /> },
    { value: 'email', label: 'Email', icon: <EnvelopeIcon className="w-5 h-5" /> },
    { value: 'in_person', label: 'In Person', icon: <UserIcon className="w-5 h-5" /> },
];

const FOLLOW_UP_OUTCOMES: { value: FollowUpOutcome; label: string; color: string }[] = [
    { value: 'no_answer', label: 'No Answer', color: 'liquid-white' },
    { value: 'spoke_not_ready', label: 'Spoke - Not Ready', color: 'liquid-yellow' },
    { value: 'spoke_interested', label: 'Spoke - Interested', color: 'liquid-cyan' },
    { value: 'scheduled_appointment', label: 'Scheduled Appointment', color: 'liquid-green' },
    { value: 'not_interested', label: 'Not Interested', color: 'liquid-red' },
];

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
    isOpen,
    onClose,
    onSave,
    lead,
}) => {
    const { isMobile } = useDeviceType();
    const [method, setMethod] = useState<FollowUpMethod>('call');
    const [outcome, setOutcome] = useState<FollowUpOutcome>('no_answer');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!lead) return;

        setSaving(true);
        try {
            const followUp: FollowUpLog = {
                date: new Date(date).toISOString(),
                method,
                outcome,
                notes: notes || undefined,
            };
            await onSave(followUp);
            // Reset form
            setMethod('call');
            setOutcome('no_answer');
            setNotes('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
        } finally {
            setSaving(false);
        }
    };

    const modalContent = (
        <div className="space-y-6">
            {/* Lead Info Header */}
            {lead && (
                <div className="liquid-callout liquid-cyan">
                    <div>
                        <p className="text-sm font-medium text-white">
                            {lead.customer_name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-white/60">
                            {lead.customer_phone || 'No phone'} • {lead.follow_ups?.length || 0} previous follow-ups
                        </p>
                    </div>
                </div>
            )}

            {/* Date */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Date</label>
                <div className="liquid-input size-2">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="[color-scheme:dark]"
                    />
                </div>
            </div>

            {/* Method Selection */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Contact Method</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {FOLLOW_UP_METHODS.map((m) => (
                        <button
                            key={m.value}
                            type="button"
                            onClick={() => setMethod(m.value)}
                            className={`
                                p-3 rounded-xl flex flex-col items-center gap-2 transition-all
                                ${method === m.value
                                    ? 'liquid-surface liquid-cyan'
                                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                }
                            `}
                        >
                            <span className={method === m.value ? 'text-cyan-400' : 'text-white/60'}>
                                {m.icon}
                            </span>
                            <span className={`text-xs font-medium ${method === m.value ? 'text-white' : 'text-white/60'}`}>
                                {m.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Outcome Selection */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Outcome</label>
                <div className="flex flex-wrap gap-2">
                    {FOLLOW_UP_OUTCOMES.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => setOutcome(o.value)}
                            className={`
                                liquid-badge size-2 cursor-pointer transition-all
                                ${outcome === o.value ? o.color : 'liquid-white opacity-40'}
                            `}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Notes (Optional)</label>
                <div className="liquid-input" style={{ height: 'auto', padding: '12px' }}>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What did you discuss? Any important details..."
                        rows={3}
                        className="w-full resize-none"
                    />
                </div>
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
                    onClick={handleSave}
                    disabled={saving}
                    className="liquid-btn size-3 liquid-cyan"
                >
                    {saving ? 'Saving...' : 'Log Follow-Up'}
                </button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <BottomSheet
                isOpen={isOpen}
                onClose={onClose}
                title="Log Follow-Up"
                size="lg"
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
                    <h2 className="text-xl font-semibold text-white">Log Follow-Up</h2>
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
