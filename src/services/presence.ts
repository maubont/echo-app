import { supabase } from './api';

export const PresenceService = {
    applyJitter: (lat: number, lng: number, meters = 150): { lat: number, lng: number } => {
        const r = meters / 111300;
        const u = Math.random();
        const v = Math.random();
        const w = r * Math.sqrt(u);
        const t = 2 * Math.PI * v;
        const x = w * Math.cos(t);
        const y = w * Math.sin(t);
        return {
            lat: lat + x,
            lng: lng + (y / Math.cos(lat * (Math.PI / 180)))
        };
    },

    syncPresence: async (userId: string, lat: number, lng: number, mode: string, isVisible: boolean) => {
        return await supabase.from('presence').upsert({
            user_id: userId,
            lat: isVisible ? lat : null,
            lng: isVisible ? lng : null,
            mode,
            last_seen: new Date().toISOString()
        });
    }
};
