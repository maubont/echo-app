import { useEffect, useState, useRef, useMemo } from 'react';
import { X, MessageCircle, Locate, Sparkles, Zap } from 'lucide-react';
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

const STATUS_EMOJIS: Record<string, string> = {
    coffee: '☕',
    work: '💻',
    home: '🏠',
    food: '🍔',
    party: '🎉',
    gym: '💪',
    study: '📚',
    travel: '✈️'
};

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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="glass-effect w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300 border transition-all" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                <div className="h-32 relative" style={{ background: 'linear-gradient(135deg, rgb(var(--primary-500)), rgb(var(--accent-magenta)))' }}>
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white p-2 rounded-full transition-all hover:scale-105 backdrop-blur-sm">
                        <X size={20} />
                    </button>
                </div>
                <div className="px-6 pb-8 -mt-16 relative">
                    <div className="w-32 h-32 p-1.5 rounded-full shadow-theme-xl mb-4 mx-auto relative group" style={{ background: 'rgb(var(--bg-card))' }}>
                        <img
                            src={entity.avatarUrl || `https://ui-avatars.com/api/?name=${entity.name}&background=random`}
                            className="w-full h-full rounded-full object-cover border" style={{ borderColor: 'rgb(var(--glass-border))' }}
                        />
                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 ${entity.type === 'business' ? 'bg-accent-purple' : 'bg-primary'}`} style={{ borderColor: 'rgb(var(--bg-card))' }} />
                    </div>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-theme-primary mb-1">{entity.name}</h2>
                        <p className="text-theme-secondary font-medium flex items-center justify-center gap-2">
                            {entity.type === 'business' ? 'Negocio Local' : 'Persona'} • <span className="uppercase text-xs font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20" style={{ color: 'rgb(var(--primary-500))' }}>{entity.mode}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {entity.categories.map(cat => (
                            <span key={cat} className="backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border bg-primary/10" style={{ color: 'rgb(var(--primary-500))', borderColor: 'rgb(var(--primary-500) / 0.3)' }}>
                                {cat}
                            </span>
                        ))}
                    </div>

                    <p className="text-sm text-theme-secondary p-4 rounded-2xl mb-8 border leading-relaxed text-center" style={{ background: 'rgb(var(--bg-secondary) / 0.3)', borderColor: 'rgb(var(--glass-border))' }}>
                        "{entity.description}"
                    </p>

                    <Button fullWidth label="Enviar Mensaje" icon={<MessageCircle size={20} />} onClick={handleConnect} className="shadow-theme-xl" />
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
    const [maxDistance, setMaxDistance] = useState<number>(50000); // Default 50km for better testing
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
                    mode: (loc.mode as AppContextMode) || 'networking',
                    categories: [], // Categories still need to be fetched if we want them, but for now empty is fine
                    name: loc.name,
                    description: 'Disponible para conectar.',
                    avatarUrl: loc.avatarUrl, // Use real avatar URL (can be null)
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

        // NOTE: Broadcasting is now handled globally by PresenceContext to persist across navigation.
        // We do NOT start/stop broadcasting here anymore.

        return () => {
            unsubscribeLocations();
            unsubscribeStatuses();
        };
    }, [coords, session?.user.currentMode, maxDistance]);

    // Initialize Map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: false,
            minZoom: 3
        }).setView([INITIAL_VIEW.lat, INITIAL_VIEW.lng], 5); // Zoomed out view of Colombia

        // Add Zoom Control to bottom-left to avoid search bar overlap
        L.control.zoom({ position: 'bottomleft' }).addTo(map);

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
    const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
    const hasCenteredRef = useRef(false);

    useEffect(() => {
        if (!mapRef.current || !markersGroupRef.current) return;
        const map = mapRef.current;
        const clusterGroup = markersGroupRef.current;

        if (coords && !hasCenteredRef.current) {
            map.setView([coords.lat, coords.lng], 16);
            hasCenteredRef.current = true;
        }

        // 1. Handle User's Own Indicator (Blue Dot)
        // Clear previous user indicators
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

        // 2. Handle Other Users/Entities (Diffing Logic)
        const currentEntityIds = new Set(filteredEntities.map(e => e.id));

        // Remove markers that are no longer visible
        markersMapRef.current.forEach((marker, id) => {
            if (!currentEntityIds.has(id)) {
                clusterGroup.removeLayer(marker);
                markersMapRef.current.delete(id);
            }
        });

        // Update or Create markers
        filteredEntities.forEach(ent => {
            // Removed mode filter for now as we don't have remote user profiles yet
            // if (ent.mode !== session?.user.currentMode && ent.type !== 'business') return;

            const hasStatus = ent.status && ent.status.expiresAt > Date.now();
            const statusEmoji = hasStatus ? (STATUS_EMOJIS[ent.status!.emoji] || '📍') : '';

            const iconHtml = hasStatus
                ? `<div class="relative w-12 h-12 group cursor-pointer transition-transform hover:scale-110">
                     <div class="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden bg-slate-200">
                        <img src="${ent.avatarUrl || `https://ui-avatars.com/api/?name=${ent.name}&background=random`}" class="w-full h-full object-cover" onerror="this.src='https://ui-avatars.com/api/?name=User&background=random'"/>
                     </div>
                     <div class="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200 text-sm animate-in zoom-in">
                        ${statusEmoji}
                     </div>
                     <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap border border-gray-100 max-w-[100px] truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        ${ent.status!.text}
                     </div>
                   </div>`
                : `<div class="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-slate-200 cursor-pointer transition-transform hover:scale-110">
                     <img src="${ent.avatarUrl || `https://ui-avatars.com/api/?name=${ent.name}&background=random`}" class="w-full h-full object-cover" onerror="this.src='https://ui-avatars.com/api/?name=User&background=random'"/>
                   </div>`;

            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: iconHtml,
                iconSize: hasStatus ? [48, 48] : [40, 40],
                iconAnchor: hasStatus ? [24, 24] : [20, 20]
            });

            const popupContent = `
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
            `;

            if (markersMapRef.current.has(ent.id)) {
                // UPDATE existing marker
                const marker = markersMapRef.current.get(ent.id)!;
                const currentLatLng = marker.getLatLng();

                // Only update position if changed significantly (optional optimization)
                if (currentLatLng.lat !== ent.lat || currentLatLng.lng !== ent.lng) {
                    marker.setLatLng([ent.lat, ent.lng]);
                }

                marker.setIcon(customIcon);

                // Update popup content only if not open? Or always?
                // If we update popup content while open, Leaflet might handle it or we might need to check
                if (marker.getPopup()) {
                    marker.setPopupContent(popupContent);
                }
            } else {
                // CREATE new marker
                const marker = L.marker([ent.lat, ent.lng], { icon: customIcon })
                    .bindPopup(popupContent);

                clusterGroup.addLayer(marker);
                markersMapRef.current.set(ent.id, marker);
            }
        });

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

    const handleSaveStatus = async (status: any) => {
        try {
            const durationHours = Math.round((status.expiresAt - status.createdAt) / (1000 * 60 * 60));
            await statusService.setStatus(status.emoji, status.text, durationHours);
        } catch (error) {
            console.error("Error saving status:", error);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 relative">
            {/* Map Container */}
            <div ref={containerRef} className="flex-1 z-0" />

            {/* Top Bar */}
            <div className="absolute top-4 left-4 right-4 z-400 flex gap-3 max-w-md mx-auto">
                <div className="flex-1 glass rounded-2xl flex items-center p-1.5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 relative">
                    <form onSubmit={handleSearch} className="flex-1 flex items-center">
                        <input
                            type="text"
                            placeholder="Buscar lugares..."
                            className="w-full bg-transparent outline-none text-slate-700 placeholder-slate-400 px-3 py-2 text-sm font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    {entities.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {entities.length} cerca
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-12 h-12 rounded-2xl glass flex items-center justify-center transition-all active:scale-95 ${showFilters ? 'bg-blue-600 text-white border-transparent' : 'text-slate-600 hover:bg-white'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="absolute top-20 left-4 right-4 z-400 glass rounded-[24px] p-5 animate-in slide-in-from-top-4 duration-300 max-w-md mx-auto">
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distancia Máxima</h3>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{maxDistance / 1000} km</span>
                        </div>
                        <input
                            type="range"
                            min="1000"
                            max="50000"
                            step="1000"
                            value={maxDistance}
                            onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium">
                            <span>1 km</span>
                            <span>50 km</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Categorías</h3>
                        <div className="flex flex-wrap gap-2">
                            {allCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${selectedCategories.includes(cat)
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-slate-100/50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Controls */}
            {!showStatusModal && (
                <div className="absolute bottom-28 right-4 flex flex-col gap-4 z-400">
                    <button
                        onClick={handleRecenter}
                        className="w-12 h-12 glass-effect rounded-full shadow-theme-lg flex items-center justify-center text-theme-primary hover:shadow-theme-xl transition-all active:scale-95"
                        title="Centrar en mi ubicación"
                    >
                        <Locate size={22} />
                    </button>
                    <button
                        onClick={() => setShowStatusModal(true)}
                        className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all border-2 relative group"
                        style={{ boxShadow: 'var(--glow-cyan)', borderColor: 'rgb(var(--primary-300) / 0.3)' }}
                    >
                        <Sparkles size={24} className="animate-pulse" />
                        <span className="absolute right-full mr-3 glass-effect px-3 py-1 rounded-xl text-xs font-bold text-theme-primary shadow-theme-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Actualizar Estado
                        </span>
                    </button>
                </div>
            )}

            {/* Modals */}
            {selectedEntity && showProfileModal && (
                <PublicProfileModal
                    entity={selectedEntity}
                    onClose={() => {
                        setShowProfileModal(false);
                        setSelectedEntity(null);
                    }}
                />
            )}

            {showStatusModal && (
                <StatusModal
                    isOpen={showStatusModal}
                    onClose={() => setShowStatusModal(false)}
                    onSave={handleSaveStatus}
                />
            )}
        </div>
    );
};
