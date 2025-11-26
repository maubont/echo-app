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
            }, 3000);
        }
    }, [session, loading, navigate]);

    return (
        <div className="h-screen flex flex-col items-center justify-center text-white relative overflow-hidden" style={{ background: '#09090b' }}>
            {/* Animated gradient background */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(circle at 20% 50%, rgb(88 101 242 / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgb(168 85 247 / 0.2) 0%, transparent 50%)',
                }}
            ></div>

            {/* Animated pulse */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-64 h-64 rounded-full animate-pulse"
                    style={{
                        background: 'radial-gradient(circle, rgb(88 101 242 / 0.1) 0%, transparent 70%)',
                    }}
                ></div>
            </div>

            {/* Logo with glassmorphism */}
            <div className="relative z-10 mb-8">
                <div
                    className="p-6 rounded-3xl shadow-2xl animate-scale-in backdrop-blur-xl"
                    style={{
                        background: 'rgba(24, 24, 27, 0.6)',
                        border: '1px solid rgba(88, 101, 242, 0.3)',
                        animation: 'scaleIn 0.6s ease-out',
                    }}
                >
                    <MapPin className="w-16 h-16" style={{ color: 'rgb(88 101 242)' }} />
                </div>
            </div>

            {/* App name */}
            <h1
                className="text-5xl font-bold tracking-tight mb-2"
                style={{
                    background: 'linear-gradient(135deg, rgb(88 101 242), rgb(168 85 247))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'fadeInUp 0.8s ease-out 0.2s both',
                }}
            >
                echo
            </h1>

            {/* Tagline */}
            <p
                className="text-sm opacity-60 mb-12"
                style={{
                    color: 'rgb(212 212 216)',
                    animation: 'fadeInUp 0.8s ease-out 0.4s both',
                }}
            >
                Tu círculo cercano
            </p>

            {/* Modern loading indicator */}
            <div className="relative w-32 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(88, 101, 242, 0.2)' }}>
                <div
                    className="absolute h-full rounded-full"
                    style={{
                        background: 'linear-gradient(90deg, rgb(88 101 242), rgb(168 85 247))',
                        animation: 'slideRight 1.5s ease-in-out infinite',
                        width: '50%',
                    }}
                ></div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes scaleIn {
                    from {
                        transform: scale(0.8);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeInUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideRight {
                    0%, 100% {
                        transform: translateX(-100%);
                    }
                    50% {
                        transform: translateX(200%);
                    }
                }
            `}</style>
        </div>
    );
};
