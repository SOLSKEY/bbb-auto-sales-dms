import React, { useState, useRef, useEffect, useContext, useMemo, useCallback } from 'react';
import { CHAT_MESSAGES } from '../constants';
import type { ChatMessage } from '../types';
import { PaperAirplaneIcon, MagnifyingGlassIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { queryAI } from '../services/geminiService';
import { DataContext, UserContext } from '../App';
import { GlassButton } from '@/components/ui/glass-button';
import { supabase } from '../supabaseClient';

const LOCAL_STORAGE_KEY = 'bbb-team-chat-messages';

const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
};

const TeamChat: React.FC = () => {
    const userContext = useContext(UserContext);
    const dataContext = useContext(DataContext);
    const currentUserId = userContext?.user.id ?? 'anonymous';

    const [currentUserName, setCurrentUserName] = useState<string>(userContext?.user.name ?? 'Dealer User');
    const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
    const [input, setInput] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [useLocalStore, setUseLocalStore] = useState(false);

    // Load current user's username from user_metadata
    useEffect(() => {
        const loadUsername = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) throw error;
                if (user) {
                    const username = user.user_metadata?.username ?? user.email ?? 'Dealer User';
                    setCurrentUserName(username);
                }
            } catch (error) {
                console.error('Error loading username:', error);
            }
        };
        loadUsername();
    }, []);

    const mapRowToMessage = useCallback(
        (row: any): ChatMessage => ({
            id: String(row.id ?? row.created_at ?? Date.now()),
            sender: row.sender ?? 'Unknown',
            senderId: row.sender_id ?? row.senderId,
            isAI: Boolean(row.is_ai ?? row.isAI),
            message: row.message ?? '',
            timestamp: row.created_at ?? row.timestamp ?? new Date().toISOString(),
        }),
        [],
    );

    const loadLocalMessages = useCallback((): ChatMessage[] => {
        if (typeof window === 'undefined') return CHAT_MESSAGES;
        try {
            const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!raw) return CHAT_MESSAGES;
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : CHAT_MESSAGES;
        } catch (error) {
            console.warn('Failed to parse cached chat history', error);
            return CHAT_MESSAGES;
        }
    }, []);

    const saveLocalMessages = useCallback((data: ChatMessage[]) => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to persist chat history locally', error);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        if (useLocalStore) {
            const offlineMessages = loadLocalMessages();
            if (isMounted) {
                setMessages(offlineMessages);
                setHistoryLoading(false);
                setHistoryError(null);
            }
            return () => {
                isMounted = false;
                if (channel) supabase.removeChannel(channel);
            };
        }

        const fetchHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('TeamChatMessages')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (!isMounted) return;

                if (error) {
                    console.error('Failed to load chat history', error);
                    setHistoryError('Unable to load chat history. Switching to offline mode.');
                    setUseLocalStore(true);
                    const fallbackMessages = loadLocalMessages();
                    setMessages(fallbackMessages);
                    return;
                }

                if (data) {
                    const normalized = data.map(mapRowToMessage);
                    setMessages(normalized);
                    saveLocalMessages(normalized);
                    setHistoryError(null);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Unexpected error loading chat history', err);
                setHistoryError('Unable to load chat history. Switching to offline mode.');
                setUseLocalStore(true);
                const fallbackMessages = loadLocalMessages();
                setMessages(fallbackMessages);
                return;
            } finally {
                if (isMounted) {
                    setHistoryLoading(false);
                }
            }
        };

        fetchHistory();

        channel = supabase
            .channel('team-chat-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'TeamChatMessages' }, payload => {
                const incoming = mapRowToMessage(payload.new);
                setMessages(prev => {
                    if (prev.some(msg => msg.id === incoming.id)) return prev;
                    const next = [...prev, incoming];
                    saveLocalMessages(next);
                    return next;
                });
            })
            .subscribe();

        return () => {
            isMounted = false;
            if (channel) supabase.removeChannel(channel);
        };
    }, [mapRowToMessage, useLocalStore, loadLocalMessages, saveLocalMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const persistMessage = useCallback(
        async (content: string, sender: string, senderId?: string, isAI = false) => {
            const buildLocalMessage = (): ChatMessage => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sender,
                senderId,
                isAI,
                message: content,
                timestamp: new Date().toISOString(),
            });

            const appendMessage = (message: ChatMessage) => {
                setMessages(prev => {
                    const next = [...prev, message];
                    saveLocalMessages(next);
                    return next;
                });
                return message;
            };

            if (useLocalStore) {
                return appendMessage(buildLocalMessage());
            }

            try {
                const payload = {
                    sender,
                    message: content,
                    is_ai: isAI,
                    sender_id: senderId ?? null,
                };
                const { data, error } = await supabase.from('TeamChatMessages').insert(payload).select('*').single();
                if (error) {
                    throw error;
                }
                const normalized = mapRowToMessage(data);
                return appendMessage(normalized);
            } catch (error) {
                console.error('Falling back to offline chat store', error);
                setUseLocalStore(true);
                setHistoryError('Realtime chat unavailable. Messages are stored locally.');
                return appendMessage(buildLocalMessage());
            }
        },
        [mapRowToMessage, saveLocalMessages, useLocalStore],
    );

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        const isAiPrompt = trimmed.toLowerCase().startsWith('@ai');
        setInput('');
        setHistoryError(null);

        try {
            await persistMessage(trimmed, currentUserName, currentUserId, false);

            if (isAiPrompt) {
                if (!dataContext) {
                    await persistMessage('AI assistant is still initializing. Please try again shortly.', 'System', 'system', true);
                    return;
                }
                const question = trimmed.substring(3).trim() || 'Provide an operational update.';
                setIsLoadingAI(true);
                const aiResponseText = await queryAI(question, dataContext.inventory, dataContext.sales);
                await persistMessage(aiResponseText, 'AI Assistant', 'ai', true);
            }
        } catch (error) {
            console.error('Failed to send chat message', error);
            setHistoryError('Failed to send message. Please try again.');
        } finally {
            if (isAiPrompt) {
                setIsLoadingAI(false);
            }
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const filteredMessages = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return messages.filter(msg => {
            const matchesSearch = term
                ? msg.message.toLowerCase().includes(term) || msg.sender.toLowerCase().includes(term)
                : true;
            const matchesDate = selectedDate
                ? new Date(msg.timestamp).toISOString().slice(0, 10) === selectedDate
                : true;
            return matchesSearch && matchesDate;
        });
    }, [messages, searchTerm, selectedDate]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedDate('');
    };

    const isOwnMessage = (msg: ChatMessage) => {
        if (msg.isAI) return false;
        if (msg.senderId && msg.senderId === currentUserId) return true;
        return msg.sender === currentUserName;
    };

    return (
        <div className="flex flex-col h-full apple-glass overflow-hidden">
            <div className="apple-glass-texture" />
            <div className="border-b border-border-low p-4 flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-3 flex-grow min-w-[250px] bg-[rgba(35,35,40,0.9)] border border-border-low rounded-xl px-3 py-2.5 focus-within:border-lava-core transition-colors">
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                        placeholder="Search messages or senders"
                        className="flex-1 bg-transparent text-sm text-primary focus:outline-none placeholder:text-[#D5D5D5]"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto bg-[rgba(35,35,40,0.9)] border border-border-low rounded-xl px-3 py-2.5 focus-within:border-lava-core transition-colors">
                    <CalendarIcon className="h-5 w-5 text-muted" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={event => setSelectedDate(event.target.value)}
                        className="flex-1 bg-transparent text-sm text-primary focus:outline-none placeholder:text-[#D5D5D5]"
                    />
                </div>
                {(searchTerm || selectedDate) && (
                    <GlassButton size="sm" onClick={clearFilters} className="md:w-auto">
                        Clear Filters
                    </GlassButton>
                )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {historyLoading && (
                    <p className="text-center text-secondary text-sm">Loading conversation history…</p>
                )}
                {historyError && !historyLoading && (
                    <p className="text-center text-red-400 text-sm">{historyError}</p>
                )}
                {!historyLoading && filteredMessages.length === 0 && !historyError && (
                    <p className="text-center text-muted text-sm">No messages match your filters.</p>
                )}
                {filteredMessages.map(msg => {
                    const ownMessage = isOwnMessage(msg);
                    return (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-3 ${ownMessage ? 'justify-end' : ''}`}
                        >
                            {!ownMessage && (
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${msg.isAI
                                            ? 'bg-gradient-to-br from-lava-warm to-lava-cool'
                                            : 'bg-[rgba(35,35,40,0.9)] border border-border-low'
                                        }`}
                                >
                                    {msg.isAI ? 'AI' : msg.sender.charAt(0)}
                                </div>
                            )}
                            <div
                                className={`p-4 rounded-lg max-w-lg ${ownMessage
                                        ? 'bg-gradient-to-br from-lava-warm to-lava-core text-white rounded-br-none'
                                        : 'bg-[rgba(35,35,40,0.9)] text-secondary rounded-bl-none border border-border-low'
                                    }`}
                            >
                                <div className="flex items-baseline gap-2">
                                    <p className="font-bold text-sm">{msg.sender}</p>
                                    <p className="text-xs text-muted">{formatTimestamp(msg.timestamp)}</p>
                                </div>
                                <p className="mt-1 whitespace-pre-line">{msg.message}</p>
                            </div>
                        </div>
                    );
                })}
                {isLoadingAI && (
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-lava-warm to-lava-cool animate-pulse">
                            AI
                        </div>
                        <div className="p-4 rounded-lg max-w-lg bg-[rgba(35,35,40,0.9)] text-secondary rounded-bl-none border border-border-low">
                            <p className="text-muted italic">AI is thinking...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border-low">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={event => setInput(event.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type message... use @AI to ask a question"
                        className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low focus:border-lava-core text-primary placeholder:text-[#D5D5D5] rounded-lg p-3 pr-12 focus:outline-none transition-colors"
                    />
                    <GlassButton size="icon" onClick={handleSend} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </GlassButton>
                </div>
            </div>
        </div>
    );
};

export default TeamChat;
