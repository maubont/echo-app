import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { UserStatus } from '../../lib/types';

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (status: UserStatus) => void;
}

const EMOJI_OPTIONS = ['☕', '💻', '🍻', '🍔', '🏋️', '🎉', '📚', '✈️', '🤔', '😴'];

export const StatusModal = ({ isOpen, onClose, onSave }: StatusModalProps) => {
    const [emoji, setEmoji] = useState('☕');
    const [text, setText] = useState('');
    const [duration, setDuration] = useState(2); // hours

    if (!isOpen) return null;

    const handleSave = () => {
        const now = Date.now();
        const status: UserStatus = {
            emoji,
            text,
            createdAt: now,
            expiresAt: now + duration * 60 * 60 * 1000
        };
        onSave(status);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">Actualizar Estado</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Emoji Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Elige un Icono</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {EMOJI_OPTIONS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => setEmoji(e)}
                                    className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${emoji === e
                                            ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                                            : 'bg-slate-50 hover:bg-slate-100'
                                        }`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Input */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">¿Qué estás haciendo?</label>
                        <div className="flex gap-3 items-center bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <span className="text-2xl">{emoji}</span>
                            <input
                                className="flex-1 bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400"
                                placeholder="Ej: Trabajando en un café..."
                                value={text}
                                onChange={e => setText(e.target.value)}
                                maxLength={50}
                                autoFocus
                            />
                        </div>
                        <div className="text-right mt-1">
                            <span className="text-[10px] text-slate-400">{text.length}/50</span>
                        </div>
                    </div>

                    {/* Duration Slider */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <Clock size={14} /> Duración: <span className="text-blue-600">{duration} horas</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="24"
                            step="1"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                            <span>1h</span>
                            <span>12h</span>
                            <span>24h</span>
                        </div>
                    </div>

                    <Button
                        label="Publicar Pulse"
                        fullWidth
                        onClick={handleSave}
                        disabled={!text.trim()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 border-none"
                    />
                </div>
            </div>
        </div>
    );
};
