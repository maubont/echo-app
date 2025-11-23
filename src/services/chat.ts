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
}

class ChatService {
    private messageChannels: Map<string, RealtimeChannel> = new Map();

    /**
     * Get or create a conversation between two users
     */
    async getOrCreateConversation(participantIds: string[]): Promise<string> {
        // Try to find existing conversation
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

            const existingConversation = Object.entries(conversationCounts).find(
                ([_, count]) => count === participantIds.length
            );

            if (existingConversation) {
                return existingConversation[0];
            }
        }

        // Create new conversation
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({})
            .select()
            .single();

        if (convError || !conversation) {
            throw new Error('Failed to create conversation');
        }

        // Add participants
        const participants = participantIds.map((userId) => ({
            conversation_id: conversation.id,
            user_id: userId,
        }));

        const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert(participants);

        if (participantsError) {
            throw new Error('Failed to add participants');
        }

        return conversation.id;
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
}

export const chatService = new ChatService();
