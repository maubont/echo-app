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
    const [broadcastCleanup, setBroadcastCleanup] = useState<(() => void) | null>(null);

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

                // If user was visible before, restart broadcasting
                if (data.is_visible) {
                    startLocationBroadcast();
                }
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
                    const newData = payload.new as any;
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
            // Stop broadcasting on unmount
            if (broadcastCleanup) {
                broadcastCleanup();
            }
        };
    }, [session?.user?.id]);

    const getCurrentLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            // Try high accuracy first
            navigator.geolocation.getCurrentPosition(
                resolve,
                (error) => {
                    console.warn('High accuracy location failed, trying low accuracy...', error);
                    // Fallback to low accuracy
                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        reject,
                        {
                            enableHighAccuracy: false,
                            timeout: 20000,
                            maximumAge: 30000
                        }
                    );
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    };

    const startLocationBroadcast = async () => {
        if (!session?.user?.id) return;

        try {
            // Stop any existing broadcast first
            if (broadcastCleanup) {
                broadcastCleanup();
            }

            // Start new broadcast
            const cleanup = await locationService.startBroadcasting(
                session.user.id,
                getCurrentLocation,
                20000 // Update every 20 seconds (relaxed from 10s)
            );

            setBroadcastCleanup(() => cleanup);
        } catch (error) {
            console.error('Failed to start location broadcast:', error);
            throw error;
        }
    };

    const presenceMethods = {
        state: presenceState,

        toggleVisibility: async (minutes = 60) => {
            const newVisibility = !presenceState.isVisible;

            try {
                if (newVisibility) {
                    // Becoming visible: start broadcasting location
                    await startLocationBroadcast();
                } else {
                    // Becoming invisible: stop broadcasting
                    if (broadcastCleanup) {
                        broadcastCleanup();
                        setBroadcastCleanup(null);
                    }
                    await locationService.stopBroadcasting();
                }
            } catch (error) {
                console.error("Error toggling visibility:", error);
                throw error;
            }
        },

        syncLocation: (lat: number, lng: number) => {
            setPresenceState(prev => ({ ...prev, lat, lng, lastHeartbeat: Date.now() }));
        }
    };

    return (
        <PresenceContext.Provider value={presenceMethods}>
            {children}
        </PresenceContext.Provider>
    );
};
