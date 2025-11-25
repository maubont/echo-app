// Mock Location Service for Development/Testing
// Use when real geolocation is not available

export interface MockLocationConfig {
    enabled: boolean;
    defaultLocation: {
        lat: number;
        lng: number;
    };
    accuracy: number;
}

// Default location: Bogotá, Colombia
const DEFAULT_CONFIG: MockLocationConfig = {
    enabled: false, // Set to true to use mock locations
    defaultLocation: {
        lat: 4.7110,
        lng: -74.0721
    },
    accuracy: 50 // meters
};

/**
 * Get mock geolocation position
 * Simulates navigator.geolocation.getCurrentPosition response
 */
export const getMockPosition = (config: Partial<MockLocationConfig> = {}): Promise<GeolocationPosition> => {
    const { defaultLocation, accuracy } = { ...DEFAULT_CONFIG, ...config };

    return new Promise((resolve) => {
        const coords: GeolocationCoordinates = {
            latitude: defaultLocation.lat,
            longitude: defaultLocation.lng,
            accuracy: accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON() {
                return {
                    latitude: this.latitude,
                    longitude: this.longitude,
                    accuracy: this.accuracy,
                    altitude: this.altitude,
                    altitudeAccuracy: this.altitudeAccuracy,
                    heading: this.heading,
                    speed: this.speed
                };
            }
        };

        const position: GeolocationPosition = {
            coords,
            timestamp: Date.now(),
            toJSON() {
                return {
                    coords: this.coords.toJSON(),
                    timestamp: this.timestamp
                };
            }
        };

        // Simulate async behavior
        setTimeout(() => resolve(position), 100);
    });
};

/**
 * Wrapper around navigator.geolocation with mock fallback
 */
export const getCurrentPosition = (useMock: boolean = DEFAULT_CONFIG.enabled): Promise<GeolocationPosition> => {
    if (useMock) {
        console.log('🧪 Using MOCK location (Bogotá)');
        return getMockPosition();
    }

    // Try real geolocation
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('Geolocation not available. Falling back to mock.');
            return getMockPosition().then(resolve);
        }

        navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
                console.error('❌ Geolocation failed. Error Code:', error.code, 'Message:', error.message);
                console.warn('⚠️ Falling back to mock location (Bogotá) due to error.');
                getMockPosition().then(resolve);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000, // Increased to 30 seconds
                maximumAge: 300000 // Allow cached locations up to 5 minutes old
            }
        );
    });
};

/**
 * Check if mock mode is enabled
 */
export const isMockLocationEnabled = (): boolean => {
    return DEFAULT_CONFIG.enabled;
};

/**
 * Toggle mock location mode
 */
export const setMockLocationEnabled = (enabled: boolean): void => {
    DEFAULT_CONFIG.enabled = enabled;
    console.log(`Mock location ${enabled ? 'ENABLED' : 'DISABLED'}`);
};
