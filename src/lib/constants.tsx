import React from 'react';
import { Briefcase, Coffee, Compass, Flame } from 'lucide-react';
import { AppContextMode } from './types';

export const CATEGORY_OPTIONS: Record<AppContextMode, string[]> = {
    networking: ['Software', 'Diseño', 'Marketing', 'Inversión', 'Ventas', 'Fundador', 'Legal', 'Finanzas'],
    social:     ['Fiesta', 'Comida', 'Deportes', 'Música', 'Juegos', 'Arte', 'Cine', 'Charla'],
    discovery:  ['Turismo', 'Museos', 'Tours', 'Vida Nocturna', 'Gastronomía', 'Naturaleza', 'Fotografía'],
    adult:      ['Casual', 'Conversación', 'Amigos', 'Discreción'],
};

export const MODE_ICONS: Record<AppContextMode, React.ReactNode> = {
    networking: <Briefcase size={14} />,
    social:     <Coffee size={14} />,
    discovery:  <Compass size={14} />,
    adult:      <Flame size={14} />,
};

export const MODE_LABELS: Record<AppContextMode, string> = {
    networking: 'Networking',
    social:     'Social',
    discovery:  'Discovery',
    adult:      'Adulto',
};

export const MODE_DESCRIPTIONS: Record<AppContextMode, string> = {
    networking: 'Conecta con profesionales y emprendedores.',
    social:     'Encuentra planes y personas para salir.',
    discovery:  'Explora tu ciudad y conoce nuevos lugares.',
    adult:      'Espacio privado y discreto. Solo para adultos.',
};
