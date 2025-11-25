import { useEffect, useState } from 'react';
import { Eye, EyeOff, MapPin, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePresence } from '../../context/PresenceContext';
import { useGeoLocation } from '../../hooks/useGeoLocation';

export const HomePage = () => {
    const { session } = useAuth();
    const { state: presence, toggleVisibility, syncLocation } = usePresence();
    const { coords } = useGeoLocation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (coords) syncLocation(coords.lat, coords.lng);
    }, [coords]);

    const handleToggleVisibility = async () => {
        setLoading(true);
        try {
            await toggleVisibility();
        } catch (error) {
            console.error('Error toggling visibility:', error);
        } finally {
            setLoading(false);
        }
    };

    const isVisible = presence.isVisible;

    return (
        <div className="min-h-screen bg-theme-main px-6 pt-6 pb-32 flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-theme-primary">
                        Hola, {session?.user.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-theme-secondary text-sm flex items-center gap-1">
                        <span
                            className={`w-2 h-2 rounded-full inline-block ${isVisible ? 'bg-primary' : ''}`}
                            style={!isVisible ? { background: 'rgb(var(--text-tertiary))' } : {}}
                        ></span>
                        {isVisible ? 'En línea' : 'Desconectado'}
                    </p>
                </div>
                <div
                    onClick={() => navigate('/profile')}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 shadow-theme-md cursor-pointer hover:scale-105 transition-transform"
                    style={{ borderColor: 'rgb(var(--primary-500))', background: 'rgb(var(--bg-secondary))' }}
                >
                    <img
                        src={session?.user.avatarUrl || `https://ui-avatars.com/api/?name=${session?.user.name}`}
                        alt="Avatar"
                        style={{ borderColor: 'rgb(var(--glass-border))' }}
                        className="w-full h-full object-cover"
                    />
                </div>
            </header>

            {/* Visibility Card */}
            <div className={`rounded-3xl p-6 shadow-theme-xl mb-6 overflow-hidden flex flex-col gap-4 relative transition-all duration-500 ${isVisible
                    ? 'bg-gradient-to-br from-primary/20 via-bg-card to-bg-card border-2'
                    : 'bg-theme-card/50 border'
                }`}
                style={isVisible ? { borderColor: 'rgb(var(--primary-500) / 0.5)' } : { borderColor: 'rgb(var(--bg-secondary))' }}
            >
                {/* Glow effect when visible */}
                {isVisible && (
                    <div
                        className="absolute top-0 right-0 w-40 h-40 opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
                        style={{ background: 'rgb(var(--primary-500))' }}
                    ></div>
                )}

                <div className="flex justify-between items-start relative z-10">
                    <div
                        className={`p-2 rounded-xl transition-all ${isVisible ? 'bg-primary/20' : 'bg-theme-secondary/30'
                            }`}
                    >
                        {isVisible ? <Eye size={24} className="text-primary-color" /> : <EyeOff size={24} className="text-theme-tertiary" />}
                    </div>
                    <span
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${isVisible ? 'bg-primary/20 text-primary-color' : 'invisible'
                            }`}
                    >
                        EN LÍNEA
                    </span>
                </div>

                <div>
                    <h2 className={`text-2xl font-bold mb-1 relative z-10 transition-colors ${isVisible ? 'text-theme-primary' : 'text-theme-secondary'
                        }`}>
                        {isVisible ? 'Estás Visible' : 'Estás Oculto'}
                    </h2>
                    <p className={`text-xs relative z-10 leading-relaxed transition-colors ${isVisible ? 'text-theme-secondary' : 'text-theme-tertiary'
                        }`}>
                        {isVisible
                            ? 'Tu ubicación aproximada se muestra en el mapa.'
                            : 'Nadie puede ver tu ubicación en el mapa.'}
                    </p>
                </div>

                <button
                    onClick={handleToggleVisibility}
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-theme-lg active:scale-[0.98] disabled:opacity-70 ${isVisible
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'retro-illuminated text-theme-primary hover:shadow-theme-xl'
                        }`}
                >
                    {loading ? 'Actualizando...' : isVisible ? 'Ocultarme Ahora' : 'Hacerme Visible'}
                </button>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div
                    onClick={() => navigate('/map')}
                    className="retro-illuminated bg-theme-card/80 backdrop-blur-lg p-5 rounded-2xl shadow-theme-sm border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-theme-md group flex flex-col items-center text-center"
                    style={{ borderColor: 'rgb(var(--glass-border))' }}
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                        style={{ background: 'rgb(var(--accent-green) / 0.2)', color: 'rgb(var(--accent-green))' }}
                    >
                        <MapPin size={20} />
                    </div>
                    <h3 className="font-bold text-theme-primary">Explorar</h3>
                    <p className="text-xs text-theme-tertiary mt-1">Ver mapa en vivo</p>
                </div>
                <div
                    onClick={() => navigate('/chat')}
                    className="bg-theme-card/80 backdrop-blur-lg p-5 rounded-2xl shadow-theme-sm border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-theme-md group flex flex-col items-center text-center"
                    style={{ borderColor: 'rgb(var(--glass-border))' }}
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                        style={{ background: 'rgb(var(--accent-purple) / 0.2)', color: 'rgb(var(--accent-purple))' }}
                    >
                        <MessageCircle size={20} />
                    </div>
                    <h3 className="font-bold text-theme-primary">Mensajes</h3>
                    <p className="text-xs text-theme-tertiary mt-1">Ver conversaciones</p>
                </div>
            </div>
        </div>
    );
};
