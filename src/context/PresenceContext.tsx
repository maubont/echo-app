import React, { createContext, useContext, useState } from 'react';
import { PresenceState } from '../lib/types';
import { PresenceService } from '../services/presence';
import { useAuth } from './AuthContext';

interface PresenceContextType {
    state: PresenceState;
    toggleVisibility: (durationMinutes?: number) => void;
    syncLocation: (lat: number, lng: number) => void;
}

const PresenceContext = createContext<PresenceContextType>(null!);

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useAuth();
    const [presenceState, setPresenceState] = useState<PresenceState>({
        isVisible: false, lat: null, lng: null, lastHeartbeat: null
    });

    const presenceMethods = {
        state: presenceState,
        toggleVisibility: (minutes = 60) => {
            setPresenceState(prev => ({
                ...prev,
                isVisible: !prev.isVisible,
                expiresAt: !prev.isVisible ? Date.now() + minutes * 60000 : undefined
            }));
        },
        syncLocation: (lat: number, lng: number) => {
            setPresenceState(prev => ({ ...prev, lat, lng, lastHeartbeat: Date.now() }));
            if (session?.user) {
                const jittered = PresenceService.applyJitter(lat, lng);
                PresenceService.syncPresence(session.user.id, jittered.lat, jittered.lng, session.user.currentMode, presenceState.isVisible);
            }
        }
    };

    return (
        <PresenceContext.Provider value={presenceMethods}>
            {children}
        </PresenceContext.Provider>
    );
};
