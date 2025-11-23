import React from 'react';
import { Briefcase, Coffee, Heart, Plane, Store } from 'lucide-react';
import { AppContextMode } from './types';

export const CATEGORY_OPTIONS: Record<AppContextMode, string[]> = {
    networking: ['Software', 'Design', 'Marketing', 'Investors', 'Sales', 'Founder', 'Legal'],
    social: ['Fiesta', 'Comida', 'Deportes', 'Música', 'Juegos', 'Charla'],
    dating: ['Casual', 'Serio', 'Amistad', 'Café', 'Cena'],
    tourism: ['Turismo', 'Museos', 'Tours', 'Vida Nocturna', 'Gastronomía'],
    business: ['Restaurante', 'Tienda', 'Servicios', 'B2B', 'Tecnología']
};

export const MODE_ICONS: Record<AppContextMode, React.ReactNode> = {
    networking: <Briefcase size={16} />,
    social: <Coffee size={16} />,
    dating: <Heart size={16} />,
    tourism: <Plane size={16} />,
    business: <Store size={16} />
};
