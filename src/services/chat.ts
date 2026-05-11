// Chat Service with Persistent Messages
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
}

export interface Conversation {
    id: string;
    participantIds: string[];
    createdAt: string;
    updatedAt: string;
    mode?: string;
    expiresAt?: string;
}

class ChatService {
    private messageChannels: Map<string, RealtimeChannel> = new Map();

    /**
     * Get or create a conversation between two users
     * For adult mode, conversations expire in 24 hours
     */
    async getOrCreateConversation(
        participantIds: string[],
        mode: string = 'networking'
    ): Promise<string> {
        // Try to find existing conversation in the same mode
        const { data: existingParticipants } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .in('user_id', participantIds);

        if (existingParticipants && existingParticipants.length > 0) {
            // Group by conversation_id and find one with exactly the right participants
            const conversationCounts = existingParticipants.reduce((acc, { conversation_id }) => {
                acc[conversation_id] = (acc[conversation_id] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Find conversations with exact participant match
            const candidateIds = Object.entries(conversationCounts)
                .filter(([_, count]) => count === participantIds.length)
                .map(([id]) => id);

            if (candidateIds.length > 0) {
                // Check if any of these conversations match the mode and are not expired
                const { data: matchingConvs } = await supabase
                    .from('conversations')
                    .select('id, mode, expires_at')
                    .in('id', candidateIds)
                    .eq('mode', mode);

                const validConv = matchingConvs?.find(c => 
                    !c.expires_at || new Date(c.expires_at) > new Date()
                );

                if (validConv) {
                    return validConv.id;
                }
            }
        }

        // Calculate expiry for adult mode
        const expiresAt = mode === 'adult'
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : null;

        // Create new conversation using RPC
        const { data: conversationId, error: rpcError } = await supabase
            .rpc('create_new_conversation', {
                participant_ids: participantIds,
                conv_mode: mode,
                conv_expires_at: expiresAt
            });

        if (rpcError) {
            console.error('Error creating conversation via RPC:', rpcError);
            throw new Error('Failed to create conversation');
        }

        return conversationId;
    }

    /**
     * Subscribe to messages in a conversation
     */
    subscribeToMessages(
        conversationId: string,
        callback: (messages: Message[]) => void
    ): () => void {
        const channel = supabase
            .channel(`messages_${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async () => {
                    // Fetch updated messages
                    const messages = await this.fetchMessages(conversationId);
                    callback(messages);
                }
            )
            .subscribe();

        this.messageChannels.set(conversationId, channel);

        // Initial fetch
        this.fetchMessages(conversationId).then(callback);

        // Cleanup function
        return () => {
            const ch = this.messageChannels.get(conversationId);
            if (ch) {
                supabase.removeChannel(ch);
                this.messageChannels.delete(conversationId);
            }
        };
    }

    /**
     * Fetch message history for a conversation
     */
    async fetchMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }

        return data.map((msg) => ({
            id: msg.id,
            conversationId: msg.conversation_id,
            senderId: msg.sender_id,
            content: msg.content,
            createdAt: msg.created_at,
        }));
    }

    /**
     * Send a message
     */
    async sendMessage(conversationId: string, content: string): Promise<void> {
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
            throw new Error('User not authenticated');
        }

        const { error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: user.data.user.id,
            content,
        });

        if (error) {
            console.error('Error sending message:', error);
            throw error;
        }

        // Update conversation updated_at
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);
    }

    /**
     * Get user's conversations
     */
    async getUserConversations(): Promise<Conversation[]> {
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
            return [];
        }

        const { data, error } = await supabase
            .from('conversation_participants')
            .select('conversation_id, conversations(*), user_id')
            .eq('user_id', user.data.user.id);

        if (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }

        // Get all participants for each conversation
        const conversationIds = data.map((p) => p.conversation_id);
        const { data: allParticipants } = await supabase
            .from('conversation_participants')
            .select('*')
            .in('conversation_id', conversationIds);

        const participantsByConversation = (allParticipants || []).reduce((acc, p) => {
            if (!acc[p.conversation_id]) {
                acc[p.conversation_id] = [];
            }
            acc[p.conversation_id].push(p.user_id);
            return acc;
        }, {} as Record<string, string[]>);

        return data.map((item: any) => ({
            id: item.conversation_id,
            participantIds: participantsByConversation[item.conversation_id] || [],
            createdAt: item.conversations.created_at,
            updatedAt: item.conversations.updated_at,
        }));
    }

    /**
     * Get user's conversations with enriched data (profiles, last message)
     */
    async getChatList(): Promise<any[]> {
        const user = await supabase.auth.getUser();
        if (!user.data.user) return [];

        // 1. Get conversations I'm part of
        const { data: myConvs, error } = await supabase
            .from('conversation_participants')
            .select('conversation_id, conversations(*)')
            .eq('user_id', user.data.user.id);

        if (error || !myConvs) {
            console.error('Error fetching chat list:', error);
            return [];
        }

        // Filter out expired conversations
        const validConvs = myConvs.filter((conv: any) => {
            const expiresAt = conv.conversations?.expires_at;
            return !expiresAt || new Date(expiresAt) > new Date();
        });

        const enrichedConversations = await Promise.all(validConvs.map(async (conv: any) => {
            const conversationId = conv.conversation_id;

            // 2. Get the OTHER participant
            const { data: participants } = await supabase
                .from('conversation_participants')
                .select('user_id, profiles(name, avatar_url)')
                .eq('conversation_id', conversationId)
                .neq('user_id', user.data.user.id)
                .single();

            // 3. Get last message
            const { data: lastMsg } = await supabase
                .from('messages')
                .select('content, created_at, sender_id')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // If no other participant found, use placeholder
            const otherUser = participants || {
                user_id: 'unknown',
                profiles: { name: 'Usuario', avatar_url: null }
            };

            const rawProfile = otherUser.profiles;
            const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

            return {
                id: conversationId,
                participantId: otherUser.user_id,
                participantName: profile?.name || 'Usuario',
                participantAvatar: profile?.avatar_url,
                lastMessage: lastMsg?.content || '',
                lastTimestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : new Date(conv.conversations.created_at).getTime(),
                unreadCount: 0,
                messages: [],
                mode: conv.conversations?.mode || 'networking',
                expiresAt: conv.conversations?.expires_at ? new Date(conv.conversations.expires_at).getTime() : undefined
            };
        }));

        // Sort by last activity
        return enrichedConversations.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    }

    /**
     * Subscribe to ALL conversations for the current user
     * Used for the chat list to update last message and unread count
     */
    subscribeToAllConversations(
        userId: string,
        callback: (payload: any) => void
    ): () => void {
        const channel = supabase
            .channel(`user_chats_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    // The RLS policy ensures we only receive messages for conversations we are part of
                    callback(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
}

export const chatService = new ChatService();
