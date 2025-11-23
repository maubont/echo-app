import React from 'react';
import { LayoutGrid, MapPin, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    // Hide on auth/splash screens
    if (['/', '/login', '/signup', '/permission'].includes(currentPath)) return null;

    const items = [
        { id: 'home', path: '/home', icon: <LayoutGrid size={24} />, label: 'Inicio' },
        { id: 'map', path: '/map', icon: <MapPin size={24} />, label: 'Mapa' },
        { id: 'chat', path: '/chat', icon: <MessageCircle size={24} />, label: 'Chats' },
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
                        className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        {React.cloneElement(item.icon as React.ReactElement<any>, {
                            strokeWidth: isActive ? 2.5 : 2
                        })}
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
