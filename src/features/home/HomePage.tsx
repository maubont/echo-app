import { useEffect } from 'react';
import { Eye, EyeOff, MapPin, MessageCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePresence } from '../../context/PresenceContext';
import { useGeoLocation } from '../../hooks/useGeoLocation';

export const HomePage = () => {
    const { session } = useAuth();
    const { state: presence, toggleVisibility, syncLocation } = usePresence();
    const { coords } = useGeoLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (coords) syncLocation(coords.lat, coords.lng);
    }, [coords]);

    return (
        <div className="h-screen bg-slate-50 p-6 flex flex-col">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Hola, {session?.user.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500 text-sm flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                        En línea
                    </p>
                </div>
                <div onClick={() => navigate('/profile')} className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow cursor-pointer">
                    <img src={session?.user.avatarUrl || `https://ui-avatars.com/api/?name=${session?.user.name}`} className="w-full h-full object-cover" />
                </div>
            </header>

            <div className={`rounded-3xl p-6 text-white shadow-xl mb-6 transition-all relative overflow-hidden ${presence.isVisible ? 'bg-blue-600' : 'bg-slate-800'}`}>
                {presence.isVisible && <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />}

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        {presence.isVisible ? <Eye size={24} /> : <EyeOff size={24} />}
                    </div>
                    {presence.isVisible && <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">EXPIRA: 59m</span>}
                </div>
                <h2 className="text-2xl font-bold mb-1 relative z-10">{presence.isVisible ? 'Estás Visible' : 'Estás Oculto'}</h2>
                <p className="text-blue-100 text-xs mb-6 relative z-10 leading-relaxed opacity-90">
                    {presence.isVisible ? 'Tu ubicación aproximada se muestra en el mapa para otros usuarios en modo ' + session?.user.currentMode : 'Nadie puede ver tu ubicación en el mapa.'}
                </p>
                <button
                    onClick={() => toggleVisibility()}
                    className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg active:scale-[0.98]"
                >
                    {presence.isVisible ? 'Ocultarme Ahora' : 'Hacerme Visible'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div onClick={() => navigate('/map')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 cursor-pointer transition-all hover:-translate-y-1 group">
                    <div className="bg-green-50 w-10 h-10 rounded-full flex items-center justify-center text-green-600 mb-3 group-hover:scale-110 transition-transform">
                        <MapPin size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800">Explorar</h3>
                    <p className="text-xs text-slate-500 mt-1">Ver mapa en vivo</p>
                </div>
                <div onClick={() => navigate('/chat')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 cursor-pointer transition-all hover:-translate-y-1 group">
                    <div className="bg-indigo-50 w-10 h-10 rounded-full flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                        <MessageCircle size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800">Mensajes</h3>
                    <p className="text-xs text-slate-500 mt-1">Ver conversaciones</p>
                </div>
            </div>
        </div>
    );
};
