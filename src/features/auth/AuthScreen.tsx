import React, { useState } from 'react';
import { AlertTriangle, Lock, MapPin, Store, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserRole } from '../../lib/types';

export const AuthScreen = ({ type }: { type: 'login' | 'signup' }) => {
    const { signIn, signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const [role, setRole] = useState<UserRole>('person');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (type === 'login') {
                await signIn(formData.email, formData.password);
            } else {
                await signUp(formData.email, formData.name, role, formData.password);
            }
            navigate('/permission');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            await signInWithGoogle();
            // OAuth will redirect automatically, no need to navigate here
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión con Google');
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen px-6 py-12 flex flex-col justify-center relative overflow-hidden" style={{ background: '#09090b' }}>
            {/* Animated gradient background - same as splash */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(circle at 20% 50%, rgb(88 101 242 / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgb(168 85 247 / 0.2) 0%, transparent 50%)',
                }}
            ></div>

            {/* Animated pulse */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-96 h-96 rounded-full animate-pulse"
                    style={{
                        background: 'radial-gradient(circle, rgb(88 101 242 / 0.08) 0%, transparent 70%)',
                    }}
                ></div>
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 backdrop-blur-xl"
                        style={{
                            background: 'rgba(24, 24, 27, 0.6)',
                            border: '1px solid rgba(88, 101, 242, 0.3)',
                        }}
                    >
                        <MapPin size={32} style={{ color: 'rgb(88 101 242)' }} />
                    </div>
                    <h2
                        className="text-3xl font-bold mb-2"
                        style={{
                            background: 'linear-gradient(135deg, rgb(88 101 242), rgb(168 85 247))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        {type === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
                    </h2>
                    <p className="text-theme-tertiary text-sm">Descubre oportunidades a tu alrededor.</p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="p-6 rounded-2xl space-y-4 backdrop-blur-xl"
                    style={{
                        background: 'rgba(24, 24, 27, 0.6)',
                        border: '1px solid rgba(88, 101, 242, 0.2)',
                    }}
                >
                    {type === 'signup' && (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button
                                type="button"
                                onClick={() => setRole('person')}
                                className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${role === 'person'
                                        ? 'border-primary text-primary-color'
                                        : 'border-theme-secondary/30 text-theme-tertiary hover:border-theme-secondary'
                                    }`}
                                style={role === 'person' ? {
                                    background: 'rgba(88, 101, 242, 0.1)',
                                    borderColor: 'rgb(88 101 242)'
                                } : {}}
                            >
                                <User size={20} /> Persona
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('business')}
                                className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${role === 'business'
                                        ? 'border-primary text-primary-color'
                                        : 'border-theme-secondary/30 text-theme-tertiary hover:border-theme-secondary'
                                    }`}
                                style={role === 'business' ? {
                                    background: 'rgba(88, 101, 242, 0.1)',
                                    borderColor: 'rgb(88 101 242)'
                                } : {}}
                            >
                                <Store size={20} /> Negocio
                            </button>
                        </div>
                    )}

                    {type === 'signup' && (
                        <Input
                            icon={<User size={18} />} placeholder="Nombre Completo" required
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    )}
                    <Input
                        icon={<User size={18} />} type="email" placeholder="correo@ejemplo.com" required
                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        icon={<Lock size={18} />} type="password" placeholder="Contraseña" required
                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />

                    {error && (
                        <div
                            className="p-3 text-xs rounded-lg flex gap-2 items-center"
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: 'rgb(248 113 113)'
                            }}
                        >
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    <Button label={type === 'login' ? "Ingresar" : "Registrarse"} loading={loading} fullWidth type="submit" />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t" style={{ borderColor: 'rgba(88, 101, 242, 0.2)' }}></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 text-theme-tertiary" style={{ background: 'rgba(24, 24, 27, 0.6)' }}>o continúa con</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="w-full p-3 rounded-xl border flex items-center justify-center gap-3 font-bold text-theme-primary transition-all disabled:opacity-50 hover:shadow-theme-md"
                        style={{
                            borderColor: 'rgba(88, 101, 242, 0.3)',
                            background: 'rgba(24, 24, 27, 0.4)',
                        }}
                    >
                        {googleLoading ? (
                            <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <button
                        type="button"
                        onClick={() => navigate(type === 'login' ? '/signup' : '/login')}
                        className="text-sm font-medium hover:underline transition-colors"
                        style={{ color: 'rgb(88 101 242)' }}
                    >
                        {type === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
};
