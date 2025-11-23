import { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, Settings, X, Navigation, Filter, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

import { useAuth } from '../../context/AuthContext';
import { usePresence } from '../../context/PresenceContext';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { Button } from '../../components/ui/Button';
import { AppContextMode, MapEntity } from '../../lib/types';
import { StatusModal } from '../../components/map/StatusModal';
import { CATEGORY_OPTIONS, MODE_ICONS } from '../../lib/constants';
import { PresenceService } from '../../services/presence';
import { locationService } from '../../services/location';
import { statusService } from '../../services/status';

// Fix for Leaflet plugins that rely on global L
if (typeof window !== 'undefined') {
    (window as any).L = L;
}

const INITIAL_VIEW = { lat: 4.5709, lng: -74.2973 }; // Colombia General View

const PublicProfileModal = ({ entity, onClose }: { entity: MapEntity, onClose: () => void }) => {
    const navigate = useNavigate();

    const handleConnect = () => {
        onClose();
        navigate('/chat', {
            state: {
                userId: entity.id,
                userName: entity.name,
                userAvatar: entity.avatarUrl
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
                <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white p-1.5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="px-6 pb-6 -mt-12">
                    <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg mb-3">
                        <img
                            src={entity.avatarUrl || `https://ui-avatars.com/api/?name=${entity.name}&background=random`}
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    <div className="flex justify-between items-start mb-1">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{entity.name}</h2>
                            <p className="text-slate-500 text-sm flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${entity.type === 'business' ? 'bg-purple-500' : 'bg-green-500'}`} />
                                {entity.type === 'business' ? 'Negocio Local' : 'Persona'}
                            </p>
                        </div>
                        <div className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase text-slate-500">
                            {entity.mode}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {entity.categories.map(cat => (
                            <span key={cat} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-bold">
                                {cat}
                            </span>
                        ))}
                    </div>

                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-6 border border-slate-100">
                        "{entity.description}"
                    </p>

                    <Button fullWidth label="Enviar Mensaje" icon={<MessageCircle size={18} />} onClick={handleConnect} />
                </div>
            </div>
        </div>
    )
};

export const MapPage = () => {
    const { session } = useAuth();
    const { state: presence } = usePresence();
    const { coords, getPosition, loading: locLoading, error: locError } = useGeoLocation();
    const navigate = useNavigate();

    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const markersGroupRef = useRef<any>(null);

    const [entities, setEntities] = useState<MapEntity[]>([]);
    const [entitiesLoading, setEntitiesLoading] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Filter state
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [maxDistance, setMaxDistance] = useState<number>(5000); // meters
    const [showFilters, setShowFilters] = useState(false);

    // Load entities from Supabase - Real-time location and status tracking
    useEffect(() => {
        if (!coords) {
            setEntities([]);
            return;
        }

        setEntitiesLoading(true);

        // Subscribe to real-time location updates
        const unsubscribeLocations = locationService.subscribeToNearbyLocations(async (locations) => {
            // Fetch statuses for these users
            const statuses = await statusService.fetchActiveStatuses();
            const statusMap = new Map(statuses.map(s => [s.userId, s]));

            // Convert locations to MapEntities
            const newEntities: MapEntity[] = locations.map(loc => {
                const status = statusMap.get(loc.id);
                return {
                    id: loc.id,
                    lat: loc.latitude,
                    lng: loc.longitude,
                    type: 'person', // TODO: Get from profile
                    mode: session?.user.currentMode || 'networking',
                    categories: [], // TODO: Get from profile
                    name: `Usuario ${loc.id.substring(0, 6)}`, // TODO: Get from profile
                    description: 'Disponible para conectar.',
                    avatarUrl: `https://ui-avatars.com/api/?name=User`,
                    lastSeen: new Date(loc.updatedAt).getTime(),
                    status: status ? {
                        emoji: status.emoji,
                        text: status.text,
                        createdAt: status.createdAt,
                        expiresAt: status.expiresAt
                    } : undefined
                };
            });

            setEntities(newEntities);
            setEntitiesLoading(false);
        });

        // Subscribe to real-time status updates
        const unsubscribeStatuses = statusService.subscribeToStatuses(async () => {
            // Refresh locations to get updated statuses
            const locations = await locationService.fetchNearbyLocations(maxDistance);
            const statuses = await statusService.fetchActiveStatuses();
            const statusMap = new Map(statuses.map(s => [s.userId, s]));

            const newEntities: MapEntity[] = locations.map(loc => {
                const status = statusMap.get(loc.id);
                return {
                    id: loc.id,
                    lat: loc.latitude,
                    lng: loc.longitude,
                    type: 'person',
                    mode: session?.user.currentMode || 'networking',
                    categories: [],
                    name: `Usuario ${loc.id.substring(0, 6)}`,
                    description: 'Disponible para conectar.',
                    avatarUrl: `https://ui-avatars.com/api/?name=User`,
                    lastSeen: new Date(loc.updatedAt).getTime(),
                    status: status ? {
                        emoji: status.emoji,
                        text: status.text,
                        createdAt: status.createdAt,
                        expiresAt: status.expiresAt
                    } : undefined
                };
            });

            setEntities(newEntities);
        });

        // Start broadcasting own location
        locationService.startBroadcasting(
            () => new Promise((resolve, reject) => {
                if (!coords) {
                    reject(new Error('No coordinates'));
                    return;
                }
                resolve({
                    coords: {
                        latitude: coords.lat,
                        longitude: coords.lng,
                        accuracy: 10,
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null
                    },
                    timestamp: Date.now()
                } as GeolocationPosition);
            }),
            10000 // Update every 10 seconds
        );

        return () => {
            unsubscribeLocations();
            unsubscribeStatuses();
            locationService.stopBroadcasting();
        };
    }, [coords, session?.user.currentMode, maxDistance]);

    // Initialize Map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            zoomControl: true,
            attributionControl: false,
            minZoom: 3
        }).setView([INITIAL_VIEW.lat, INITIAL_VIEW.lng], 5); // Zoomed out view of Colombia

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // @ts-ignore
        if (L.markerClusterGroup) {
            // @ts-ignore
            markersGroupRef.current = L.markerClusterGroup({
                showCoverageOnHover: false,
                maxClusterRadius: 40,
                iconCreateFunction: function (cluster: any) {
                    var childCount = cluster.getChildCount();
                    return L.divIcon({
                        html: '<div class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-lg">' + childCount + '</div>',
                        className: 'bg-transparent',
                        iconSize: [40, 40]
                    });
                }
            });
            map.addLayer(markersGroupRef.current);
        }

        mapRef.current = map;
        getPosition();
    }, []);

    // Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // Filter entities based on distance and categories
    const filteredEntities = useMemo(() => {
        if (!coords) return entities;

        return entities.filter(ent => {
            // Distance filter
            const distance = calculateDistance(coords.lat, coords.lng, ent.lat, ent.lng);
            if (distance > maxDistance) return false;

            // Category filter (only if categories are selected)
            if (selectedCategories.length > 0) {
                const hasMatchingCategory = ent.categories.some(cat => selectedCategories.includes(cat));
                if (!hasMatchingCategory) return false;
            }

            return true;
        });
    }, [entities, coords, maxDistance, selectedCategories]);

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const allCategories = session?.user.currentMode ? CATEGORY_OPTIONS[session.user.currentMode] : [];

    // Update Map Markers & View
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const clusterGroup = markersGroupRef.current;

        if (coords) {
            // Optional: map.setView([coords.lat, coords.lng], 16);
        }

        if (clusterGroup) clusterGroup.clearLayers();

        map.eachLayer(layer => {
            if ((layer as any).options?.icon?.options?.className?.includes('user-indicator')) map.removeLayer(layer);
        });

        if (presence.isVisible && coords) {
            const jittered = PresenceService.applyJitter(coords.lat, coords.lng);

            L.circle([coords.lat, coords.lng], { radius: 100, color: 'transparent', fillColor: '#3b82f6', fillOpacity: 0.1 }).addTo(map);

            const userIcon = L.divIcon({
                className: 'user-indicator',
                html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg ring-4 ring-blue-500/30"></div>`,
                iconSize: [16, 16]
            });
            L.marker([jittered.lat, jittered.lng], { icon: userIcon }).addTo(map);
        }

        const markers: L.Marker[] = [];

        filteredEntities.forEach(ent => {
            if (ent.mode !== session?.user.currentMode && ent.type !== 'business') return;

            const hasStatus = ent.status && ent.status.expiresAt > Date.now();

            const iconHtml = hasStatus
                ? `<div class="relative">
                     <div class="w-12 h-12 bg-white rounded-full shadow-lg border-2 border-blue-500 flex items-center justify-center text-2xl animate-in zoom-in">
                        ${ent.status!.emoji}
                     </div>
                     <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm font-bold max-w-[100px] truncate">
                        ${ent.status!.text}
                     </div>
                   </div>`
                : `<div class="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-slate-200">
                     <img src="${ent.avatarUrl || `https://ui-avatars.com/api/?name=${ent.name}`}" class="w-full h-full object-cover" />
                   </div>`;

            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: iconHtml,
                iconSize: hasStatus ? [48, 48] : [40, 40],
                iconAnchor: hasStatus ? [24, 24] : [20, 20]
            });

            const marker = L.marker([ent.lat, ent.lng], { icon: customIcon })
                .bindPopup(`
                    <div class="p-2 min-w-[200px]">
                        <div class="flex items-center gap-3 mb-2">
                            <img src="${ent.avatarUrl || `https://ui-avatars.com/api/?name=${ent.name}`}" class="w-10 h-10 rounded-full object-cover" />
                            <div>
                                <h3 class="font-bold text-slate-900">${ent.name}</h3>
                                <p class="text-xs text-slate-500 capitalize">${ent.mode}</p>
                            </div>
                        </div>
                        ${hasStatus ? `
                            <div class="bg-blue-50 p-2 rounded-lg mb-2 border border-blue-100">
                                <p class="text-sm text-blue-800 font-medium">"${ent.status!.text}"</p>
                                <p class="text-[10px] text-blue-400 mt-1">Expira en ${Math.ceil((ent.status!.expiresAt - Date.now()) / (1000 * 60 * 60))}h</p>
                            </div>
                        ` : ''}
                        <p class="text-sm text-slate-600 mb-3">${ent.description}</p>
                        <button onclick="window.location.href='/chat?userId=${ent.id}'" class="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                            Mensaje
                        </button>
                    </div>
                `);

            markers.push(marker);
        });

        if (clusterGroup) clusterGroup.addLayers(markers);

    }, [coords, filteredEntities, presence.isVisible]);

    const handleRecenter = () => {
        if (coords && mapRef.current) {
            mapRef.current.setView([coords.lat, coords.lng], 16);
        } else {
            getPosition();
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);

                if (mapRef.current) {
                    mapRef.current.flyTo([newLat, newLng], 16);
                    // Manually override coords for demo purposes (in a real app, we'd have a separate 'manualLocation' state)
                    // For now, let's just move the view. The user can drag the pin if we implement that next.
                }
            }
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const [showStatusModal, setShowStatusModal] = useState(false);

    const handleStatusSave = async (status: any) => {
        try {
            // Save status to Supabase
            await statusService.setStatus(
                status.emoji,
                status.text,
                (status.expiresAt - status.createdAt) / (1000 * 60 * 60) // Convert to hours
            );
            // The real-time subscription will automatically update the UI
        } catch (error) {
            console.error('Error saving status:', error);
            // TODO: Show error toast to user
        }
    };

    return (
        <div className="h-screen w-full relative bg-slate-100">
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* Search Bar (Manual Location) */}
            <div className="absolute top-20 left-4 right-4 z-20">
                <form onSubmit={handleSearch} className="bg-white/90 backdrop-blur rounded-xl shadow-lg flex items-center p-2 gap-2">
                    <input
                        type="text"
                        placeholder="Buscar ciudad (ej: La Gloria, Cesar)..."
                        className="bg-transparent flex-1 outline-none text-sm px-2"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" disabled={isSearching} className="bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50">
                        {isSearching ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Navigation size={16} className="rotate-90" />}
                    </button>
                </form>
            </div>

            {/* Loading States */}
            {(locLoading || entitiesLoading) && (
                <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-sm px-4 py-2 rounded-full z-20 flex items-center gap-2 text-xs font-bold text-slate-600">
                    <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full text-blue-600" />
                    {locLoading ? 'Obteniendo GPS...' : 'Buscando gente...'}
                </div>
            )}

            {/* Error State */}
            {locError && !coords && (
                <div className="absolute top-32 left-4 right-4 bg-red-50 border border-red-100 p-3 rounded-xl z-20 flex items-start gap-3 shadow-lg animate-in slide-in-from-top-2">
                    <div className="text-red-500 shrink-0 mt-0.5"><X size={16} /></div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-red-800">Ubicación no disponible</p>
                        <p className="text-[10px] text-red-600 mt-0.5">{locError}</p>
                        <button
                            onClick={() => getPosition()}
                            className="mt-2 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-md font-bold hover:bg-red-200 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {/* Context Selector (Top) */}
            <div className="absolute top-4 left-4 right-4 z-10">
                <div className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg flex justify-between items-center">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Modo Actual</p>
                        <p className="font-bold text-slate-800 capitalize flex items-center gap-2">
                            {MODE_ICONS[session?.user.currentMode || 'networking']}
                            {session?.user.currentMode || 'Cargando...'}
                        </p>
                        {coords && (
                            <p className="text-[10px] text-blue-600 font-bold mt-1">
                                {filteredEntities.length} personas cerca
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowStatusModal(true)}
                            className="bg-white/90 backdrop-blur p-2.5 rounded-full shadow-sm border border-white/50 text-slate-600 hover:text-blue-600 transition-colors"
                        >
                            <span className="text-xl">💭</span>
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors ${showFilters ? 'bg-blue-100' : 'bg-slate-100'}`}
                        >
                            <Sliders size={18} />
                        </button>
                        <button onClick={() => navigate('/profile')} className="bg-slate-100 p-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && coords && (
                    <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg mt-2 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-3">
                            <Filter size={16} className="text-slate-600" />
                            <h3 className="font-bold text-sm text-slate-800">Filtros</h3>
                        </div>

                        {/* Distance Slider */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-600">Distancia máxima</label>
                                <span className="text-xs font-bold text-blue-600">
                                    {maxDistance >= 1000 ? `${(maxDistance / 1000).toFixed(1)} km` : `${maxDistance} m`}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="500"
                                max="5000"
                                step="500"
                                value={maxDistance}
                                onChange={(e) => setMaxDistance(Number(e.target.value))}
                                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Category Filters */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-2">Categorías</label>
                            <div className="flex flex-wrap gap-2">
                                {allCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`text - xs px - 3 py - 1.5 rounded - lg font - bold transition - colors ${selectedCategories.includes(cat)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            } `}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            {selectedCategories.length > 0 && (
                                <button
                                    onClick={() => setSelectedCategories([])}
                                    className="text-xs text-blue-600 font-bold mt-2 hover:underline"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Recenter Button */}
            <div className="absolute bottom-24 right-4 z-20">
                <button
                    onClick={handleRecenter}
                    className="bg-white p-3 rounded-full shadow-lg text-blue-600 hover:bg-blue-50 transition-colors active:scale-95"
                >
                    <Navigation size={24} className={locLoading ? 'animate-pulse' : ''} />
                </button>
            </div>

            {/* Selected Entity Popup */}
            {selectedEntity && !showProfileModal && (
                <div className="absolute bottom-24 left-4 right-4 z-30">
                    <div className="bg-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{selectedEntity.name}</h3>
                            <button onClick={() => setSelectedEntity(null)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">{selectedEntity.description}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Button label="Ver Perfil" variant="secondary" size="sm" onClick={() => setShowProfileModal(true)} />
                            <Button label="Conectar" size="sm" icon={<MessageCircle size={16} />} onClick={() => {
                                setSelectedEntity(null);
                                navigate('/chat', {
                                    state: {
                                        userId: selectedEntity.id,
                                        userName: selectedEntity.name,
                                        userAvatar: selectedEntity.avatarUrl
                                    }
                                });
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {showProfileModal && selectedEntity && (
                <PublicProfileModal entity={selectedEntity} onClose={() => setShowProfileModal(false)} />
            )}

            <StatusModal
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                onSave={handleStatusSave}
            />
        </div>
    );
};

