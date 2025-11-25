import { useState, useContext } from 'react';
import { Camera, Check, Filter, Instagram, Twitter, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { AppContextMode } from '../../lib/types';
import { CATEGORY_OPTIONS, MODE_ICONS } from '../../lib/constants';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const ProfilePage = () => {
    const { session, updateProfile, signOut } = useAuth();
    const { theme: currentTheme, setTheme } = useTheme();
    const navigate = useNavigate();
    const { isInstallable, installApp } = usePWAInstall();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        name: session?.user.name || '',
        bio: session?.user.bio || '',
        currentMode: session?.user.currentMode || 'networking',
        categories: session?.user.categories || [],
        avatarUrl: session?.user.avatarUrl || '',
        instagram: session?.user.instagram || '',
        twitter: session?.user.twitter || '',
        linkedin: session?.user.linkedin || ''
    });

    const modes: AppContextMode[] = ['networking', 'social', 'dating', 'tourism'];

    const handleSave = async () => {
        await updateProfile(form);
        setIsEditing(false);
    };

    const toggleCategory = (cat: string) => {
        if (form.categories.includes(cat)) {
            setForm({ ...form, categories: form.categories.filter(c => c !== cat) });
        } else {
            if (form.categories.length >= 3) return; // Max 3 limit
            setForm({ ...form, categories: [...form.categories, cat] });
        }
    };

    const handleAvatarClick = () => {
        if (!isEditing) return;
        const newUrl = `https://i.pravatar.cc/150?u=${Math.random()}`;
        setForm({ ...form, avatarUrl: newUrl });
    };

    return (
        <div className="h-screen bg-theme-main pb-[90px] overflow-y-auto transition-colors duration-300">
            <div className="bg-theme-card/90 backdrop-blur-xl p-6 rounded-b-3xl shadow-theme-md mb-4 border-b transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-theme-primary">Mi Perfil</h1>
                    <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="font-bold text-sm px-3 py-1 rounded-lg transition-all bg-primary text-white hover:shadow-theme-md">
                        {isEditing ? 'Guardar' : 'Editar'}
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    <div onClick={handleAvatarClick} className={`w-24 h-24 rounded-full mb-3 flex items-center justify-center text-3xl font-bold border-4 shadow-theme-lg relative overflow-hidden ${isEditing ? 'cursor-pointer group' : ''}`} style={{ background: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-tertiary))', borderColor: 'rgb(var(--primary-500))' }}>
                        {form.avatarUrl ? (
                            <img src={form.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            <span>{session?.user.name.charAt(0)}</span>
                        )}

                        {isEditing && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                                <Camera className="text-white" size={24} />
                            </div>
                        )}
                    </div>

                    {isEditing ? (
                        <input
                            className="text-center font-bold text-lg border rounded-lg p-1 w-2/3 bg-theme-secondary text-theme-primary"
                            style={{ borderColor: 'rgb(var(--glass-border))' }}
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Tu Nombre"
                        />
                    ) : (
                        <h2 className="text-xl font-bold text-theme-primary">{session?.user.name}</h2>
                    )}
                    <p className="text-sm text-theme-secondary">{session?.user.email}</p>
                </div>
            </div>

            <div className="px-6 space-y-4">
                {/* MODE SELECTOR */}
                <div className="bg-theme-card/80 backdrop-blur-lg p-4 rounded-2xl shadow-theme-sm border transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <h3 className="text-xs font-bold text-theme-tertiary uppercase mb-3 flex items-center gap-2">
                        <Filter size={14} /> Modo Actual
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {modes.map(m => (
                            <button
                                key={m}
                                disabled={!isEditing}
                                onClick={() => setForm({ ...form, currentMode: m, categories: [] })}
                                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all flex items-center gap-1.5 ${form.currentMode === m
                                    ? 'bg-primary text-white shadow-theme-md'
                                    : 'bg-theme-secondary/30 text-theme-secondary hover:bg-theme-secondary/50'
                                    } ${!isEditing && form.currentMode !== m ? 'opacity-50' : ''}`}
                                style={form.currentMode === m ? {} : { borderColor: 'rgb(var(--glass-border))' }}
                            >
                                {MODE_ICONS[m]}
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BIO */}
                <div className="bg-theme-card/80 backdrop-blur-lg p-4 rounded-2xl shadow-theme-sm border transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <h3 className="text-xs font-bold text-theme-tertiary uppercase mb-2">Bio</h3>
                    {isEditing ? (
                        <textarea
                            className="w-full bg-theme-secondary border rounded-xl p-3 text-sm min-h-[80px] text-theme-primary placeholder-theme-tertiary"
                            style={{ borderColor: 'rgb(var(--glass-border))' }}
                            value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                            placeholder="Cuéntanos algo sobre ti..."
                        />
                    ) : (
                        <p className="text-sm text-theme-secondary leading-relaxed">
                            {session?.user.bio || "Sin descripción."}
                        </p>
                    )}
                </div>

                {/* CATEGORIES */}
                <div className="bg-theme-card/80 backdrop-blur-lg p-4 rounded-2xl shadow-theme-sm border transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-theme-tertiary uppercase">Intereses ({form.categories.length}/3)</h3>
                        {isEditing && <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/20" style={{ color: 'rgb(var(--primary-500))' }}>Selecciona hasta 3</span>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS[form.currentMode].map(cat => {
                            const isSelected = form.categories.includes(cat);
                            return (
                                <button
                                    key={cat}
                                    disabled={!isEditing}
                                    onClick={() => toggleCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isSelected
                                        ? 'bg-primary/20 border shadow-theme-sm'
                                        : 'bg-theme-secondary/20 text-theme-secondary border-transparent hover:bg-theme-secondary/30'
                                        }`}
                                    style={isSelected ? { color: 'rgb(var(--primary-500))', borderColor: 'rgb(var(--primary-500))' } : {}}
                                >
                                    {cat}
                                    {isSelected && <Check size={12} className="inline ml-1" />}
                                </button>
                            );
                        })}
                        {CATEGORY_OPTIONS[form.currentMode].length === 0 && (
                            <span className="text-xs text-theme-tertiary italic">No hay categorías disponibles para este modo.</span>
                        )}
                    </div>
                </div>

                {/* THEME SELECTOR - NEW */}
                <div className="bg-theme-card/80 backdrop-blur-lg p-4 rounded-2xl shadow-theme-sm border transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <h3 className="text-xs font-bold text-theme-tertiary uppercase mb-3">Tema Visual</h3>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Aurora */}
                        <button
                            onClick={() => setTheme('aurora')}
                            disabled={!isEditing}
                            className={`p-3 rounded-xl border-2 transition-all ${currentTheme === 'aurora' ? 'shadow-theme-lg' : 'border-transparent opacity-60 hover:opacity-90'}`}
                            style={currentTheme === 'aurora' ? { borderColor: 'rgb(var(--primary-500))' } : {}}
                        >
                            <div className="aspect-square rounded-lg mb-2 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-300"></div>
                            <p className="text-xs font-bold text-theme-primary">Aurora</p>
                            <p className="text-[10px] text-theme-tertiary">Luminoso</p>
                        </button>

                        {/* Nebula */}
                        <button
                            onClick={() => setTheme('nebula')}
                            disabled={!isEditing}
                            className={`p-3 rounded-xl border-2 transition-all ${currentTheme === 'nebula' ? 'shadow-theme-lg' : 'border-transparent opacity-60 hover:opacity-90'}`}
                            style={currentTheme === 'nebula' ? { borderColor: 'rgb(var(--primary-500))' } : {}}
                        >
                            <div className="aspect-square rounded-lg mb-2 bg-gradient-to-br from-indigo-600 via-purple-500 to-cyan-400"></div>
                            <p className="text-xs font-bold text-theme-primary">Nebula</p>
                            <p className="text-[10px] text-theme-tertiary">Oscuro</p>
                        </button>
                    </div>
                </div>

                {/* SOCIAL LINKS */}
                <div className="bg-theme-card/80 backdrop-blur-lg p-4 rounded-2xl shadow-theme-sm border transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <h3 className="text-xs font-bold text-theme-tertiary uppercase mb-3">Redes Sociales</h3>

                    <div className="space-y-3">
                        {/* Instagram */}
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-2 rounded-lg">
                                <Instagram size={16} />
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="flex-1 bg-theme-secondary border rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-tertiary"
                                    style={{ borderColor: 'rgb(var(--glass-border))' }}
                                    value={form.instagram}
                                    onChange={e => setForm({ ...form, instagram: e.target.value })}
                                    placeholder="@usuario"
                                />
                            ) : (
                                <span className="text-sm text-theme-secondary">
                                    {session?.user.instagram || 'No configurado'}
                                </span>
                            )}
                        </div>

                        {/* Twitter */}
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-500 text-white p-2 rounded-lg">
                                <Twitter size={16} />
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="flex-1 bg-theme-secondary border rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-tertiary"
                                    style={{ borderColor: 'rgb(var(--glass-border))' }}
                                    value={form.twitter}
                                    onChange={e => setForm({ ...form, twitter: e.target.value })}
                                    placeholder="@usuario"
                                />
                            ) : (
                                <span className="text-sm text-theme-secondary">
                                    {session?.user.twitter || 'No configurado'}
                                </span>
                            )}
                        </div>

                        {/* LinkedIn */}
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-700 text-white p-2 rounded-lg">
                                <Linkedin size={16} />
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="flex-1 bg-theme-secondary border rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-tertiary"
                                    style={{ borderColor: 'rgb(var(--glass-border))' }}
                                    value={form.linkedin}
                                    onChange={e => setForm({ ...form, linkedin: e.target.value })}
                                    placeholder="linkedin.com/in/usuario"
                                />
                            ) : (
                                <span className="text-sm text-theme-secondary">
                                    {session?.user.linkedin || 'No configurado'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    {isInstallable && (
                        <Button
                            label="📲 Instalar App"
                            variant="primary"
                            fullWidth
                            onClick={installApp}
                            className="bg-gradient-to-r from-blue-600 to-cyan-500 border-none shadow-lg"
                        />
                    )}
                    <Button label="Cerrar Sesión" variant="danger" fullWidth onClick={() => { signOut(); navigate('/login'); }} />
                </div>
            </div>
        </div>
    );
};
