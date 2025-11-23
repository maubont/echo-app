import { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Splash = () => {
    const navigate = useNavigate();
    const { session, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            setTimeout(() => {
                if (session) navigate('/home');
                else navigate('/login');
            }, 1500);
        }
    }, [session, loading, navigate]);

    return (
        <div className="h-screen bg-blue-600 flex flex-col items-center justify-center text-white relative overflow-hidden">
            <div className="bg-white p-4 rounded-3xl shadow-2xl animate-bounce mb-4 z-10">
                <MapPin className="text-blue-600 w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Proxi</h1>
            <div className="animate-spin mt-8 text-blue-200 w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
        </div>
    );
};
