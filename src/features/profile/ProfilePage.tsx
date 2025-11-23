import { useState, useContext } from 'react';
import { Camera, Check, Filter, Instagram, Twitter, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { AppContextMode } from '../../lib/types';
import { CATEGORY_OPTIONS, MODE_ICONS } from '../../lib/constants';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const ProfilePage = () => {
    const { session, updateProfile, signOut } = useAuth();
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
        <div className="h-screen bg-slate-50 pb-[90px] overflow-y-auto">
            <div className="bg-white p-6 rounded-b-3xl shadow-sm mb-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold">Mi Perfil</h1>
                    <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                        {isEditing ? 'Guardar' : 'Editar'}
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    <div onClick={handleAvatarClick} className={`w-24 h-24 bg-slate-200 rounded-full mb-3 flex items-center justify-center text-3xl font-bold text-slate-400 border-4 border-white shadow-lg relative overflow-hidden ${isEditing ? 'cursor-pointer group' : ''}`}>
                        {form.avatarUrl ? (
                            <img src={form.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            <span>{session?.user.name.charAt(0)}</span>
                        )}

                        {isEditing && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                        )}
                    </div>

                    {isEditing ? (
                        <input
                            className="text-center font-bold text-lg bg-slate-50 border border-slate-200 rounded-lg p-1 w-2/3"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Tu Nombre"
                        />
                    ) : (
                        <h2 className="text-xl font-bold text-slate-900">{session?.user.name}</h2>
                    )}
                    <p className="text-sm text-slate-500">{session?.user.email}</p>
                </div>
            </div>

            <div className="px-6 space-y-4">
                {/* MODE SELECTOR */}
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Filter size={14} /> Modo Actual
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {modes.map(m => (
                            <button
                                key={m}
                                disabled={!isEditing}
                                onClick={() => setForm({ ...form, currentMode: m, categories: [] })}
                                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all flex items-center gap-1.5 ${form.currentMode === m
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    } ${!isEditing && form.currentMode !== m ? 'opacity-50' : ''}`}
                            >
                                {MODE_ICONS[m]}
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BIO */}
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Bio</h3>
                    {isEditing ? (
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm min-h-[80px]"
                            value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                            placeholder="Cuéntanos algo sobre ti..."
                        />
                    ) : (
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {session?.user.bio || "Sin descripción."}
                        </p>
                    )}
                </div>

                {/* CATEGORIES */}
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase">Intereses ({form.categories.length}/3)</h3>
                        {isEditing && <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">Selecciona hasta 3</span>}
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
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'
                                        }`}
                                >
                                    {cat}
                                    {isSelected && <Check size={12} className="inline ml-1" />}
                                </button>
                            );
                        })}
                        {CATEGORY_OPTIONS[form.currentMode].length === 0 && (
                            <span className="text-xs text-slate-400 italic">No hay categorías disponibles para este modo.</span>
                        )}
                    </div>
                </div>

                {/* SOCIAL LINKS */}
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Redes Sociales</h3>

                    <div className="space-y-3">
                        {/* Instagram */}
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-2 rounded-lg">
                                <Instagram size={16} />
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={form.instagram}
                                    onChange={e => setForm({ ...form, instagram: e.target.value })}
                                    placeholder="@usuario"
                                />
                            ) : (
                                <span className="text-sm text-slate-600">
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
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={form.twitter}
                                    onChange={e => setForm({ ...form, twitter: e.target.value })}
                                    placeholder="@usuario"
                                />
                            ) : (
                                <span className="text-sm text-slate-600">
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
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={form.linkedin}
                                    onChange={e => setForm({ ...form, linkedin: e.target.value })}
                                    placeholder="linkedin.com/in/usuario"
                                />
                            ) : (
                                <span className="text-sm text-slate-600">
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
