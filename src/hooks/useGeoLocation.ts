import { useState, useCallback, useEffect } from 'react';

export const useGeoLocation = () => {
    const [state, setState] = useState<{
        coords: { lat: number; lng: number } | null;
        error: string | null;
        loading: boolean;
        permissionStatus: PermissionState | 'unknown' | 'denied_app_level' | 'timeout';
    }>({
        coords: null, error: null, loading: false, permissionStatus: 'unknown',
    });

    const getPosition = useCallback(() => {
        if (!navigator.geolocation) {
            return setState(s => ({ ...s, error: "Geolocalización no soportada por este navegador.", permissionStatus: 'denied_app_level' }));
        }

        setState(s => ({ ...s, loading: true, error: null }));

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setState({
                    coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                    error: null,
                    loading: false,
                    permissionStatus: 'granted'
                });
            },
            (err) => {
                console.error("Geolocation Error:", err);
                let errorMessage = "No se pudo obtener la ubicación.";
                let status: 'denied_app_level' | 'timeout' = 'denied_app_level';

                switch (err.code) {
                    case 1: // PERMISSION_DENIED
                        errorMessage = "Permiso denegado. Por favor habilita la ubicación en tu navegador.";
                        status = 'denied_app_level';
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        errorMessage = "Ubicación no disponible. Verifica tu conexión a internet/GPS.";
                        status = 'denied_app_level';
                        break;
                    case 3: // TIMEOUT
                        errorMessage = "Se agotó el tiempo de espera. Intenta de nuevo.";
                        status = 'timeout';
                        break;
                }

                setState(s => ({
                    ...s,
                    error: errorMessage,
                    loading: false,
                    permissionStatus: status
                }));
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return { ...state, getPosition, retry: getPosition };
};
