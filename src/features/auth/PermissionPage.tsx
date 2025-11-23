import { useEffect } from 'react';
import { AlertTriangle, Info, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { Button } from '../../components/ui/Button';

export const PermissionPage = () => {
    const { requestPermission, permissionStatus, loading } = useGeoLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (permissionStatus === 'granted') navigate('/home');
    }, [permissionStatus, navigate]);

    return (
        <div className="h-screen bg-white px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6">
                <LocateFixed size={40} />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-3">Habilita tu Ubicación</h2>

            <div className="bg-slate-50 p-4 rounded-xl text-left mb-8 border border-slate-100">
                <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <Info size={16} className="text-blue-500" /> ¿Por qué lo necesitamos?
                </h4>
                <ul className="text-sm text-slate-500 space-y-2 list-disc pl-5">
                    <li>Para mostrarte eventos y personas a tu alrededor.</li>
                    <li>Para verificar que estás realmente en el evento (check-in).</li>
                    <li>Tu ubicación exacta <strong>nunca</strong> se comparte. Usamos "Jitter" (ruido) para protegerte.</li>
                </ul>
            </div>

            <div className="w-full space-y-3">
                <Button
                    label={loading ? "Verificando..." : "Permitir acceso a Ubicación"}
                    onClick={requestPermission}
                    fullWidth
                    loading={loading}
                />
                <Button label="Ahora no" variant="ghost" onClick={() => navigate('/home')} fullWidth />
            </div>

            {permissionStatus === 'denied_app_level' && (
                <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-left">
                    <AlertTriangle className="text-red-500 shrink-0" size={18} />
                    <div className="text-xs text-red-600">
                        <strong>Permiso bloqueado.</strong><br />
                        Tu navegador ha bloqueado la ubicación. Ve a la configuración del sitio y selecciona "Permitir".
                    </div>
                </div>
            )}
        </div>
    );
};
