import { useState } from 'react';
import { ShieldAlert, X, Flame, Lock } from 'lucide-react';

interface AgeVerificationModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const AgeVerificationModal = ({ isOpen, onConfirm, onCancel }: AgeVerificationModalProps) => {
    const [accepted, setAccepted] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-gray-900 rounded-3xl max-w-sm w-full shadow-2xl border border-red-500/20 overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-linear-to-r from-red-600 to-rose-700 p-5 text-center relative">
                    <button onClick={onCancel} className="absolute top-3 right-3 text-white/60 hover:text-white p-1">
                        <X size={18} />
                    </button>
                    <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShieldAlert size={32} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Verificación de Edad</h2>
                    <p className="text-red-100 text-sm mt-1">Contenido exclusivo para adultos</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3 text-gray-300 text-sm">
                        <Flame size={18} className="text-red-400 shrink-0 mt-0.5" />
                        <p>El <strong className="text-white">Modo Adulto</strong> contiene contenido para mayores de 18 años. Al continuar, confirmas que cumples con la edad legal.</p>
                    </div>

                    <div className="flex items-start gap-3 text-gray-300 text-sm">
                        <Lock size={18} className="text-red-400 shrink-0 mt-0.5" />
                        <p>Tu actividad en este modo es <strong className="text-white">completamente privada</strong>: perfil separado, chats efímeros (24h) y ubicación protegida.</p>
                    </div>

                    {/* Checkbox */}
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700 cursor-pointer hover:border-red-500/40 transition-colors">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={e => setAccepted(e.target.checked)}
                            className="w-5 h-5 rounded accent-red-500"
                        />
                        <span className="text-sm text-gray-200">
                            Confirmo que soy <strong className="text-white">mayor de 18 años</strong> y acepto las condiciones de uso.
                        </span>
                    </label>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => { if (accepted) onConfirm(); }}
                        disabled={!accepted}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Acceder +18
                    </button>
                </div>
            </div>
        </div>
    );
};
