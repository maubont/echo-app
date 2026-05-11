import { useState } from 'react';
import {
    X,
    Coffee,
    Laptop,
    Home,
    Utensils,
    PartyPopper,
    Dumbbell,
    BookOpen,
    Plane,
    ChevronRight,
    ChevronLeft,
    Clock,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { UserStatus } from '../../lib/types';

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (status: UserStatus) => void;
}

// Define the available status options with their icons
const STATUS_OPTIONS = [
    { id: 'coffee', label: 'Café', Icon: Coffee },
    { id: 'work', label: 'Trabajo', Icon: Laptop },
    { id: 'home', label: 'Casa', Icon: Home },
    { id: 'food', label: 'Comida', Icon: Utensils },
    { id: 'party', label: 'Fiesta', Icon: PartyPopper },
    { id: 'gym', label: 'Gym', Icon: Dumbbell },
    { id: 'study', label: 'Estudio', Icon: BookOpen },
    { id: 'travel', label: 'Viaje', Icon: Plane },
];

export const StatusModal = ({ isOpen, onClose, onSave }: StatusModalProps) => {
    const [selectedOption, setSelectedOption] = useState(STATUS_OPTIONS[0]);
    const [text, setText] = useState('');
    const [duration, setDuration] = useState(2); // hours

    if (!isOpen) return null;

    const handleSave = () => {
        const now = Date.now();
        const status: UserStatus = {
            emoji: selectedOption.id,
            text,
            createdAt: now,
            expiresAt: now + duration * 60 * 60 * 1000,
        };
        onSave(status);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-100 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="glass-effect rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 border transition-all" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center" style={{ background: 'rgb(var(--bg-secondary) / 0.5)', borderColor: 'rgb(var(--glass-border))' }}>
                    <h3 className="font-bold text-theme-primary">Actualizar Estado</h3>
                    <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-theme-secondary/30">
                        <X size={20} className="text-theme-tertiary" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Icon Selector */}
                    <div>
                        <label className="text-xs font-bold text-theme-tertiary uppercase mb-3 block">Elige un Icono</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedOption(opt)}
                                    className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${selectedOption.id === opt.id ? 'ring-2 scale-110' : 'hover:bg-theme-secondary/30'}`}
                                    style={selectedOption.id === opt.id ? {
                                        background: 'rgb(var(--primary-500) / 0.2)',
                                        '--tw-ring-color': 'rgb(var(--primary-500))',
                                    } as React.CSSProperties : {
                                        background: 'rgb(var(--bg-secondary) / 0.3)'
                                    }}
                                >
                                    <opt.Icon size={24} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Input */}
                    <div>
                        <label className="text-xs font-bold text-theme-tertiary uppercase mb-2 block">¿Qué estás haciendo?</label>
                        <div className="flex gap-3 items-center bg-theme-secondary/30 border rounded-2xl p-3 transition-all" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                            <span className="text-2xl">
                                {selectedOption.id === 'coffee' && <Coffee size={24} />}
                                {selectedOption.id === 'work' && <Laptop size={24} />}
                                {selectedOption.id === 'home' && <Home size={24} />}
                                {selectedOption.id === 'food' && <Utensils size={24} />}
                                {selectedOption.id === 'party' && <PartyPopper size={24} />}
                                {selectedOption.id === 'gym' && <Dumbbell size={24} />}
                                {selectedOption.id === 'study' && <BookOpen size={24} />}
                                {selectedOption.id === 'travel' && <Plane size={24} />}
                            </span>
                            <input
                                className="flex-1 bg-transparent outline-none text-theme-primary font-medium placeholder-theme-tertiary"
                                placeholder="Ej: Trabajando en un café..."
                                value={text}
                                onChange={e => setText(e.target.value)}
                                maxLength={80}
                                autoFocus
                            />
                        </div>
                        <div className="text-right mt-1">
                            <span className="text-[10px] text-theme-tertiary">{text.length}/80</span>
                        </div>
                    </div>

                    {/* Duration Slider */}
                    <div>
                        <label className="text-xs font-bold text-theme-tertiary uppercase mb-3 flex items-center gap-2">
                            <Clock size={14} /> Duración: <span className="text-primary-color">{duration} horas</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="24"
                            step="1"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: 'rgb(var(--bg-secondary))',
                                accentColor: 'rgb(var(--primary-500))',
                            }}
                        />
                        <div className="flex justify-between text-[10px] text-theme-tertiary mt-1 font-medium">
                            <span>1h</span>
                            <span>12h</span>
                            <span>24h</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        label="Publicar Estado"
                        fullWidth
                        onClick={handleSave}
                        disabled={!text.trim()}
                        className="shadow-theme-lg border-none"
                    />
                </div>
            </div>
        </div>
    );
};
