// Real-time Location Service
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LocationUpdate {
    userId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    isVisible: boolean;
}

interface NearbyUser {
    id: string;
    latitude: number;
    longitude: number;
    isVisible: boolean;
    updatedAt: string;
    name: string;
    avatarUrl: string | null;
    mode: string;
}

class LocationService {
    private channel: RealtimeChannel | null = null;
    private updateInterval: NodeJS.Timeout | null = null;

    /**
     * Subscribe to nearby users' location updates
     */
    subscribeToNearbyLocations(
        callback: (locations: NearbyUser[]) => void
    ): () => void {
        // Subscribe to real-time location updates
        this.channel = supabase
            .channel('user_locations_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_locations',
                },
                async () => {
                    // Fetch updated locations when changes occur
                    const locations = await this.fetchNearbyLocations();
                    callback(locations);
                }
            )
            .subscribe();

        // Initial fetch
        this.fetchNearbyLocations().then(callback);

        // Cleanup function
        return () => {
            if (this.channel) {
                supabase.removeChannel(this.channel);
                this.channel = null;
            }
        };
    }

    /**
     * Fetch nearby users' locations with profile data
     */
    async fetchNearbyLocations(
        maxDistance: number = 5000 // meters
    ): Promise<NearbyUser[]> {
        // 1. Get locations
        const { data: locations, error: locError } = await supabase
            .from('user_locations')
            .select('*')
            .eq('is_visible', true);

        if (locError) {
            console.error('Error fetching locations:', locError);
            return [];
        }

        if (!locations || locations.length === 0) return [];

        // 2. Get profiles for these users
        const userIds = locations.map(l => l.user_id);
        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, current_mode')
            .in('id', userIds);

        if (profError) {
            console.error('Error fetching profiles:', profError);
            // Fallback to locations without profile data if profile fetch fails
            return locations.map(loc => ({
                id: loc.user_id,
                latitude: loc.latitude,
                longitude: loc.longitude,
                isVisible: loc.is_visible,
                updatedAt: loc.updated_at,
                name: 'Usuario',
                avatarUrl: null,
                mode: 'networking'
            }));
        }

        // 3. Merge data
        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        return locations.map((loc) => {
            const profile = profileMap.get(loc.user_id);
            return {
                id: loc.user_id,
                latitude: loc.latitude,
                longitude: loc.longitude,
                isVisible: loc.is_visible,
                updatedAt: loc.updated_at,
                name: profile?.name || 'Usuario',
                avatarUrl: profile?.avatar_url || null,
                mode: profile?.current_mode || 'networking'
            };
        });
    }

    /**
     * Start broadcasting own location
     */
    async startBroadcasting(
        userId: string,
        getCurrentLocation: () => Promise<GeolocationPosition>,
        intervalMs: number = 10000
    ): Promise<() => void> {
        let errorCount = 0;
        const MAX_ERRORS = 3;

        const updateLocation = async () => {
            try {
                const position = await getCurrentLocation();

                await this.updateOwnLocation({
                    userId: userId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    isVisible: true,
                });

                // Reset error count on success
                errorCount = 0;
            } catch (error: any) {
                errorCount++;
                console.error(`Location update failed (${errorCount}/${MAX_ERRORS}):`, error.message);

                // Stop broadcasting after too many consecutive errors
                if (errorCount >= MAX_ERRORS) {
                    console.warn('Too many location errors. Stopping broadcast.');
                    this.stopBroadcasting();
                }
            }
        };

        // Initial update
        await updateLocation();

        // Set up interval
        this.updateInterval = setInterval(updateLocation, intervalMs);

        // Return cleanup function
        return () => {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        };
    }

    /**
     * Update own location in database
     */
    private async updateOwnLocation(location: LocationUpdate) {
        const { error } = await supabase.from('user_locations').upsert(
            {
                user_id: location.userId,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                is_visible: location.isVisible,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'user_id',
            }
        );

        if (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    }

    /**
     * Stop broadcasting own location
     */
    async stopBroadcasting() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Mark location as not visible
        const user = await supabase.auth.getUser();
        if (user.data.user) {
            await supabase
                .from('user_locations')
                .update({ is_visible: false })
                .eq('user_id', user.data.user.id);
        }
    }

    /**
     * Set location visibility
     */
    async setVisibility(isVisible: boolean) {
        const user = await supabase.auth.getUser();
        if (user.data.user) {
            await supabase
                .from('user_locations')
                .update({ is_visible: isVisible })
                .eq('user_id', user.data.user.id);
        }
    }
}

export const locationService = new LocationService();
