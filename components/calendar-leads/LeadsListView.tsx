import React, { useState, useMemo } from 'react';
import { UserGroupIcon, FunnelIcon, PhoneIcon } from '@heroicons/react/24/solid';
import type { Lead, LeadPriority } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';

interface LeadsListViewProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
    getUserColor: (userId: string | null) => string;
    loading?: boolean;
}

const PRIORITY_COLORS: Record<LeadPriority, string> = {
    hot: 'priority-hot',
    warm: 'priority-warm',
    cold: 'priority-cold',
};

const PRIORITY_LABELS: Record<LeadPriority, string> = {
    hot: 'Hot',
    warm: 'Warm',
    cold: 'Cold',
};

type FilterType = 'all' | LeadPriority;
type SortType = 'newest' | 'oldest' | 'priority' | 'name';

const LeadsListView: React.FC<LeadsListViewProps> = ({
    leads,
    onLeadClick,
    getUserColor,
    loading = false,
}) => {
    const [filter, setFilter] = useState<FilterType>('all');
    const [sort, setSort] = useState<SortType>('newest');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter and sort leads
    const filteredAndSortedLeads = useMemo(() => {
        let result = [...leads];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(lead =>
                lead.customer_name?.toLowerCase().includes(query) ||
                lead.customer_phone?.includes(query) ||
                lead.lead_source?.toLowerCase().includes(query) ||
                lead.notes?.toLowerCase().includes(query) ||
                lead.model_interests?.some(model => model.toLowerCase().includes(query))
            );
        }

        // Apply priority filter
        if (filter !== 'all') {
            result = result.filter(lead => lead.priority === filter);
        }

        // Apply sorting
        result.sort((a, b) => {
            switch (sort) {
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'priority':
                    const priorityOrder: Record<LeadPriority, number> = { hot: 0, warm: 1, cold: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                case 'name':
                    return (a.customer_name || '').localeCompare(b.customer_name || '');
                default:
                    return 0;
            }
        });

        return result;
    }, [leads, filter, sort, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        return {
            total: leads.length,
            hot: leads.filter(l => l.priority === 'hot').length,
            warm: leads.filter(l => l.priority === 'warm').length,
            cold: leads.filter(l => l.priority === 'cold').length,
        };
    }, [leads]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="liquid-card liquid-cyan p-3">
                    <div className="text-sm text-slate-400">Total Leads</div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                </div>
                <div className="liquid-card liquid-red p-3">
                    <div className="text-sm text-slate-400">Hot</div>
                    <div className="text-2xl font-bold text-white">{stats.hot}</div>
                </div>
                <div className="liquid-card liquid-amber p-3">
                    <div className="text-sm text-slate-400">Warm</div>
                    <div className="text-2xl font-bold text-white">{stats.warm}</div>
                </div>
                <div className="liquid-card liquid-blue p-3">
                    <div className="text-sm text-slate-400">Cold</div>
                    <div className="text-2xl font-bold text-white">{stats.cold}</div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search leads by name, phone, source, or notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full liquid-input"
                    />
                </div>

                {/* Priority Filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`liquid-btn size-2 ${filter === 'all' ? 'liquid-amber' : 'liquid-white'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('hot')}
                        className={`liquid-btn size-2 ${filter === 'hot' ? 'liquid-red' : 'liquid-white'}`}
                    >
                        Hot
                    </button>
                    <button
                        onClick={() => setFilter('warm')}
                        className={`liquid-btn size-2 ${filter === 'warm' ? 'liquid-amber' : 'liquid-white'}`}
                    >
                        Warm
                    </button>
                    <button
                        onClick={() => setFilter('cold')}
                        className={`liquid-btn size-2 ${filter === 'cold' ? 'liquid-blue' : 'liquid-white'}`}
                    >
                        Cold
                    </button>
                </div>

                {/* Sort */}
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortType)}
                    className="liquid-input"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">Priority</option>
                    <option value="name">Name</option>
                </select>
            </div>

            {/* Leads List */}
            {filteredAndSortedLeads.length === 0 ? (
                <div className="liquid-card p-12 text-center">
                    <UserGroupIcon className="h-16 w-16 mx-auto mb-4 text-slate-500 opacity-50" />
                    <p className="text-slate-400 text-lg mb-2">
                        {searchQuery || filter !== 'all' ? 'No leads match your filters' : 'No leads yet'}
                    </p>
                    {searchQuery || filter !== 'all' ? (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setFilter('all');
                            }}
                            className="liquid-btn size-2 liquid-amber mt-4"
                        >
                            Clear Filters
                        </button>
                    ) : null}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAndSortedLeads.map((lead) => {
                        const userColor = getUserColor(lead.user_id);
                        const lastFollowUp = lead.follow_ups && lead.follow_ups.length > 0
                            ? lead.follow_ups[lead.follow_ups.length - 1]
                            : null;

                        return (
                            <div
                                key={lead.id}
                                onClick={() => onLeadClick(lead)}
                                className="liquid-card p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                style={{
                                    borderLeft: `4px solid ${userColor}`,
                                }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-white truncate">
                                                {lead.customer_name || 'Unnamed Lead'}
                                            </h3>
                                            <span className={`liquid-badge size-1 ${PRIORITY_COLORS[lead.priority]}`}>
                                                {PRIORITY_LABELS[lead.priority]}
                                            </span>
                                            {lead.was_appointment && (
                                                <span className="liquid-badge size-1 liquid-purple">
                                                    From Appointment
                                                </span>
                                            )}
                                        </div>

                                        {/* Contact Info */}
                                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                                            {lead.customer_phone && (
                                                <div className="flex items-center gap-1">
                                                    <PhoneIcon className="h-4 w-4" />
                                                    <span>{lead.customer_phone}</span>
                                                </div>
                                            )}
                                            {lead.lead_source && (
                                                <span className="text-slate-500">
                                                    Source: {lead.lead_source}
                                                </span>
                                            )}
                                        </div>

                                        {/* Model Interests */}
                                        {lead.model_interests && lead.model_interests.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {lead.model_interests.map((model, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="model-tag text-xs"
                                                    >
                                                        {model}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Notes Preview */}
                                        {lead.notes && (
                                            <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                                                {lead.notes}
                                            </p>
                                        )}

                                        {/* Budget */}
                                        {lead.down_payment_budget && (
                                            <div className="text-sm text-slate-400 mb-2">
                                                Budget: ${lead.down_payment_budget.toLocaleString()}
                                            </div>
                                        )}

                                        {/* Potential Date */}
                                        {lead.potential_date && (
                                            <div className="text-sm text-slate-400 mb-2">
                                                Potential Date: {format(new Date(lead.potential_date), 'MMM d, yyyy')}
                                            </div>
                                        )}

                                        {/* Last Follow Up */}
                                        {lastFollowUp && (
                                            <div className="text-xs text-slate-500 mt-2">
                                                Last follow-up: {format(new Date(lastFollowUp.date), 'MMM d')} - {lastFollowUp.outcome.replace('_', ' ')}
                                            </div>
                                        )}

                                        {/* Follow Ups Count */}
                                        {lead.follow_ups && lead.follow_ups.length > 0 && (
                                            <div className="text-xs text-slate-500">
                                                {lead.follow_ups.length} follow-up{lead.follow_ups.length !== 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata */}
                                    <div className="text-right text-xs text-slate-500 flex-shrink-0">
                                        <div>
                                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                                        </div>
                                        {lead.updated_at !== lead.created_at && (
                                            <div className="mt-1">
                                                Updated {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LeadsListView;

