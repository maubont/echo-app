import { useState } from 'react';
import { Camera, Check, Filter, Instagram, Twitter, Linkedin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { AgeVerificationModal } from '../../components/ui/AgeVerificationModal';
import { AppContextMode } from '../../lib/types';
import { CATEGORY_OPTIONS, MODE_ICONS, MODE_LABELS, MODE_DESCRIPTIONS } from '../../lib/constants';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const ProfilePage = () => {
    const { session, updateProfile, updateModeProfile, signOut } = useAuth();
    const { theme: currentTheme, setTheme } = useTheme();
    const navigate = useNavigate();
    const { isInstallable, installApp } = usePWAInstall();

    const [isEditing, setIsEditing] = useState(false);
    
    // Get initial values prioritizing mode-specific data
    const initialMode = session?.user.currentMode || 'networking';
    const currentModeProfile = session?.user.modeProfiles?.[initialMode];
    
    const [form, setForm] = useState({
        name: currentModeProfile?.nickname || session?.user.name || '',
        bio: currentModeProfile?.bio || session?.user.bio || '',
        currentMode: initialMode,
        categories: session?.user.categories || [],
        avatarUrl: currentModeProfile?.avatarUrl || session?.user.avatarUrl || '',
        isGhostMode: currentModeProfile?.isGhostMode || false,
        instagram: session?.user.instagram || '',
        twitter: session?.user.twitter || '',
        linkedin: session?.user.linkedin || ''
    });

    const modes: AppContextMode[] = ['networking', 'social', 'discovery', 'adult'];

    const [isSaving, setIsSaving] = useState(false);
    const [showAgeModal, setShowAgeModal] = useState(false);
    const [pendingAdultSwitch, setPendingAdultSwitch] = useState(false);

    // Check if user already verified age for adult mode
    const isAgeVerified = session?.user.modeProfiles?.['adult']?.nickname ? true : false;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save global profile
            await updateProfile({
                currentMode: form.currentMode,
                categories: form.categories,
                instagram: form.instagram,
                twitter: form.twitter,
                linkedin: form.linkedin,
                // also update global name/bio if networking mode
                ...(form.currentMode === 'networking' ? { name: form.name, bio: form.bio, avatarUrl: form.avatarUrl } : {})
            });

            // Save mode-specific profile
            await updateModeProfile(form.currentMode, {
                nickname: form.name,
                bio: form.bio,
                avatarUrl: form.avatarUrl,
                isGhostMode: form.isGhostMode
            });
        } finally {
            setIsSaving(false);
        }
        setIsEditing(false);
    };

    const handleModeSwitch = (m: AppContextMode) => {
        // Gate: require age verification for adult mode
        if (m === 'adult' && !isAgeVerified) {
            setPendingAdultSwitch(true);
            setShowAgeModal(true);
            return;
        }
        doModeSwitch(m);
    };

    const doModeSwitch = (m: AppContextMode) => {
        const modeProfile = session?.user.modeProfiles?.[m];
        setForm({
            ...form,
            currentMode: m,
            name: modeProfile?.nickname || session?.user.name || '',
            bio: modeProfile?.bio || session?.user.bio || '',
            avatarUrl: modeProfile?.avatarUrl || session?.user.avatarUrl || '',
            isGhostMode: modeProfile?.isGhostMode || false,
            categories: session?.user.currentMode === m ? session?.user.categories : []
        });
    };

    const handleAgeConfirmed = async () => {
        setShowAgeModal(false);
        // Save initial adult mode profile (marks as verified)
        await updateModeProfile('adult', {
            nickname: session?.user.name || 'Anónimo',
            bio: '',
            isGhostMode: true, // default ghost mode ON for adult
        });
        doModeSwitch('adult');
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
            {/* Age Verification Modal */}
            <AgeVerificationModal
                isOpen={showAgeModal}
                onConfirm={handleAgeConfirmed}
                onCancel={() => { setShowAgeModal(false); setPendingAdultSwitch(false); }}
            />
            <div className="bg-theme-card/90 backdrop-blur-xl p-6 rounded-b-3xl shadow-theme-md mb-4 border-b transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-theme-primary">Mi Perfil</h1>
                    <Button
                        label={isSaving ? 'Guardando...' : isEditing ? 'Guardar' : 'Editar'}
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        variant="premium"
                        size="xs"
                        disabled={isSaving}
                    />
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
                        <h2 className="text-xl font-bold text-theme-primary">
                            {session?.user.modeProfiles?.[form.currentMode]?.nickname || session?.user.name}
                        </h2>
                    )}
                    <p className="text-sm text-theme-secondary">{session?.user.email}</p>
                    {!isEditing && (
                        <span className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                            form.currentMode === 'adult' ? 'bg-red-100 text-red-600' : 'bg-primary/10'
                        }`} style={form.currentMode !== 'adult' ? { color: 'rgb(var(--primary-500))' } : {}}>
                            {MODE_LABELS[form.currentMode as AppContextMode] || form.currentMode}
                        </span>
                    )}
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
                                onClick={() => handleModeSwitch(m)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all flex items-center gap-1.5 ${
                                    form.currentMode === m
                                        ? m === 'adult' ? 'bg-red-500 text-white shadow-theme-md border-red-400' : 'bg-primary text-white shadow-theme-md'
                                        : 'bg-theme-secondary/30 text-theme-secondary hover:bg-theme-secondary/50'
                                } ${!isEditing && form.currentMode !== m ? 'opacity-40' : ''}`}
                                style={form.currentMode === m && m !== 'adult' ? {} : { borderColor: 'rgb(var(--glass-border))' }}
                            >
                                {MODE_ICONS[m] || <Filter size={14} />}
                                {MODE_LABELS[m] || m}
                            </button>
                        ))}
                    </div>
                    {/* Mode description */}
                    <p className="text-[11px] text-theme-tertiary mt-3 italic">
                        {MODE_DESCRIPTIONS[form.currentMode as AppContextMode]}
                    </p>
                </div>

                {/* GHOST MODE TOGGLE (ONLY ADULT/DISCOVERY) */}
                {(form.currentMode === 'adult' || form.currentMode === 'discovery') && (
                    <div className="bg-theme-card/80 backdrop-blur-lg p-4 rounded-2xl shadow-theme-sm border transition-all duration-300 flex items-center justify-between" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                        <div>
                            <h3 className="text-xs font-bold text-theme-tertiary uppercase mb-1">Ghost Mode</h3>
                            <p className="text-[10px] text-theme-secondary">Oculta tu perfil del mapa público.</p>
                        </div>
                        <button
                            disabled={!isEditing}
                            onClick={() => setForm({ ...form, isGhostMode: !form.isGhostMode })}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${form.isGhostMode ? 'bg-primary' : 'bg-theme-secondary/50'}`}
                            style={form.isGhostMode ? { backgroundColor: 'rgb(var(--primary-500))' } : {}}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${form.isGhostMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                )}

                {/* BIO */}
                <div className="bg-theme-card/80 backdrop-blur-lg p-4 rounded-2xl shadow-theme-sm border transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                    <h3 className="text-xs font-bold text-theme-tertiary uppercase mb-2">
                        Bio {form.currentMode !== 'networking' && `(${MODE_LABELS[form.currentMode as AppContextMode]})`}
                    </h3>
                    {isEditing ? (
                        <textarea
                            className="w-full bg-theme-secondary border rounded-xl p-3 text-sm min-h-[80px] text-theme-primary placeholder-theme-tertiary"
                            style={{ borderColor: 'rgb(var(--glass-border))' }}
                            value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                            placeholder="Cuéntanos algo sobre ti..."
                        />
                    ) : (
                        <p className="text-sm text-theme-secondary leading-relaxed">
                            {session?.user.modeProfiles?.[form.currentMode]?.bio || session?.user.bio || 'Sin descripción.'}
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
                        {(CATEGORY_OPTIONS[form.currentMode] || []).map(cat => {
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
                        {(!CATEGORY_OPTIONS[form.currentMode] || CATEGORY_OPTIONS[form.currentMode].length === 0) && (
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
                            <div className="aspect-square rounded-lg mb-2 bg-linear-to-br from-blue-400 via-purple-400 to-pink-300"></div>
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
                            <div className="aspect-square rounded-lg mb-2 bg-linear-to-br from-indigo-600 via-purple-500 to-cyan-400"></div>
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
                            <div className="bg-linear-to-br from-purple-600 to-pink-600 text-white p-2 rounded-lg">
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
                            className="bg-linear-to-r from-blue-600 to-cyan-500 border-none shadow-lg"
                        />
                    )}
                    <Button label="Cerrar Sesión" variant="danger" fullWidth onClick={() => { signOut(); navigate('/login'); }} />
                </div>
            </div>
        </div>
    );
};
