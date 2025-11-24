import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, MapPin, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chat';

export const BottomNav = () => {
    const { session } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const [hasUnread, setHasUnread] = useState(false);

    // Keep track of current path in ref for the subscription callback
    const locationRef = useRef(currentPath);

    useEffect(() => {
        locationRef.current = currentPath;
        // Clear badge when entering chat
        if (currentPath === '/chat') {
            setHasUnread(false);
        }
    }, [currentPath]);

    // Subscribe to global chat updates
    useEffect(() => {
        if (!session) return;

        const unsubscribe = chatService.subscribeToAllConversations(session.user.id, (payload) => {
            // If we are NOT on the chat page, show badge and play sound
            if (locationRef.current !== '/chat') {
                setHasUnread(true);

                // Play notification sound
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e => console.log('Audio play failed:', e));
            }
        });

        return () => {
            unsubscribe();
        };
    }, [session]);

    // Hide on auth/splash screens
    if (['/', '/login', '/signup', '/permission'].includes(currentPath)) return null;

    const items = [
        { id: 'home', path: '/home', icon: <LayoutGrid size={24} />, label: 'Inicio' },
        { id: 'map', path: '/map', icon: <MapPin size={24} />, label: 'Mapa' },
        { id: 'chat', path: '/chat', icon: <MessageCircle size={24} />, label: 'Chats', badge: hasUnread },
        { id: 'profile', path: '/profile', icon: <User size={24} />, label: 'Perfil' },
    ];

    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl shadow-blue-900/10 rounded-full px-6 py-3 flex items-center gap-8 pointer-events-auto">
                {items.map((item) => {
                    const isActive = currentPath.startsWith(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`relative flex flex-col items-center justify-center w-10 h-10 transition-all duration-300 ${isActive ? 'text-blue-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600 hover:-translate-y-0.5'
                                }`}
                        >
                            <div className={`absolute inset-0 bg-blue-500/10 rounded-full scale-0 transition-transform duration-300 ${isActive ? 'scale-150' : ''}`} />

                            <div className="relative z-10">
                                {React.cloneElement(item.icon as React.ReactElement<any>, {
                                    size: 24,
                                    strokeWidth: isActive ? 2.5 : 2,
                                    className: `transition-all duration-300 ${isActive ? 'drop-shadow-sm' : ''}`
                                })}

                                {/* Badge for unread messages */}
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                )}
                            </div>

                            {isActive && (
                                <span className="absolute -bottom-2 w-1 h-1 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-300"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
