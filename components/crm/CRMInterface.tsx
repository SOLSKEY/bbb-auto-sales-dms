'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MessageSquare,
  Send,
  Plus,
  Facebook,
  MessageCircle,
  Globe,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Car,
  Phone,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// Types
interface CRMLead {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  vehicle: string | null;
  budget: number | null;
  source: 'website' | 'facebook_business' | 'marketplace' | 'whatsapp' | 'manual';
  status: 'new' | 'contacted' | 'qualified' | 'sold' | 'lost';
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

interface CRMMessage {
  id: string;
  lead_id: string;
  sender: 'me' | 'lead';
  content: string;
  created_at: string;
}

interface CRMInterfaceProps {
  supabase: SupabaseClient;
  userId: string;
}

const CRMInterface: React.FC<CRMInterfaceProps> = ({ supabase, userId }) => {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CRMMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // New lead form state
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    vehicle: '',
    budget: '',
    source: 'website' as 'website' | 'facebook_business' | 'marketplace' | 'whatsapp' | 'manual',
  });

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setLeads(data as CRMLead[]);
        // Auto-select first lead if none selected
        if (!activeLeadId && data.length > 0) {
          setActiveLeadId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, activeLeadId]);

  // Fetch messages for active lead
  const fetchMessages = useCallback(async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('crm_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages(data as CRMMessage[]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [supabase]);

  // Setup realtime subscriptions
  useEffect(() => {
    const leadsChannel = supabase
      .channel('crm-leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new as CRMLead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((lead) =>
                lead.id === payload.new.id ? (payload.new as CRMLead) : lead
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
            if (activeLeadId === payload.old.id) {
              setActiveLeadId(null);
            }
          }
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('crm-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_messages',
        },
        (payload) => {
          const newMessage = payload.new as CRMMessage;
          if (newMessage.lead_id === activeLeadId) {
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [supabase, userId, activeLeadId]);

  // Initial data fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Fetch messages when active lead changes
  useEffect(() => {
    if (activeLeadId) {
      fetchMessages(activeLeadId);
    } else {
      setMessages([]);
    }
  }, [activeLeadId, fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!activeLeadId || !messageInput.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { data, error } = await supabase
        .from('crm_messages')
        .insert({
          lead_id: activeLeadId,
          sender: 'me',
          content: messageInput.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update lead's last_message
      await supabase
        .from('crm_leads')
        .update({
          last_message: messageInput.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeLeadId);

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: CRMLead['status']) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Add new lead
  const handleAddLead = async () => {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      alert('Name and Phone are required.');
      return;
    }

    // Ensure source is a valid value
    const validSource = ['website', 'facebook_business', 'marketplace', 'whatsapp', 'manual'].includes(newLead.source)
      ? newLead.source
      : 'website';

    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .insert({
          user_id: userId,
          name: newLead.name.trim(),
          phone: newLead.phone.trim(),
          vehicle: newLead.vehicle.trim() || null,
          budget: newLead.budget ? parseFloat(newLead.budget) : null,
          source: validSource,
          status: 'new',
          sentiment: null,
        })
        .select()
        .single();

      if (error) throw error;

      setShowAddLeadModal(false);
      setNewLead({
        name: '',
        phone: '',
        vehicle: '',
        budget: '',
        source: 'website',
      });
      setActiveLeadId(data.id);
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('Failed to add lead. Please try again.');
    }
  };

  // Get source icon
  const getSourceIcon = (source: CRMLead['source']) => {
    switch (source) {
      case 'facebook_business':
      case 'marketplace':
        return <Facebook className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4" />;
      case 'website':
        return <Globe className="w-4 h-4" />;
      case 'manual':
        return <User className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: CRMLead['status']) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1';
    switch (status) {
      case 'new':
        return (
          <span className={`${baseClasses} bg-cyan-500/20 text-cyan-300 border border-cyan-500/30`}>
            <Clock className="w-3 h-3" />
            New
          </span>
        );
      case 'contacted':
        return (
          <span className={`${baseClasses} bg-violet-500/20 text-violet-300 border border-violet-500/30`}>
            <MessageSquare className="w-3 h-3" />
            Contacted
          </span>
        );
      case 'qualified':
        return (
          <span className={`${baseClasses} bg-purple-500/20 text-purple-300 border border-purple-500/30`}>
            <CheckCircle2 className="w-3 h-3" />
            Qualified
          </span>
        );
      case 'sold':
        return (
          <span className={`${baseClasses} bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`}>
            <CheckCircle2 className="w-3 h-3" />
            Sold
          </span>
        );
      case 'lost':
        return (
          <span className={`${baseClasses} bg-red-500/20 text-red-300 border border-red-500/30`}>
            <XCircle className="w-3 h-3" />
            Lost
          </span>
        );
    }
  };

  // Get sentiment icon
  const getSentimentIcon = (sentiment: CRMLead['sentiment'] | null) => {
    if (!sentiment) return null;
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'neutral':
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const activeLead = leads.find((lead) => lead.id === activeLeadId);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar - Leads List */}
      <div className="w-80 border-r border-white/5 bg-slate-900/40 backdrop-blur-xl flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              CRM Leads
            </h2>
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition-colors"
              title="Add Lead"
            >
              <Plus className="w-5 h-5 text-purple-300" />
            </button>
          </div>
        </div>

        {/* Leads List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-slate-400 text-center">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-4 text-slate-400 text-center">
              <p className="mb-2">No leads yet</p>
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Add your first lead
              </button>
            </div>
          ) : (
            leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setActiveLeadId(lead.id)}
                className={`w-full p-4 border-b border-white/5 text-left transition-all ${
                  activeLeadId === lead.id
                    ? 'bg-purple-500/10 border-l-4 border-l-purple-500'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="text-purple-300">{getSourceIcon(lead.source)}</div>
                    <span className="font-semibold truncate">{lead.name}</span>
                  </div>
                  {getSentimentIcon(lead.sentiment)}
                </div>
                <div className="flex items-center gap-2 mb-2">{getStatusBadge(lead.status)}</div>
                {lead.last_message && (
                  <p className="text-xs text-slate-400 truncate">{lead.last_message}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeLead ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">{activeLead.name}</h3>
                    {getStatusBadge(activeLead.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                    {activeLead.vehicle && (
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        <span>{activeLead.vehicle}</span>
                      </div>
                    )}
                    {activeLead.budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>${activeLead.budget.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{activeLead.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={activeLead.status}
                    onChange={(e) => handleUpdateStatus(activeLead.id, e.target.value as CRMLead['status'])}
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="sold">Sold</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950"
            >
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 mt-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.sender === 'me'
                          ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30'
                          : 'bg-slate-800/50 border border-white/10'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/5 bg-slate-900/40 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  disabled={sendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a lead to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Add New Lead
              </h3>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle</label>
                <input
                  type="text"
                  value={newLead.vehicle}
                  onChange={(e) => setNewLead({ ...newLead, vehicle: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="2024 Toyota Camry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Budget</label>
                <input
                  type="number"
                  value={newLead.budget}
                  onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="25000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) =>
                    setNewLead({ ...newLead, source: e.target.value as 'website' | 'facebook_business' | 'marketplace' | 'whatsapp' | 'manual' })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="website">Website</option>
                  <option value="facebook_business">Facebook Business</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddLeadModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 transition-all"
                >
                  Add Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMInterface;

