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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-[80px]">
            {items.map((item) => {
                const isActive = currentPath.startsWith(item.path);
                return (
                    <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center gap-1 transition-colors relative ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <div className="relative">
                            {React.cloneElement(item.icon as React.ReactElement<any>, {
                                strokeWidth: isActive ? 2.5 : 2
                            })}
                            {/* Badge for unread messages */}
                            {item.badge && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
