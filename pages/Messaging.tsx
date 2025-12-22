import React, { useState, useEffect, useRef, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { UserContext } from '../App';
import { adminApi } from '../lib/adminApi';
import {
    PaperAirplaneIcon,
    PaperClipIcon,
    PlusIcon,
    Cog6ToothIcon,
    UserPlusIcon,
    XMarkIcon,
    PencilIcon,
    TrashIcon,
    UserMinusIcon,
} from '@heroicons/react/24/solid';

interface Channel {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    image_url: string | null;
    created_at: string;
}

interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string | null;
    attachments: any[];
    created_at: string;
    profile?: {
        username: string | null;
        name: string | null;
    };
}

interface User {
    id: string;
    username: string | null;
    name: string | null;
    email: string;
}

interface ChannelMember {
    user_id: string;
    profile?: {
        username: string | null;
        name: string | null;
        email?: string | null;
    };
}

const Messaging: React.FC = () => {
    const userContext = useContext(UserContext);
    const currentUserId = userContext?.user.id ?? '';
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Channel management state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showChannelSettings, setShowChannelSettings] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelType, setNewChannelType] = useState<'direct' | 'group'>('group');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
    const [editingChannelName, setEditingChannelName] = useState(false);
    const [editChannelName, setEditChannelName] = useState('');
    const [uploadingChannelImage, setUploadingChannelImage] = useState(false);
    const channelImageInputRef = useRef<HTMLInputElement>(null);

    // @mention state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState(0);
    const [filteredMentionUsers, setFilteredMentionUsers] = useState<ChannelMember[]>([]);
    const mentionDropdownRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load current user's email
    useEffect(() => {
        const loadCurrentUserEmail = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.email) {
                    setCurrentUserEmail(user.email);
                }
            } catch (error) {
                console.error('Error loading current user email:', error);
            }
        };
        loadCurrentUserEmail();
    }, []);

    // Close mention dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                mentionDropdownRef.current &&
                !mentionDropdownRef.current.contains(event.target as Node) &&
                textareaRef.current &&
                !textareaRef.current.contains(event.target as Node)
            ) {
                setShowMentionDropdown(false);
            }
        };

        if (showMentionDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showMentionDropdown]);

    // Load all users for member selection
    useEffect(() => {
        const loadUsers = async () => {
            try {
                // Try to use admin API first (works for admins and includes all users)
                let usersList: User[] = [];
                
                try {
                    const { users: adminUsers } = await adminApi.listUsers();
                    usersList = adminUsers
                        .filter((u: any) => u.id !== currentUserId)
                        .map((user: any) => ({
                            id: user.id,
                            username: user.username || null,
                            name: null,
                            email: user.email || '',
                        }));
                } catch (adminError) {
                    // If admin API fails (user not admin), fall back to profiles table
                    console.log('Admin API not available, falling back to profiles');
                    const { data: profilesData, error: profilesError } = await supabase
                        .from('profiles')
                        .select('id, username, name')
                        .neq('id', currentUserId);

                    if (profilesError) throw profilesError;

                    // Map profiles - note: we can't get other users' emails from client-side
                    // So we'll prioritize username/name, and email will be empty
                    // Users will see username/name if available, otherwise "User {id}"
                    usersList = (profilesData || []).map((profile: any) => ({
                        id: profile.id,
                        username: profile.username,
                        name: profile.name,
                        email: '', // Not available from client-side profiles query
                    }));
                }

                setAllUsers(usersList);
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };

        if (currentUserId) {
            loadUsers();
        }
    }, [currentUserId]);

    // Load channel members for active channel
    useEffect(() => {
        if (!activeChannel) {
            setChannelMembers([]);
            return;
        }

        const loadChannelMembers = async () => {
            try {
                const { data, error } = await supabase
                    .from('channel_members')
                    .select(`
                        user_id,
                        profiles:user_id (
                            username,
                            name
                        )
                    `)
                    .eq('channel_id', activeChannel);

                if (error) throw error;

                // Get current user's email for display
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                const currentUserEmail = currentUser?.email || '';

                const members = (data || []).map((item: any) => {
                    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                    // If this is the current user and we don't have username/name, use email
                    const email = item.user_id === currentUserId ? currentUserEmail : null;
                    
                    return {
                        user_id: item.user_id,
                        profile: {
                            username: profile?.username || null,
                            name: profile?.name || null,
                            email: email || null,
                        },
                    };
                });

                setChannelMembers(members);
            } catch (error) {
                console.error('Error loading channel members:', error);
            }
        };

        loadChannelMembers();
    }, [activeChannel]);

    // Load channels the user belongs to
    const loadChannels = async () => {
        try {
            const { data, error } = await supabase
                .from('channel_members')
                .select(`
                    channel_id,
                    channels (
                        id,
                        type,
                        name,
                        image_url,
                        created_at
                    )
                `)
                .eq('user_id', currentUserId)
                .order('joined_at', { ascending: false });

            if (error) throw error;

            const channelList = (data || [])
                .map((item: any) => item.channels)
                .filter(Boolean) as Channel[];

            setChannels(channelList);

            // Auto-select first channel if available and no active channel
            if (channelList.length > 0 && !activeChannel) {
                setActiveChannel(channelList[0].id);
            } else if (channelList.length === 0) {
                // Create default General channel if none exist
                await createDefaultChannel();
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        } finally {
            setLoading(false);
        }
    };

    const createDefaultChannel = async () => {
        try {
            const { data: newChannel, error: createError } = await supabase
                .from('channels')
                .insert({
                    type: 'group',
                    name: 'General',
                })
                .select()
                .single();

            if (createError) throw createError;

            const { error: memberError } = await supabase
                .from('channel_members')
                .insert({
                    channel_id: newChannel.id,
                    user_id: currentUserId,
                });

            if (memberError) throw memberError;

            setChannels([newChannel]);
            setActiveChannel(newChannel.id);
        } catch (error) {
            console.error('Error creating default channel:', error);
        }
    };

    useEffect(() => {
        if (currentUserId) {
            loadChannels();
        }
    }, [currentUserId]);

    // Load messages for active channel
    useEffect(() => {
        if (!activeChannel) {
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        channel_id,
                        user_id,
                        content,
                        attachments,
                        created_at,
                        profiles:user_id (
                            username,
                            name
                        )
                    `)
                    .eq('channel_id', activeChannel)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                const messagesWithProfiles = (data || []).map((msg: any) => ({
                    ...msg,
                    profile: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles,
                }));

                setMessages(messagesWithProfiles);
                scrollToBottom();
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };

        loadMessages();
    }, [activeChannel]);

    // Subscribe to realtime updates for messages
    useEffect(() => {
        if (!activeChannel) return;

        const channel = supabase
            .channel(`messages:${activeChannel}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${activeChannel}`,
                },
                async (payload) => {
                    const { data: messageData, error } = await supabase
                        .from('messages')
                        .select(`
                            id,
                            channel_id,
                            user_id,
                            content,
                            attachments,
                            created_at,
                            profiles:user_id (
                                username,
                                name
                            )
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (!error && messageData) {
                        const messageWithProfile = {
                            ...messageData,
                            profile: Array.isArray(messageData.profiles)
                                ? messageData.profiles[0]
                                : messageData.profiles,
                        };
                        setMessages((prev) => [...prev, messageWithProfile]);
                        scrollToBottom();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChannel]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Create new channel
    const handleCreateChannel = async () => {
        if (!newChannelName.trim() && newChannelType === 'group') {
            alert('Please enter a channel name');
            return;
        }

        if (newChannelType === 'direct' && selectedUsers.length !== 1) {
            alert('Please select exactly one user for a direct message');
            return;
        }

        try {
            // Create channel
            const { data: newChannel, error: createError } = await supabase
                .from('channels')
                .insert({
                    type: newChannelType,
                    name: newChannelType === 'group' ? newChannelName.trim() : null,
                })
                .select()
                .single();

            if (createError) throw createError;

            // Add members
            const membersToAdd = [currentUserId, ...selectedUsers];
            const { error: memberError } = await supabase
                .from('channel_members')
                .insert(
                    membersToAdd.map((userId) => ({
                        channel_id: newChannel.id,
                        user_id: userId,
                    }))
                );

            if (memberError) throw memberError;

            // Reset form and reload channels
            setNewChannelName('');
            setSelectedUsers([]);
            setShowCreateModal(false);
            await loadChannels();
            setActiveChannel(newChannel.id);
        } catch (error) {
            console.error('Error creating channel:', error);
            alert('Failed to create channel. Please try again.');
        }
    };

    // Add members to channel
    const handleAddMembers = async (userIds: string[]) => {
        if (!activeChannel || userIds.length === 0) return;

        try {
            const { error } = await supabase.from('channel_members').insert(
                userIds.map((userId) => ({
                    channel_id: activeChannel,
                    user_id: userId,
                }))
            );

            if (error) throw error;

            // Reload channel members
            const { data } = await supabase
                .from('channel_members')
                .select(`
                    user_id,
                    profiles:user_id (
                        username,
                        name
                    )
                `)
                .eq('channel_id', activeChannel);

            if (data) {
                const members = data.map((item: any) => ({
                    user_id: item.user_id,
                    profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
                }));
                setChannelMembers(members);
            }
        } catch (error) {
            console.error('Error adding members:', error);
            alert('Failed to add members. Please try again.');
        }
    };

    // Handle channel image upload
    const handleChannelImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !activeChannel) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        setUploadingChannelImage(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${activeChannel}/${Date.now()}.${fileExt}`;
            const filePath = `channel-images/${fileName}`;

            // Delete old image if exists
            const currentChannel = channels.find((c) => c.id === activeChannel);
            if (currentChannel?.image_url) {
                const oldPath = currentChannel.image_url.split('/').slice(-2).join('/');
                await supabase.storage.from('chat-attachments').remove([`channel-images/${oldPath}`]);
            }

            // Upload new image
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            // Update channel with new image URL
            const { error: updateError } = await supabase
                .from('channels')
                .update({ image_url: publicUrl })
                .eq('id', activeChannel);

            if (updateError) throw updateError;

            // Update local state
            setChannels((prev) =>
                prev.map((c) => (c.id === activeChannel ? { ...c, image_url: publicUrl } : c))
            );
        } catch (error) {
            console.error('Error uploading channel image:', error);
            alert('Failed to upload channel image. Please try again.');
        } finally {
            setUploadingChannelImage(false);
            if (channelImageInputRef.current) {
                channelImageInputRef.current.value = '';
            }
        }
    };

    // Remove member from channel
    const handleRemoveMember = async (userId: string) => {
        if (!activeChannel) return;

        try {
            const { error } = await supabase
                .from('channel_members')
                .delete()
                .eq('channel_id', activeChannel)
                .eq('user_id', userId);

            if (error) throw error;

            setChannelMembers((prev) => prev.filter((m) => m.user_id !== userId));
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Failed to remove member. Please try again.');
        }
    };

    // Leave channel
    const handleLeaveChannel = async () => {
        if (!activeChannel) return;

        if (!confirm('Are you sure you want to leave this channel?')) return;

        try {
            const { error } = await supabase
                .from('channel_members')
                .delete()
                .eq('channel_id', activeChannel)
                .eq('user_id', currentUserId);

            if (error) throw error;

            setActiveChannel(null);
            setShowChannelSettings(false);
            await loadChannels();
        } catch (error) {
            console.error('Error leaving channel:', error);
            alert('Failed to leave channel. Please try again.');
        }
    };

    // Update channel name
    const handleUpdateChannelName = async () => {
        if (!activeChannel || !editChannelName.trim()) return;

        try {
            const { error } = await supabase
                .from('channels')
                .update({ name: editChannelName.trim() })
                .eq('id', activeChannel);

            if (error) throw error;

            setEditingChannelName(false);
            await loadChannels();
        } catch (error) {
            console.error('Error updating channel name:', error);
            alert('Failed to update channel name. Please try again.');
        }
    };

    // Handle file upload
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !activeChannel) return;

        setUploading(true);
        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${activeChannel}/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            await sendMessage('', [{ url: publicUrl, name: file.name, type: file.type }]);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Send message
    const sendMessage = async (content: string, attachments: any[] = []) => {
        if (!activeChannel || (!content.trim() && attachments.length === 0)) return;

        setSending(true);
        try {
            const { error } = await supabase.from('messages').insert({
                channel_id: activeChannel,
                user_id: currentUserId,
                content: content.trim() || null,
                attachments: attachments.length > 0 ? attachments : [],
            });

            if (error) throw error;

            setMessageInput('');
            setShowMentionDropdown(false);
            setMentionQuery('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleSend = () => {
        if (messageInput.trim()) {
            sendMessage(messageInput);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
            e.preventDefault();
            handleSend();
        }
    };

    // Handle @mention input
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart || 0;
        setMessageInput(value);

        // Check if we're typing @mention
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            // Check if there's a space after @ (meaning we're not in a mention)
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                // We're in a mention
                const query = textAfterAt.toLowerCase();
                setMentionQuery(query);
                setMentionPosition(lastAtIndex);
                
                // Filter channel members
                const filtered = channelMembers.filter((member) => {
                    const displayName = getMemberMentionName(member).toLowerCase();
                    const email = member.profile?.email?.toLowerCase() || '';
                    return displayName.includes(query) || email.includes(query);
                });
                
                setFilteredMentionUsers(filtered);
                setShowMentionDropdown(filtered.length > 0);
                return;
            }
        }
        
        // Hide dropdown if not in mention
        setShowMentionDropdown(false);
    };

    // Handle keyboard navigation in mention dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentionDropdown) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                // Focus first mention option
                const firstOption = mentionDropdownRef.current?.querySelector('button');
                if (firstOption) {
                    (firstOption as HTMLElement).focus();
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowMentionDropdown(false);
                return;
            }
        }

        // Handle Enter to send (only if not in mention dropdown)
        if (e.key === 'Enter' && !e.shiftKey && !showMentionDropdown) {
            e.preventDefault();
            handleSend();
        }
    };

    // Insert mention into message
    const insertMention = (member: ChannelMember) => {
        const mentionName = getMemberMentionName(member);
        const textBefore = messageInput.substring(0, mentionPosition);
        const textAfter = messageInput.substring(mentionPosition + 1 + mentionQuery.length);
        const newText = `${textBefore}@${mentionName} ${textAfter}`;
        
        setMessageInput(newText);
        setShowMentionDropdown(false);
        setMentionQuery('');
        
        // Focus back on textarea and set cursor position
        setTimeout(() => {
            if (textareaRef.current) {
                const newPosition = mentionPosition + mentionName.length + 2; // +2 for @ and space
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
        }, 0);
    };

    const isOwnMessage = (message: Message) => message.user_id === currentUserId;

    const getUserDisplayName = (message: Message) => {
        if (message.profile?.username) return message.profile.username;
        if (message.profile?.name) return message.profile.name;
        return 'Unknown User';
    };

    const getChannelDisplayName = (channel: Channel) => {
        if (channel.name) return channel.name;
        if (channel.type === 'direct') return 'Direct Message';
        return 'Group Chat';
    };

    const getMemberDisplayName = (member: ChannelMember) => {
        if (member.profile?.username) return member.profile.username;
        if (member.profile?.name) return member.profile.name;
        if (member.profile?.email) return member.profile.email;
        return 'Unknown User';
    };

    const getMemberMentionName = (member: ChannelMember) => {
        // For mentions, prefer username, then name, then email
        if (member.profile?.username) return member.profile.username;
        if (member.profile?.name) return member.profile.name;
        if (member.profile?.email) return member.profile.email.split('@')[0]; // Use email prefix
        return 'unknown';
    };

    const activeChannelData = channels.find((c) => c.id === activeChannel);
    const availableUsers = allUsers.filter(
        (user) => !channelMembers.some((m) => m.user_id === user.id)
    );

    // Render message with highlighted mentions
    const renderMessageWithMentions = (content: string) => {
        // Find all @mentions in the message
        const mentionRegex = /@(\w+)/g;
        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(content)) !== null) {
            // Add text before mention
            if (match.index > lastIndex) {
                parts.push(content.substring(lastIndex, match.index));
            }

            // Check if this mention matches any channel member
            const mentionName = match[1];
            const mentionedMember = channelMembers.find((member) => {
                const memberName = getMemberMentionName(member).toLowerCase();
                return memberName === mentionName.toLowerCase();
            });

            if (mentionedMember) {
                // Highlight the mention
                parts.push(
                    <span
                        key={match.index}
                        className="font-semibold text-cyan-400 bg-cyan-500/20 px-1 rounded"
                    >
                        @{mentionName}
                    </span>
                );
            } else {
                // Not a valid mention, just show as text
                parts.push(`@${mentionName}`);
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex));
        }

        return parts.length > 0 ? <>{parts}</> : content;
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-secondary">Loading channels...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left Sidebar - Channel List */}
            <div className="w-80 glass-card-outline m-4 mr-2 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border-low flex items-center justify-between">
                    <h2 className="text-xl font-bold text-primary-contrast">Messages</h2>
                    <button
                        onClick={() => {
                            setShowCreateModal(true);
                            setSelectedUsers([]);
                            setNewChannelName('');
                            setNewChannelType('group');
                        }}
                        className="p-2 text-muted hover:text-primary-contrast hover:bg-glass-panel/50 rounded-lg transition-colors"
                        title="Create new channel"
                    >
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {channels.length === 0 ? (
                        <div className="p-4 text-center text-secondary-contrast">
                            <p>No channels yet</p>
                        </div>
                    ) : (
                        channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => {
                                    setActiveChannel(channel.id);
                                    setShowChannelSettings(false);
                                }}
                                className={`w-full p-4 text-left hover:bg-glass-panel/30 transition-colors border-b border-border-low/30 ${
                                    activeChannel === channel.id ? 'bg-gradient-to-r from-cyan-500/20 to-transparent border-l-2 border-cyan-500' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {channel.image_url ? (
                                        <img
                                            src={channel.image_url}
                                            alt={getChannelDisplayName(channel)}
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border-low"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full glass-card-outline flex items-center justify-center flex-shrink-0">
                                            <span className="text-primary-contrast text-sm font-semibold">
                                                {getChannelDisplayName(channel)
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-primary-contrast truncate">
                                            {getChannelDisplayName(channel)}
                                        </div>
                                        <div className="text-xs text-secondary-contrast mt-1">
                                            {channel.type === 'direct' ? 'Direct' : 'Group'}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Main Area - Chat */}
            <div className="flex-1 flex flex-col m-4 ml-2 glass-card-outline overflow-hidden">
                {activeChannel ? (
                    <>
                        {/* Channel Header */}
                        <div className="p-4 border-b border-border-low flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {activeChannelData?.image_url ? (
                                    <img
                                        src={activeChannelData.image_url}
                                        alt={getChannelDisplayName(activeChannelData)}
                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border-low"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full glass-card-outline flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary-contrast text-sm font-semibold">
                                            {activeChannelData && getChannelDisplayName(activeChannelData)
                                                .charAt(0)
                                                .toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-semibold text-primary-contrast">
                                        {activeChannelData && getChannelDisplayName(activeChannelData)}
                                    </h3>
                                    <p className="text-xs text-secondary-contrast">
                                        {channelMembers.length} member{channelMembers.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowChannelSettings(!showChannelSettings);
                                    if (!showChannelSettings && activeChannelData) {
                                        setEditChannelName(activeChannelData.name || '');
                                    }
                                }}
                                className="p-2 text-muted hover:text-primary-contrast hover:bg-glass-panel/50 rounded-lg transition-colors"
                                title="Channel settings"
                            >
                                <Cog6ToothIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Channel Settings Panel */}
                        {showChannelSettings && (
                            <div className="p-4 border-b border-border-low bg-glass-panel/50">
                                <div className="space-y-4">
                                    {/* Channel Image */}
                                    <div>
                                        <label className="block text-sm font-medium text-primary-contrast mb-2">
                                            Channel Image
                                        </label>
                                        <div className="flex items-center gap-4">
                                            {activeChannelData?.image_url ? (
                                                <img
                                                    src={activeChannelData.image_url}
                                                    alt="Channel"
                                                    className="w-16 h-16 rounded-full object-cover border border-border-low"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full glass-card-outline flex items-center justify-center">
                                                    <span className="text-primary-contrast text-xl font-semibold">
                                                        {activeChannelData?.name
                                                            ?.charAt(0)
                                                            .toUpperCase() || '?'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <input
                                                    ref={channelImageInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleChannelImageUpload(e.target.files)}
                                                />
                                                <button
                                                    onClick={() => channelImageInputRef.current?.click()}
                                                    disabled={uploadingChannelImage}
                                                    className="px-4 py-2 glass-card-outline text-primary-contrast rounded-lg hover:bg-glass-panel/50 disabled:opacity-50 text-sm transition-colors"
                                                >
                                                    {uploadingChannelImage ? 'Uploading...' : 'Change Image'}
                                                </button>
                                                {activeChannelData?.image_url && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!activeChannel) return;
                                                            try {
                                                                const { error } = await supabase
                                                                    .from('channels')
                                                                    .update({ image_url: null })
                                                                    .eq('id', activeChannel);
                                                                if (error) throw error;
                                                                setChannels((prev) =>
                                                                    prev.map((c) =>
                                                                        c.id === activeChannel
                                                                            ? { ...c, image_url: null }
                                                                            : c
                                                                    )
                                                                );
                                                            } catch (error) {
                                                                console.error('Error removing image:', error);
                                                                alert('Failed to remove image');
                                                            }
                                                        }}
                                                        className="ml-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Channel Name */}
                                    {activeChannelData?.type === 'group' && (
                                        <div>
                                            <label className="block text-sm font-medium text-primary-contrast mb-2">
                                                Channel Name
                                            </label>
                                            {editingChannelName ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editChannelName}
                                                        onChange={(e) => setEditChannelName(e.target.value)}
                                                        className="flex-1 bg-[rgba(35,35,40,0.9)] border border-border-low rounded-lg px-3 py-2 text-primary placeholder:text-[#D5D5D5] focus:outline-none focus:border-cyan-500 transition-colors"
                                                        placeholder="Channel name"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleUpdateChannelName}
                                                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingChannelName(false);
                                                            setEditChannelName(activeChannelData?.name || '');
                                                        }}
                                                        className="px-4 py-2 glass-card-outline text-primary-contrast rounded-lg hover:bg-glass-panel/50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="flex-1 text-primary-contrast">
                                                        {activeChannelData?.name || 'Unnamed Channel'}
                                                    </span>
                                                    <button
                                                        onClick={() => setEditingChannelName(true)}
                                                        className="p-2 text-muted hover:text-primary-contrast transition-colors"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Members List */}
                                    <div>
                                        <label className="block text-sm font-medium text-primary-contrast mb-2">
                                            Members ({channelMembers.length})
                                        </label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {channelMembers.map((member) => (
                                                <div
                                                    key={member.user_id}
                                                    className="flex items-center justify-between p-2 glass-card-outline rounded"
                                                >
                                                    <span className="text-primary-contrast text-sm">
                                                        {getMemberDisplayName(member)}
                                                        {member.user_id === currentUserId && ' (You)'}
                                                    </span>
                                                    {member.user_id !== currentUserId && (
                                                        <button
                                                            onClick={() => handleRemoveMember(member.user_id)}
                                                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                            title="Remove member"
                                                        >
                                                            <UserMinusIcon className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Add Members */}
                                    {activeChannelData?.type === 'group' && (
                                        <div>
                                            <label className="block text-sm font-medium text-primary-contrast mb-2">
                                                Add Members
                                            </label>
                                            {availableUsers.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                                    {availableUsers.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => handleAddMembers([user.id])}
                                                            className="px-3 py-1 glass-card-outline text-primary-contrast rounded-lg hover:bg-glass-panel/50 text-sm flex items-center gap-2 transition-colors"
                                                        >
                                                            <UserPlusIcon className="h-4 w-4" />
                                                            {user.username || user.name || user.email}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-secondary-contrast">
                                                    All users are already members
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Leave Channel */}
                                    <div className="pt-2 border-t border-border-low">
                                        <button
                                            onClick={handleLeaveChannel}
                                            className="w-full px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                            Leave Channel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-secondary-contrast">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isOwn = isOwnMessage(message);
                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex items-start gap-3 ${isOwn ? 'justify-end' : ''}`}
                                        >
                                            {!isOwn && (
                                                <div className="w-10 h-10 rounded-full glass-card-outline flex items-center justify-center font-bold text-primary-contrast flex-shrink-0">
                                                    {getUserDisplayName(message).charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div
                                                className={`p-4 rounded-lg max-w-lg ${
                                                    isOwn
                                                        ? 'bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-500 text-white rounded-br-none'
                                                        : 'bg-[rgba(35,35,40,0.9)] text-secondary-contrast rounded-bl-none border border-border-low'
                                                }`}
                                            >
                                                <div className="flex items-baseline gap-2">
                                                    {!isOwn && (
                                                        <p className="font-bold text-sm text-primary-contrast">
                                                            {getUserDisplayName(message)}
                                                        </p>
                                                    )}
                                                    <p className={`text-xs ${isOwn ? 'text-cyan-100' : 'text-muted'}`}>
                                                        {new Date(message.created_at).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                                {message.content && (
                                                    <p className="mt-1 whitespace-pre-line break-words">
                                                        {renderMessageWithMentions(message.content)}
                                                    </p>
                                                )}
                                                {message.attachments && message.attachments.length > 0 && (
                                                    <div className="mt-2 space-y-2">
                                                        {message.attachments.map((attachment: any, idx: number) => (
                                                            <div key={idx}>
                                                                {attachment.type?.startsWith('image/') ? (
                                                                    <img
                                                                        src={attachment.url}
                                                                        alt={attachment.name || 'Attachment'}
                                                                        className="max-w-full rounded-md border border-border-low"
                                                                        style={{ maxHeight: '300px' }}
                                                                    />
                                                                ) : (
                                                                    <a
                                                                        href={attachment.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
                                                                    >
                                                                        📎 {attachment.name || 'Attachment'}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-border-low">
                            <div className="relative">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e.target.files)}
                                />
                                <div className="flex items-end gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading || sending}
                                        className="p-2 text-muted hover:text-primary-contrast disabled:opacity-50 transition-colors"
                                        title="Attach file"
                                    >
                                        <PaperClipIcon className="h-5 w-5" />
                                    </button>
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={messageInput}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message... Use @ to mention someone"
                                        className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low rounded-lg px-4 py-3 text-primary placeholder:text-[#D5D5D5] focus:outline-none focus:border-cyan-500 resize-none transition-colors"
                                        rows={1}
                                        style={{ minHeight: '44px', maxHeight: '120px' }}
                                    />
                                    {/* Mention Dropdown */}
                                    {showMentionDropdown && filteredMentionUsers.length > 0 && (
                                        <div
                                            ref={mentionDropdownRef}
                                            className="absolute bottom-full left-0 mb-2 w-full max-w-md glass-card-outline border border-border-low rounded-lg overflow-hidden z-50 max-h-48 overflow-y-auto"
                                        >
                                            {filteredMentionUsers.map((member, index) => (
                                                <button
                                                    key={member.user_id}
                                                    onClick={() => insertMention(member)}
                                                    className="w-full px-4 py-2 text-left hover:bg-glass-panel/50 transition-colors flex items-center gap-3 focus:bg-glass-panel/50 focus:outline-none"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            insertMention(member);
                                                        } else if (e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            const next = e.currentTarget.nextElementSibling as HTMLElement;
                                                            if (next) next.focus();
                                                        } else if (e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            const prev = e.currentTarget.previousElementSibling as HTMLElement;
                                                            if (prev) prev.focus();
                                                            else textareaRef.current?.focus();
                                                        }
                                                    }}
                                                >
                                                    <div className="w-8 h-8 rounded-full glass-card-outline flex items-center justify-center flex-shrink-0">
                                                        <span className="text-primary-contrast text-xs font-semibold">
                                                            {getMemberDisplayName(member).charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-primary-contrast truncate">
                                                            {getMemberDisplayName(member)}
                                                        </div>
                                                        {member.profile?.email && (
                                                            <div className="text-xs text-secondary-contrast truncate">
                                                                {member.profile.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-cyan-400">@{getMemberMentionName(member)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={(!messageInput.trim() && !uploading) || sending}
                                        className="p-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Send message"
                                    >
                                        <PaperAirplaneIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                {uploading && (
                                    <p className="text-xs text-secondary-contrast mt-2">Uploading file...</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-secondary-contrast">
                        <p>Select a channel to start messaging</p>
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card-outline p-6 w-full max-w-md border border-border-low">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-primary-contrast">Create New Channel</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-muted hover:text-primary-contrast transition-colors"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-contrast mb-2">
                                    Channel Type
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setNewChannelType('group');
                                            setNewChannelName('');
                                        }}
                                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                                            newChannelType === 'group'
                                                ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white'
                                                : 'glass-card-outline text-primary-contrast hover:bg-glass-panel/50'
                                        }`}
                                    >
                                        Group
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewChannelType('direct');
                                            setSelectedUsers([]);
                                        }}
                                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                                            newChannelType === 'direct'
                                                ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white'
                                                : 'glass-card-outline text-primary-contrast hover:bg-glass-panel/50'
                                        }`}
                                    >
                                        Direct Message
                                    </button>
                                </div>
                            </div>

                            {newChannelType === 'group' && (
                                <div>
                                    <label className="block text-sm font-medium text-primary-contrast mb-2">
                                        Channel Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value)}
                                        className="w-full bg-[rgba(35,35,40,0.9)] border border-border-low rounded-lg px-3 py-2 text-primary placeholder:text-[#D5D5D5] focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="Enter channel name"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-primary-contrast mb-2">
                                    {newChannelType === 'direct'
                                        ? 'Select User'
                                        : 'Add Members (optional)'}
                                </label>
                                <div className="max-h-48 overflow-y-auto space-y-2 border border-border-low rounded-lg p-2 glass-card-outline">
                                    {allUsers.map((user) => (
                                        <label
                                            key={user.id}
                                            className="flex items-center gap-2 p-2 hover:bg-glass-panel/30 rounded cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={(e) => {
                                                    if (newChannelType === 'direct') {
                                                        setSelectedUsers(e.target.checked ? [user.id] : []);
                                                    } else {
                                                        setSelectedUsers((prev) =>
                                                            e.target.checked
                                                                ? [...prev, user.id]
                                                                : prev.filter((id) => id !== user.id)
                                                        );
                                                    }
                                                }}
                                                className="rounded accent-cyan-500"
                                            />
                                            <span className="text-primary-contrast text-sm">
                                                {user.email || user.username || user.name || `User ${user.id.slice(0, 8)}`}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 glass-card-outline text-primary-contrast rounded-lg hover:bg-glass-panel/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateChannel}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Messaging;
