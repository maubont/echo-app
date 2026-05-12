import { useState } from 'react';
import { Flag, X, Ban, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReportModalProps {
    isOpen: boolean;
    reportedUserId: string;
    reportedUserName: string;
    reporterId: string;
    onClose: () => void;
    onBlock?: () => void;
}

const REPORT_REASONS = [
    { id: 'spam', label: 'Spam o publicidad', icon: '📢' },
    { id: 'harassment', label: 'Acoso o intimidación', icon: '😠' },
    { id: 'inappropriate', label: 'Contenido inapropiado', icon: '🚫' },
    { id: 'fake', label: 'Perfil falso', icon: '🎭' },
    { id: 'underage', label: 'Posible menor de edad', icon: '⚠️' },
    { id: 'other', label: 'Otro motivo', icon: '📝' },
];

export const ReportModal = ({ isOpen, reportedUserId, reportedUserName, reporterId, onClose, onBlock }: ReportModalProps) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');
    const [step, setStep] = useState<'report' | 'block' | 'done'>('report');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmitReport = async () => {
        if (!selectedReason) return;
        setSubmitting(true);
        try {
            await supabase.from('reports').insert({
                reporter_id: reporterId,
                reported_user_id: reportedUserId,
                reason: selectedReason,
                details: details || null,
            });
            setStep('block');
        } catch (err) {
            console.error('Error submitting report:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBlock = async () => {
        setSubmitting(true);
        try {
            await supabase.from('blocked_users').insert({
                blocker_id: reporterId,
                blocked_id: reportedUserId,
            });
            onBlock?.();
            setStep('done');
        } catch (err) {
            console.error('Error blocking user:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason('');
        setDetails('');
        setStep('report');
        onClose();
    };

    // Step: Done
    if (step === 'done') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
                <div className="bg-theme-card rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl border" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✅</span>
                    </div>
                    <h3 className="text-lg font-bold text-theme-primary mb-2">Listo</h3>
                    <p className="text-sm text-theme-secondary mb-6">Tu reporte ha sido enviado y el usuario ha sido bloqueado.</p>
                    <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-primary">Cerrar</button>
                </div>
            </div>
        );
    }

    // Step: Block confirmation
    if (step === 'block') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
                <div className="bg-theme-card rounded-3xl max-w-sm w-full p-6 shadow-2xl border" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <div className="text-center mb-5">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Ban size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-theme-primary">Reporte enviado</h3>
                        <p className="text-sm text-theme-secondary mt-1">¿También deseas bloquear a <strong>{reportedUserName}</strong>?</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-theme-secondary bg-theme-secondary/20">No, gracias</button>
                        <button onClick={handleBlock} disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 disabled:opacity-50">
                            {submitting ? '...' : 'Bloquear'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step: Report form
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
            <div className="bg-theme-card rounded-3xl max-w-sm w-full shadow-2xl border overflow-hidden" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                {/* Header */}
                <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <div className="flex items-center gap-2">
                        <Flag size={18} className="text-red-500" />
                        <h3 className="font-bold text-theme-primary">Reportar usuario</h3>
                    </div>
                    <button onClick={handleClose} className="p-1 text-theme-tertiary hover:text-theme-primary">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-sm text-theme-secondary">
                        <AlertTriangle size={14} className="inline mr-1 text-amber-500" />
                        Reportando a <strong className="text-theme-primary">{reportedUserName}</strong>
                    </p>

                    {/* Reasons */}
                    <div className="space-y-2">
                        {REPORT_REASONS.map(r => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedReason(r.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all flex items-center gap-3 ${
                                    selectedReason === r.id
                                        ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                                        : 'border-transparent bg-theme-secondary/20 text-theme-secondary hover:bg-theme-secondary/30'
                                }`}
                            >
                                <span>{r.icon}</span>
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Details */}
                    {selectedReason && (
                        <textarea
                            className="w-full bg-theme-secondary/30 border rounded-xl p-3 text-sm min-h-[60px] text-theme-primary placeholder-theme-tertiary"
                            style={{ borderColor: 'rgb(var(--glass-border))' }}
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Detalles adicionales (opcional)..."
                        />
                    )}
                </div>

                <div className="px-5 pb-5">
                    <button
                        onClick={handleSubmitReport}
                        disabled={!selectedReason || submitting}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {submitting ? 'Enviando...' : 'Enviar Reporte'}
                    </button>
                </div>
            </div>
        </div>
    );
};
