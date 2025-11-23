import { useEffect, useState } from 'react';
import { AlertTriangle, Info, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { Button } from '../../components/ui/Button';
import { locationService } from '../../services/location';
import { useAuth } from '../../context/AuthContext';
import { getCurrentPosition as getMockOrRealPosition } from '../../lib/mockLocation';

export const PermissionPage = () => {
    const { requestPermission, permissionStatus, loading } = useGeoLocation();
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [clickedAllow, setClickedAllow] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Debug: Log session state on component mount and changes
    useEffect(() => {
        console.log('🔍 PermissionPage mounted. Auth loading:', authLoading, 'Session:', session);
    }, []);

    useEffect(() => {
        console.log('🔄 Session changed:', { authLoading, hasSession: !!session, userId: session?.user?.id });
    }, [session, authLoading]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !session) {
            console.warn('⚠️ No authenticated session found. Redirecting to login...');
            navigate('/login');
        }
    }, [authLoading, session, navigate]);

    const handleAllow = async () => {
        console.log('👆 Allow button clicked. Session state:', {
            authLoading,
            hasSession: !!session,
            userId: session?.user?.id
        });

        setClickedAllow(true);
        setIsProcessing(true);

        // 1. Trigger browser permission prompt
        requestPermission();
    };

    useEffect(() => {
        const initLocation = async () => {
            console.log('🎬 initLocation triggered. State:', {
                clickedAllow,
                permissionStatus,
                authLoading,
                hasSession: !!session,
                userId: session?.user?.id
            });

            // Wait for auth to finish loading
            if (authLoading) {
                console.log('⏳ Auth still loading, waiting...');
                return;
            }

            if (clickedAllow && permissionStatus === 'granted') {
                console.log('🔍 DEBUG: Session state:', {
                    hasSession: !!session,
                    hasUser: !!session?.user,
                    userId: session?.user?.id
                });

                try {
                    // 2. Start broadcasting and WAIT for it to finish (DB update)
                    if (session?.user?.id) {
                        console.log('✅ DEBUG: Starting broadcasting with userId:', session.user.id);
                        // Use mock location helper
                        await locationService.startBroadcasting(
                            session.user.id,
                            () => getMockOrRealPosition(true) // Always use mock for testing
                        );
                    } else {
                        console.error('❌ DEBUG: No session or user ID available');
                        throw new Error("No se pudo identificar al usuario. Por favor inicia sesión nuevamente.");
                    }

                    // 3. Navigate only after we are sure broadcasting started
                    navigate('/home');
                } catch (error: any) {
                    console.error("Failed to start broadcasting:", error);
                    setIsProcessing(false);
                    alert(`Error: ${error.message || JSON.stringify(error)}`);
                }
            }
        };

        initLocation();
    }, [permissionStatus, clickedAllow, navigate, session, authLoading]);

    return (
        <div className="h-screen bg-white px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="bg-blue-100 p-4 rounded-full mb-6">
                <LocateFixed className="text-blue-600" size={48} />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">Habilita tu Ubicación</h1>

            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-2">
                    <Info size={16} /> ¿Por qué lo necesitamos?
                </h3>
                <ul className="text-sm text-blue-700 text-left space-y-1">
                    <li>• Para mostrarte eventos y personas a tu alrededor.</li>
                    <li>• Para verificar que estás realmente en el evento (check-in).</li>
                    <li>• Tu ubicación exacta <span className="font-bold">nunca</span> se comparte. Usamos "jitter" (ruido) para protegerte.</li>
                </ul>
            </div>

            <Button
                label="Permitir acceso a Ubicación"
                onClick={handleAllow}
                fullWidth
                disabled={isProcessing}
                icon={<LocateFixed size={18} />}
            />

            <button onClick={() => navigate('/home')} className="mt-4 text-slate-500 text-sm hover:underline">
                Ahora no
            </button>

            {permissionStatus === 'denied' && (
                <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-2">
                    <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                    <div className="text-left">
                        <h4 className="font-bold text-red-900 text-sm mb-1">Permiso denegado</h4>
                        <p className="text-xs text-red-700">
                            Para activar la ubicación, ve a la configuración de tu navegador y permite el acceso.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
