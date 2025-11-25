import { useState, useCallback, useEffect } from 'react';
import { getCurrentPosition as getMockOrRealPosition } from '../lib/mockLocation';

export const useGeoLocation = () => {
    const [state, setState] = useState<{
        coords: { lat: number; lng: number } | null;
        error: string | null;
        loading: boolean;
        permissionStatus: PermissionState | 'unknown' | 'denied_app_level' | 'timeout';
    }>({
        coords: null, error: null, loading: false, permissionStatus: 'unknown',
    });

    // Check permission on mount
    useEffect(() => {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'granted') {
                    setState(s => ({ ...s, permissionStatus: 'granted' }));
                } else if (result.state === 'denied') {
                    setState(s => ({ ...s, permissionStatus: 'denied_app_level' }));
                }
            }).catch(() => {
                // Ignore errors in permission query
            });
        }
    }, []);

    const getPosition = useCallback(() => {
        setState(s => ({ ...s, loading: true, error: null }));

        // Use mock or real geolocation with automatic fallback
        getMockOrRealPosition(false) // Set to false to try real GPS first
            .then((pos) => {
                setState({
                    coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                    error: null,
                    loading: false,
                    permissionStatus: 'granted'
                });
            })
            .catch((err) => {
                console.error("Geolocation Error:", err);
                setState(s => ({
                    ...s,
                    error: "No se pudo obtener la ubicación.",
                    loading: false,
                    permissionStatus: 'denied_app_level'
                }));
            });
    }, []);

    return { ...state, getPosition, requestPermission: getPosition, retry: getPosition };
};
