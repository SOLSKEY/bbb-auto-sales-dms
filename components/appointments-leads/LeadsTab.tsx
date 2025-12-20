import React, { useState, useMemo, useCallback } from 'react';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    PlusIcon,
    PhoneIcon,
    CalendarDaysIcon,
    ClockIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import type { CalendarLead, UserColor, FollowUpLog } from '../../types';
import { LeadModal } from './LeadModal';
import { FollowUpModal } from './FollowUpModal';

interface LeadsTabProps {
    leads: CalendarLead[];
    loading: boolean;
    userColors: Record<string, UserColor>;
    currentUserId: string;
    isAdmin: boolean;
    onCreateLead: (lead: Omit<CalendarLead, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data: CalendarLead | null; error: string | null }>;
    onUpdateLead: (id: string, updates: Partial<CalendarLead>) => Promise<{ data: CalendarLead | null; error: string | null }>;
    onDeleteLead: (id: string) => Promise<{ error: string | null }>;
    onAddFollowUp: (id: string, followUp: FollowUpLog) => Promise<{ data: CalendarLead | null; error: string | null } | { error: string }>;
}

type SortOption = 'newest' | 'oldest' | 'potential_date' | 'alphabetical';
type FilterOption = 'all' | 'was_appointment' | 'new_leads';

