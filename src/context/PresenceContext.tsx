import React, { createContext, useContext, useState, useEffect } from 'react';
import { PresenceState } from '../lib/types';
import { PresenceService } from '../services/presence';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { locationService } from '../services/location';

interface PresenceContextType {
    state: PresenceState;
    toggleVisibility: (durationMinutes?: number) => Promise<void>;
    syncLocation: (lat: number, lng: number) => void;
}

const PresenceContext = createContext<PresenceContextType>(null!);

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useAuth();
    const [presenceState, setPresenceState] = useState<PresenceState>({
        isVisible: false, lat: null, lng: null, lastHeartbeat: null
    });

    // 1. INITIAL FETCH & REALTIME SUBSCRIPTION
    useEffect(() => {
        if (!session?.user?.id) return;

        // Fetch initial state
        const fetchInitialState = async () => {
            const { data } = await supabase
                .from('user_locations')
                .select('is_visible, latitude, longitude')
                .eq('user_id', session.user.id)
                .single();

            if (data) {
                setPresenceState(prev => ({
                    ...prev,
                    isVisible: data.is_visible,
                    lat: data.latitude,
                    lng: data.longitude
                }));
            }
        };
        fetchInitialState();

        // Subscribe to changes (Single Source of Truth)
        const channel = supabase
            .channel('own_presence')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_locations',
                    filter: `user_id=eq.${session.user.id}`
                },
                (payload) => {
                    const newData = payload.new as any; // Cast to any to avoid TS errors with dynamic Supabase types
                    setPresenceState(prev => ({
                        ...prev,
                        isVisible: newData.is_visible,
                        lat: newData.latitude,
                        lng: newData.longitude
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    const presenceMethods = {
        state: presenceState,

        toggleVisibility: async (minutes = 60) => {
            // We optimistically update UI, but the real truth comes from DB subscription
            const newVisibility = !presenceState.isVisible;

            try {
                if (newVisibility) {
                    // To become visible, we need location. 
                    // We assume locationService is handled by the component calling this, 
                    // OR we trigger a one-time update here if needed.
                    // For now, we rely on the component to start broadcasting.
                    // BUT, if we just want to toggle the flag:
                    await locationService.setVisibility(true);
                } else {
                    await locationService.stopBroadcasting();
                }
            } catch (error) {
                console.error("Error toggling visibility:", error);
                // Revert optimistic update if needed (though subscription handles truth)
            }
        },

        syncLocation: (lat: number, lng: number) => {
            setPresenceState(prev => ({ ...prev, lat, lng, lastHeartbeat: Date.now() }));
            // We don't push to DB here on every sync to avoid flooding, 
            // locationService.startBroadcasting handles the interval updates.
        }
    };

    return (
        <PresenceContext.Provider value={presenceMethods}>
            {children}
        </PresenceContext.Provider>
    );
};
