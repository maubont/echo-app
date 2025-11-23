// Proxi Pulse Status Service
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { UserStatus } from '../lib/types';

interface StatusWithUser extends UserStatus {
    userId: string;
}

class StatusService {
    private channel: RealtimeChannel | null = null;

    /**
     * Subscribe to nearby users' status updates
     */
    subscribeToStatuses(
        callback: (statuses: StatusWithUser[]) => void
    ): () => void {
        // Subscribe to real-time status updates
        this.channel = supabase
            .channel('user_statuses_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_statuses',
                },
                async () => {
                    // Fetch updated statuses when changes occur
                    const statuses = await this.fetchActiveStatuses();
                    callback(statuses);
                }
            )
            .subscribe();

        // Initial fetch
        this.fetchActiveStatuses().then(callback);

        // Cleanup function
        return () => {
            if (this.channel) {
                supabase.removeChannel(this.channel);
                this.channel = null;
            }
        };
    }

    /**
     * Fetch all active (non-expired) statuses
     */
    async fetchActiveStatuses(): Promise<StatusWithUser[]> {
        const { data, error } = await supabase
            .from('user_statuses')
            .select('*')
            .gt('expires_at', new Date().toISOString());

        if (error) {
            console.error('Error fetching statuses:', error);
            return [];
        }

        return data.map((status) => ({
            userId: status.user_id,
            emoji: status.emoji,
            text: status.text,
            createdAt: new Date(status.created_at).getTime(),
            expiresAt: new Date(status.expires_at).getTime(),
        }));
    }

    /**
     * Create or update own status
     */
    async setStatus(emoji: string, text: string, durationHours: number): Promise<void> {
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
            throw new Error('User not authenticated');
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

        // Delete any existing status for this user first
        await supabase
            .from('user_statuses')
            .delete()
            .eq('user_id', user.data.user.id);

        // Create new status
        const { error } = await supabase.from('user_statuses').insert({
            user_id: user.data.user.id,
            emoji,
            text,
            expires_at: expiresAt.toISOString(),
        });

        if (error) {
            console.error('Error creating status:', error);
            throw error;
        }
    }

    /**
     * Delete own status
     */
    async deleteStatus(): Promise<void> {
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
            throw new Error('User not authenticated');
        }

        const { error } = await supabase
            .from('user_statuses')
            .delete()
            .eq('user_id', user.data.user.id);

        if (error) {
            console.error('Error deleting status:', error);
            throw error;
        }
    }

    /**
     * Get own status
     */
    async getOwnStatus(): Promise<UserStatus | null> {
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
            return null;
        }

        const { data, error } = await supabase
            .from('user_statuses')
            .select('*')
            .eq('user_id', user.data.user.id)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !data) {
            return null;
        }

        return {
            emoji: data.emoji,
            text: data.text,
            createdAt: new Date(data.created_at).getTime(),
            expiresAt: new Date(data.expires_at).getTime(),
        };
    }
}

export const statusService = new StatusService();