export const LeadsTab: React.FC<LeadsTabProps> = ({
    leads,
    loading,
    userColors,
    currentUserId,
    isAdmin,
    onCreateLead,
    onUpdateLead,
    onDeleteLead,
    onAddFollowUp,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    const [modelFilter, setModelFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<CalendarLead | null>(null);

    // Get unique model interests for filter dropdown
    const allModelInterests = useMemo(() => {
        const models = new Set<string>();
        leads.forEach(lead => {
            lead.model_interests?.forEach(model => models.add(model));
        });
        return Array.from(models).sort();
    }, [leads]);

    // Filter and sort leads
    const filteredLeads = useMemo(() => {
        let result = [...leads];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(lead => {
                const searchFields = [
                    lead.customer_name,
                    lead.customer_phone,
                    lead.lead_source,
                    lead.notes,
                    ...(lead.model_interests || []),
                ].filter(Boolean);
                return searchFields.some(field => field?.toLowerCase().includes(query));
            });
        }

        // Type filter
        if (filterBy === 'was_appointment') {
            result = result.filter(lead => lead.was_appointment);
        } else if (filterBy === 'new_leads') {
            result = result.filter(lead => !lead.was_appointment);
        }

        // Model filter
        if (modelFilter) {
            result = result.filter(lead =>
                lead.model_interests?.some(m => m.toLowerCase().includes(modelFilter.toLowerCase()))
            );
        }

        // Sort
        switch (sortBy) {
            case 'newest':
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case 'potential_date':
                result.sort((a, b) => {
                    if (!a.potential_date && !b.potential_date) return 0;
                    if (!a.potential_date) return 1;
                    if (!b.potential_date) return -1;
                    return new Date(a.potential_date).getTime() - new Date(b.potential_date).getTime();
                });
                break;
            case 'alphabetical':
                result.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
                break;
        }

        return result;
    }, [leads, searchQuery, sortBy, filterBy, modelFilter]);

    const handleOpenLeadModal = useCallback((lead?: CalendarLead) => {
        setSelectedLead(lead || null);
        setIsLeadModalOpen(true);
    }, []);

    const handleCloseLeadModal = useCallback(() => {
        setIsLeadModalOpen(false);
        setSelectedLead(null);
    }, []);

    const handleOpenFollowUpModal = useCallback((lead: CalendarLead) => {
        setSelectedLead(lead);
        setIsFollowUpModalOpen(true);
    }, []);

    const handleCloseFollowUpModal = useCallback(() => {
        setIsFollowUpModalOpen(false);
        setSelectedLead(null);
    }, []);

    const handleSaveLead = useCallback(async (
        data: Omit<CalendarLead, 'id' | 'created_at' | 'updated_at'>
    ) => {
        if (selectedLead) {
            await onUpdateLead(selectedLead.id, data);
        } else {
            await onCreateLead(data);
        }
        handleCloseLeadModal();
    }, [selectedLead, onCreateLead, onUpdateLead, handleCloseLeadModal]);

    const handleDeleteLead = useCallback(async () => {
        if (selectedLead) {
            await onDeleteLead(selectedLead.id);
            handleCloseLeadModal();
        }
    }, [selectedLead, onDeleteLead, handleCloseLeadModal]);

    const handleAddFollowUp = useCallback(async (followUp: FollowUpLog) => {
        if (selectedLead) {
            await onAddFollowUp(selectedLead.id, followUp);
            handleCloseFollowUpModal();
        }
    }, [selectedLead, onAddFollowUp, handleCloseFollowUpModal]);

    if (loading) {
        return (
            <div className="liquid-card h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent"></div>
                    <p className="text-white/60">Loading leads...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full gap-4">
                {/* Header Controls */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="liquid-input size-2">
                            <MagnifyingGlassIcon className="w-4 h-4 text-white/40 mr-2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search leads by name, phone, model..."
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="p-1 rounded hover:bg-white/10"
                                >
                                    <XMarkIcon className="w-4 h-4 text-white/40" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Toggle & Add Button */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`liquid-btn size-2 ${showFilters ? 'liquid-cyan' : 'liquid-white'} flex items-center gap-2`}
                        >
                            <FunnelIcon className="w-4 h-4" />
                            Filters
                        </button>
                        <button
                            onClick={() => handleOpenLeadModal()}
                            className="liquid-btn size-2 liquid-cyan flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Add Lead
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="liquid-card p-4 flex flex-wrap gap-4 animate-slide-up">
                        {/* Sort By */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="liquid-select size-1 min-w-[140px]"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="potential_date">Potential Date</option>
                                <option value="alphabetical">Alphabetical</option>
                            </select>
                        </div>

                        {/* Lead Type */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1">Lead Type</label>
                            <select
                                value={filterBy}
                                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                                className="liquid-select size-1 min-w-[160px]"
                            >
                                <option value="all">All Leads</option>
                                <option value="was_appointment">From Appointments</option>
                                <option value="new_leads">New Leads Only</option>
                            </select>
                        </div>

                        {/* Model Interest */}
                        <div>
                            <label className="block text-xs text-white/50 mb-1">Model Interest</label>
                            <select
                                value={modelFilter}
                                onChange={(e) => setModelFilter(e.target.value)}
                                className="liquid-select size-1 min-w-[160px]"
                            >
                                <option value="">All Models</option>
                                {allModelInterests.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters */}
                        {(filterBy !== 'all' || modelFilter || sortBy !== 'newest') && (
                            <button
                                onClick={() => {
                                    setFilterBy('all');
                                    setModelFilter('');
                                    setSortBy('newest');
                                }}
                                className="liquid-btn size-1 liquid-red self-end"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {/* Results Count */}
                <div className="text-sm text-white/50">
                    {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'} found
                </div>

                {/* Leads Grid */}
                <div className="flex-1 overflow-y-auto">
                    {filteredLeads.length === 0 ? (
                        <div className="liquid-card h-64 flex flex-col items-center justify-center text-center">
                            <p className="text-white/60 mb-2">No leads found</p>
                            <p className="text-sm text-white/40">
                                {searchQuery || filterBy !== 'all' || modelFilter
                                    ? 'Try adjusting your search or filters'
                                    : 'Add your first lead to get started'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredLeads.map((lead) => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    userColor={userColors[lead.user_id]?.color}
                                    onClick={() => handleOpenLeadModal(lead)}
                                    onAddFollowUp={() => handleOpenFollowUpModal(lead)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <LeadModal
                isOpen={isLeadModalOpen}
                onClose={handleCloseLeadModal}
                onSave={handleSaveLead}
                onDelete={selectedLead ? handleDeleteLead : undefined}
                lead={selectedLead}
                currentUserId={currentUserId}
            />

            <FollowUpModal
                isOpen={isFollowUpModalOpen}
                onClose={handleCloseFollowUpModal}
                onSave={handleAddFollowUp}
                lead={selectedLead}
            />
        </>
    );
};

// Lead Card Component
interface LeadCardProps {
    lead: CalendarLead;
    userColor?: string;
    onClick: () => void;
    onAddFollowUp: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, userColor, onClick, onAddFollowUp }) => {
    const daysSinceCreated = Math.floor(
        (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const lastFollowUp = lead.follow_ups?.length
        ? lead.follow_ups[lead.follow_ups.length - 1]
        : null;

    return (
        <div
            className={`lead-card cursor-pointer ${lead.was_appointment ? 'was-appointment' : ''}`}
            style={userColor ? {
                '--liquid-r': parseInt(userColor.slice(1, 3), 16),
                '--liquid-g': parseInt(userColor.slice(3, 5), 16),
                '--liquid-b': parseInt(userColor.slice(5, 7), 16),
            } as React.CSSProperties : undefined}
            onClick={onClick}
        >
            {/* Was Appointment Badge */}
            {lead.was_appointment && (
                <div className="absolute top-3 right-3">
                    <span className="liquid-badge size-1 liquid-yellow">
                        Was Appointment
                    </span>
                </div>
            )}

            {/* Customer Info */}
            <div className="mb-3">
                <h3 className="text-lg font-semibold text-white truncate">
                    {lead.customer_name || 'Unknown Customer'}
                </h3>
                {lead.customer_phone && (
                    <a
                        href={`tel:${lead.customer_phone.replace(/\D/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300"
                    >
                        <PhoneIcon className="w-3.5 h-3.5" />
                        {lead.customer_phone}
                    </a>
                )}
            </div>

            {/* Model Interests */}
            {lead.model_interests && lead.model_interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {lead.model_interests.map((model) => (
                        <span key={model} className="model-tag">
                            {model}
                        </span>
                    ))}
                </div>
            )}

            {/* Budget */}
            {lead.down_payment_budget && (
                <div className="text-sm text-white/70 mb-2">
                    Budget: <span className="text-green-400 font-medium">${lead.down_payment_budget.toLocaleString()}</span>
                </div>
            )}

            {/* Source */}
            {lead.lead_source && (
                <div className="text-xs text-white/50 mb-3">
                    Source: {lead.lead_source}
                </div>
            )}

            {/* Footer Info */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/40">
                <div className="flex items-center gap-3">
                    {/* Days since created */}
                    <div className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {daysSinceCreated === 0 ? 'Today' : `${daysSinceCreated}d ago`}
                    </div>

                    {/* Potential date */}
                    {lead.potential_date && (
                        <div className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            {format(new Date(lead.potential_date), 'MMM d')}
                        </div>
                    )}
                </div>

                {/* Follow-up count */}
                {lead.follow_ups && lead.follow_ups.length > 0 && (
                    <div className="text-cyan-400">
                        {lead.follow_ups.length} follow-up{lead.follow_ups.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Last Follow-up */}
            {lastFollowUp && (
                <div className="mt-2 pt-2 border-t border-white/5 text-xs text-white/40">
                    Last contact: {formatDistanceToNow(new Date(lastFollowUp.date), { addSuffix: true })}
                </div>
            )}

            {/* Quick Add Follow-up */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAddFollowUp();
                }}
                className="mt-3 w-full liquid-btn size-1 liquid-cyan"
            >
                Add Follow-up
            </button>
        </div>
    );
};
