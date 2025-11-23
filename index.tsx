import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  MapPin, User, LogIn, Shield, LocateFixed, 
  Eye, EyeOff, Store, Filter, 
  MessageCircle, Settings, X,
  Camera, Info, AlertTriangle, Lock,
  LayoutGrid, Check, Briefcase, Heart, Coffee, Plane,
  Send, ArrowLeft, MoreVertical, Phone
} from 'lucide-react';
import L from 'leaflet';

// --- DOMAIN & TYPES ---

type UserRole = 'person' | 'business';
type AppContextMode = 'networking' | 'social' | 'dating' | 'tourism' | 'business';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  currentMode: AppContextMode;
  categories: string[];
}

interface AuthSession {
  access_token: string;
  user: UserProfile;
  expires_at: number;
}

interface PresenceState {
  isVisible: boolean;
  lat: number | null;
  lng: number | null;
  lastHeartbeat: number | null;
  expiresAt?: number;
}

interface MapEntity {
  id: string;
  lat: number;
  lng: number;
  type: 'person' | 'business';
  mode: AppContextMode;
  categories: string[];
  name: string;
  description: string;
  avatarUrl?: string;
  lastSeen: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

interface ChatConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
  messages: ChatMessage[];
}

const CATEGORY_OPTIONS: Record<AppContextMode, string[]> = {
  networking: ['Software', 'Design', 'Marketing', 'Investors', 'Sales', 'Founder', 'Legal'],
  social: ['Fiesta', 'Comida', 'Deportes', 'Música', 'Juegos', 'Charla'],
  dating: ['Casual', 'Serio', 'Amistad', 'Café', 'Cena'],
  tourism: ['Turismo', 'Museos', 'Tours', 'Vida Nocturna', 'Gastronomía'],
  business: ['Restaurante', 'Tienda', 'Servicios', 'B2B', 'Tecnología']
};

const MODE_ICONS: Record<AppContextMode, React.ReactNode> = {
  networking: <Briefcase size={16}/>,
  social: <Coffee size={16}/>,
  dating: <Heart size={16}/>,
  tourism: <Plane size={16}/>,
  business: <Store size={16}/>
};

// --- MOCK SERVICES (SUPABASE SIMULATION) ---

const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: any) => {
      await new Promise(r => setTimeout(r, 1500));
      if (password === 'error') throw new Error('Credenciales inválidas');
      
      const user: UserProfile = {
        id: 'user-' + Math.random().toString(36).substring(7),
        email,
        name: email.split('@')[0],
        role: 'person',
        currentMode: 'networking',
        categories: ['Software'],
        bio: 'Entusiasta de la tecnología explorando la ciudad.',
        avatarUrl: `https://i.pravatar.cc/150?u=${email}`
      };
      
      const session: AuthSession = {
        access_token: 'mock-jwt-' + Date.now(),
        user,
        expires_at: Date.now() + 3600 * 1000
      };
      
      localStorage.setItem('sb-session', JSON.stringify(session));
      return { data: { session }, error: null };
    },
    
    signUp: async ({ email, password, options }: any) => {
      await new Promise(r => setTimeout(r, 1500));
      const user: UserProfile = {
        id: 'user-' + Math.random().toString(36).substring(7),
        email,
        name: options?.data?.name || 'Usuario',
        role: options?.data?.role || 'person',
        currentMode: 'networking',
        categories: [],
        bio: '¡Hola! Soy nuevo aquí.',
        avatarUrl: `https://i.pravatar.cc/150?u=${email}`
      };
      const session: AuthSession = {
        access_token: 'mock-jwt-' + Date.now(),
        user,
        expires_at: Date.now() + 3600 * 1000
      };
      localStorage.setItem('sb-session', JSON.stringify(session));
      return { data: { session }, error: null };
    },

    signOut: async () => {
      await new Promise(r => setTimeout(r, 500));
      localStorage.removeItem('sb-session');
      return { error: null };
    },

    getSession: async () => {
      await new Promise(r => setTimeout(r, 500));
      const json = localStorage.getItem('sb-session');
      if (!json) return { data: { session: null }, error: null };
      return { data: { session: JSON.parse(json) as AuthSession }, error: null };
    },

    updateUser: async (updates: Partial<UserProfile>) => {
      await new Promise(r => setTimeout(r, 800));
      const json = localStorage.getItem('sb-session');
      if (json) {
        const session = JSON.parse(json) as AuthSession;
        session.user = { ...session.user, ...updates };
        localStorage.setItem('sb-session', JSON.stringify(session));
        return { data: { user: session.user }, error: null };
      }
      return { data: null, error: 'No session' };
    }
  },
  
  from: (table: string) => ({
    upsert: async (data: any) => { return { error: null }; },
    select: async () => { await new Promise(r => setTimeout(r, 600)); return { data: [], error: null }; }
  })
};

// --- FEATURE: PRESENCE SERVICE ---

const PresenceService = {
  applyJitter: (lat: number, lng: number, meters = 150): { lat: number, lng: number } => {
    const r = meters / 111300;
    const u = Math.random();
    const v = Math.random();
    const w = r * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);
    return {
      lat: lat + x,
      lng: lng + (y / Math.cos(lat * (Math.PI / 180)))
    };
  },

  syncPresence: async (userId: string, lat: number, lng: number, mode: string, isVisible: boolean) => {
    return await supabase.from('presence').upsert({
      user_id: userId,
      lat: isVisible ? lat : null,
      lng: isVisible ? lng : null,
      mode,
      last_seen: new Date().toISOString()
    });
  }
};

// --- HOOKS ---

const useGeoLocation = () => {
  const [state, setState] = useState<{
    coords: { lat: number; lng: number } | null;
    error: string | null;
    loading: boolean;
    permissionStatus: PermissionState | 'unknown' | 'denied_app_level';
  }>({
    coords: null, error: null, loading: false, permissionStatus: 'unknown',
  });

  const requestPermission = () => {
    if (!navigator.geolocation) return setState(s => ({ ...s, error: "No soportado.", permissionStatus: 'denied_app_level' }));
    
    setState(s => ({ ...s, loading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({ 
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, 
          error: null, 
          loading: false, 
          permissionStatus: 'granted' 
        });
      },
      (err) => {
        console.error(err);
        setState(s => ({ 
          ...s, 
          error: "Permiso denegado. Habilítalo en configuración.", 
          loading: false,
          permissionStatus: 'denied_app_level' 
        }));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return { ...state, requestPermission, getPosition: requestPermission };
};

// --- CONTEXTS ---

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  signIn: (e: string, p: string) => Promise<any>;
  signUp: (e: string, n: string, r: UserRole, p: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}
const AuthContext = createContext<AuthContextType>(null!);

interface PresenceContextType {
  state: PresenceState;
  toggleVisibility: (durationMinutes?: number) => void;
  syncLocation: (lat: number, lng: number) => void;
}
const PresenceContext = createContext<PresenceContextType>(null!);

type RouteName = 'splash' | 'login' | 'signup' | 'permission' | 'home' | 'map' | 'profile' | 'chat';
interface RouterContextType {
  current: RouteName; 
  params?: any;
  go: (r: RouteName, params?: any) => void;
}
const RouterContext = createContext<RouterContextType>(null!);

// --- PROVIDERS COMPONENT ---

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
  }, []);

  const authMethods = {
    signIn: async (e: string, p: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) throw error;
      setSession(data.session);
    },
    signUp: async (e: string, n: string, r: UserRole, p: string) => {
      const { data, error } = await supabase.auth.signUp({ email: e, password: p, options: { data: { name: n, role: r } } });
      if (error) throw error;
      setSession(data.session);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
    },
    updateProfile: async (updates: Partial<UserProfile>) => {
      const { data } = await supabase.auth.updateUser(updates);
      if (data?.user && session) setSession({ ...session, user: data.user as UserProfile });
    }
  };

  const [presenceState, setPresenceState] = useState<PresenceState>({
    isVisible: false, lat: null, lng: null, lastHeartbeat: null
  });

  const presenceMethods = {
    state: presenceState,
    toggleVisibility: (minutes = 60) => {
      setPresenceState(prev => ({
        ...prev,
        isVisible: !prev.isVisible,
        expiresAt: !prev.isVisible ? Date.now() + minutes * 60000 : undefined
      }));
    },
    syncLocation: (lat: number, lng: number) => {
      setPresenceState(prev => ({ ...prev, lat, lng, lastHeartbeat: Date.now() }));
      if (session?.user) {
         const jittered = PresenceService.applyJitter(lat, lng);
         PresenceService.syncPresence(session.user.id, jittered.lat, jittered.lng, session.user.currentMode, presenceState.isVisible);
      }
    }
  };

  const [route, setRoute] = useState<RouteName>('splash');
  const [params, setParams] = useState<any>(null);

  const routerMethods = {
    current: route,
    params,
    go: (r: RouteName, p?: any) => {
      setRoute(r);
      setParams(p);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading: authLoading, ...authMethods }}>
      <PresenceContext.Provider value={presenceMethods}>
        <RouterContext.Provider value={routerMethods}>
          {children}
        </RouterContext.Provider>
      </PresenceContext.Provider>
    </AuthContext.Provider>
  );
};

// --- UI COMPONENTS ---

const Button: React.FC<{ 
  onClick?: () => void; 
  label: string; 
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}> = ({ onClick, label, icon, variant = 'primary', size = 'md', fullWidth = false, disabled, loading, type = 'button', className = '' }) => {
  const base = "rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { xs: "py-1.5 px-2.5 text-xs", sm: "py-2 px-3 text-sm", md: "py-3 px-5 text-base" };
  const variants = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:border-slate-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
      {!loading && icon} 
      {label}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string, icon?: React.ReactNode }> = 
  ({ label, icon, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
      <input 
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-blue-500 transition-colors focus:bg-white ${icon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
    </div>
  </div>
);

const BottomNav = () => {
  const { current, go } = useContext(RouterContext);
  if (['splash', 'login', 'signup', 'permission'].includes(current)) return null;

  const items = [
    { id: 'home', icon: <LayoutGrid size={24}/>, label: 'Inicio' },
    { id: 'map', icon: <MapPin size={24}/>, label: 'Mapa' },
    { id: 'chat', icon: <MessageCircle size={24}/>, label: 'Chats' },
    { id: 'profile', icon: <User size={24}/>, label: 'Perfil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-[80px]">
      {items.map((item) => (
        <button 
          key={item.id}
          onClick={() => go(item.id as RouteName)}
          className={`flex flex-col items-center gap-1 transition-colors ${
            current === item.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {React.cloneElement(item.icon as React.ReactElement<any>, { 
            strokeWidth: current === item.id ? 2.5 : 2 
          })}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// --- FEATURES ---

// 1. SPLASH & ROUTING
const Splash = () => {
  const { go } = useContext(RouterContext);
  const { session, loading } = useContext(AuthContext);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        if (session) go('home');
        else go('login');
      }, 1500);
    }
  }, [session, loading]);

  return (
    <div className="h-screen bg-blue-600 flex flex-col items-center justify-center text-white relative overflow-hidden">
       <div className="bg-white p-4 rounded-3xl shadow-2xl animate-bounce mb-4 z-10">
        <MapPin className="text-blue-600 w-12 h-12" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Proxi</h1>
      <div className="animate-spin mt-8 text-blue-200 w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
    </div>
  );
};

// 2. AUTH SCREENS
const AuthScreen = ({ type }: { type: 'login' | 'signup' }) => {
  const { signIn, signUp } = useContext(AuthContext);
  const { go } = useContext(RouterContext);
  
  const [loading, setLoading] = useState(false);
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
      go('permission');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 flex flex-col justify-center relative">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4 text-blue-600">
          <Shield size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{type === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2>
        <p className="text-slate-500 mt-2 text-sm">Descubre oportunidades a tu alrededor.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        {type === 'signup' && (
          <div className="grid grid-cols-2 gap-3 mb-2">
             <button type="button" onClick={() => setRole('person')} className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 ${role === 'person' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                <User size={20}/> Persona
             </button>
             <button type="button" onClick={() => setRole('business')} className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 ${role === 'business' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                <Store size={20}/> Negocio
             </button>
          </div>
        )}

        {type === 'signup' && (
          <Input 
            icon={<User size={18}/>} placeholder="Nombre Completo" required
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
          />
        )}
        <Input 
          icon={<User size={18}/>} type="email" placeholder="correo@ejemplo.com" required
          value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
        />
        <Input 
          icon={<Lock size={18}/>} type="password" placeholder="Contraseña" required
          value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
        />

        {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2"><AlertTriangle size={14}/> {error}</div>}

        <Button label={type === 'login' ? "Ingresar" : "Registrarse"} loading={loading} fullWidth type="submit" />
      </form>
      
      <div className="text-center mt-6">
        <button type="button" onClick={() => go(type === 'login' ? 'signup' : 'login')} className="text-sm text-blue-600 font-medium hover:underline">
          {type === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
};

// 3. PERMISSION PAGE
const PermissionPage = () => {
  const { requestPermission, permissionStatus, loading } = useGeoLocation();
  const { go } = useContext(RouterContext);

  useEffect(() => {
    if (permissionStatus === 'granted') go('home');
  }, [permissionStatus]);

  return (
    <div className="h-screen bg-white px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6">
        <LocateFixed size={40} />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 mb-3">Habilita tu Ubicación</h2>
      
      <div className="bg-slate-50 p-4 rounded-xl text-left mb-8 border border-slate-100">
        <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2">
          <Info size={16} className="text-blue-500"/> ¿Por qué lo necesitamos?
        </h4>
        <ul className="text-sm text-slate-500 space-y-2 list-disc pl-5">
          <li>Para mostrarte eventos y personas a tu alrededor.</li>
          <li>Para verificar que estás realmente en el evento (check-in).</li>
          <li>Tu ubicación exacta <strong>nunca</strong> se comparte. Usamos "Jitter" (ruido) para protegerte.</li>
        </ul>
      </div>

      <div className="w-full space-y-3">
        <Button 
          label={loading ? "Verificando..." : "Permitir acceso a Ubicación"} 
          onClick={requestPermission} 
          fullWidth 
          loading={loading}
        />
        <Button label="Ahora no" variant="ghost" onClick={() => go('home')} fullWidth />
      </div>

      {permissionStatus === 'denied_app_level' && (
        <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-left">
           <AlertTriangle className="text-red-500 shrink-0" size={18} />
           <div className="text-xs text-red-600">
             <strong>Permiso bloqueado.</strong><br/>
             Tu navegador ha bloqueado la ubicación. Ve a la configuración del sitio y selecciona "Permitir".
           </div>
        </div>
      )}
    </div>
  );
};

// 4. CHAT PAGE (New)
const ChatPage = () => {
  const { session } = useContext(AuthContext);
  const { go, params } = useContext(RouterContext);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [inputText, setInputText] = useState('');

  // Initial mock data or load from "backend"
  useEffect(() => {
    const mockChats: ChatConversation[] = [
      {
        id: 'c1',
        participantId: 'u2',
        participantName: 'Ana Ingeniera',
        lastMessage: '¡Hola! Vi que estás en el evento.',
        lastTimestamp: Date.now() - 1000 * 60 * 5,
        unreadCount: 1,
        messages: [
          { id: 'm1', senderId: 'u2', text: '¡Hola! Vi que estás en el evento.', timestamp: Date.now() - 1000 * 60 * 5 }
        ]
      },
      {
        id: 'c2',
        participantId: 'u3',
        participantName: 'Stand TechCorp',
        participantAvatar: 'https://ui-avatars.com/api/?name=TC&background=random',
        lastMessage: 'Tenemos descuentos hoy.',
        lastTimestamp: Date.now() - 1000 * 60 * 60 * 2,
        unreadCount: 0,
        messages: [
          { id: 'm1', senderId: 'u3', text: 'Gracias por visitar nuestro stand.', timestamp: Date.now() - 1000 * 60 * 60 * 2 },
          { id: 'm2', senderId: 'u3', text: 'Tenemos descuentos hoy.', timestamp: Date.now() - 1000 * 60 * 60 * 2 }
        ]
      }
    ];
    setConversations(mockChats);

    // If navigating from map with target user, open or create chat
    if (params?.userId) {
      const existing = mockChats.find(c => c.participantId === params.userId);
      if (existing) {
        setActiveChatId(existing.id);
      } else {
        // Create temp new chat
        const newChat: ChatConversation = {
          id: `c-${Date.now()}`,
          participantId: params.userId,
          participantName: params.userName || 'Usuario',
          participantAvatar: params.userAvatar,
          lastMessage: '',
          lastTimestamp: Date.now(),
          unreadCount: 0,
          messages: []
        };
        setConversations([newChat, ...mockChats]);
        setActiveChatId(newChat.id);
      }
    }
  }, [params]);

  const handleSend = () => {
    if (!inputText.trim() || !activeChatId || !session) return;
    
    setConversations(prev => prev.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [...chat.messages, {
            id: `m-${Date.now()}`,
            senderId: session.user.id,
            text: inputText,
            timestamp: Date.now()
          }],
          lastMessage: inputText,
          lastTimestamp: Date.now()
        };
      }
      return chat;
    }));
    setInputText('');
    
    // Simulate reply
    setTimeout(() => {
       setConversations(prev => prev.map(chat => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [...chat.messages, {
              id: `m-rep-${Date.now()}`,
              senderId: chat.participantId,
              text: '¡Qué interesante! Cuéntame más.',
              timestamp: Date.now()
            }],
            lastMessage: '¡Qué interesante! Cuéntame más.',
            lastTimestamp: Date.now()
          };
        }
        return chat;
      }));
    }, 2000);
  };

  const activeChat = conversations.find(c => c.id === activeChatId);

  // View: Chat List
  if (!activeChatId) {
    return (
      <div className="h-screen bg-white pb-[90px] flex flex-col">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-bold text-slate-900">Mensajes</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {conversations.length === 0 ? (
            <div className="text-center mt-20 text-slate-400">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p>No tienes mensajes aún.</p>
              <Button variant="ghost" label="Ir al mapa" onClick={() => go('map')} className="mt-4"/>
            </div>
          ) : (
            conversations.map(chat => (
              <div 
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
              >
                <div className="relative">
                  <img 
                    src={chat.participantAvatar || `https://ui-avatars.com/api/?name=${chat.participantName}&background=random`} 
                    className="w-12 h-12 rounded-full object-cover border border-slate-100"
                  />
                  {chat.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-white">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-slate-900 truncate">{chat.participantName}</h3>
                    <span className="text-[10px] text-slate-400">
                      {new Date(chat.lastTimestamp).getHours()}:{new Date(chat.lastTimestamp).getMinutes().toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                    {chat.lastMessage || 'Inicia la conversación'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // View: Conversation Detail
  return (
    <div className="h-screen bg-white flex flex-col z-50 relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white/90 backdrop-blur shadow-sm">
        <button onClick={() => setActiveChatId(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} className="text-slate-600"/>
        </button>
        <div className="relative">
           <img 
             src={activeChat?.participantAvatar || `https://ui-avatars.com/api/?name=${activeChat?.participantName}`} 
             className="w-10 h-10 rounded-full object-cover"
           />
           <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white"></span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 text-sm">{activeChat?.participantName}</h3>
          <p className="text-xs text-slate-500">En línea</p>
        </div>
        <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
           <Phone size={20} />
        </button>
        <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
           <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {activeChat?.messages.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
            Envía un mensaje para comenzar a charlar.
          </div>
        )}
        {activeChat?.messages.map(msg => {
          const isMe = msg.senderId === session?.user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                isMe 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
              }`}>
                {msg.text}
                <div className={`text-[10px] mt-1 text-right opacity-70 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 pb-8">
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <input 
            className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-slate-400"
            placeholder="Escribe un mensaje..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 5. MAP PAGE
const PublicProfileModal = ({ entity, onClose }: { entity: MapEntity, onClose: () => void }) => {
  const { go } = useContext(RouterContext);
  
  const handleConnect = () => {
    onClose();
    go('chat', { 
      userId: entity.id, 
      userName: entity.name,
      userAvatar: entity.avatarUrl 
    });
  };

  return (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
    <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
      <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white p-1.5 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="px-6 pb-6 -mt-12">
        <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg mb-3">
          <img 
            src={entity.avatarUrl || `https://ui-avatars.com/api/?name=${entity.name}&background=random`} 
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <div className="flex justify-between items-start mb-1">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{entity.name}</h2>
            <p className="text-slate-500 text-sm flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${entity.type === 'business' ? 'bg-purple-500' : 'bg-green-500'}`} />
              {entity.type === 'business' ? 'Negocio Local' : 'Persona'}
            </p>
          </div>
          <div className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase text-slate-500">
            {entity.mode}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {entity.categories.map(cat => (
            <span key={cat} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-bold">
              {cat}
            </span>
          ))}
        </div>

        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-6 border border-slate-100">
          "{entity.description}"
        </p>

        <Button fullWidth label="Enviar Mensaje" icon={<MessageCircle size={18}/>} onClick={handleConnect} />
      </div>
    </div>
  </div>
)};

const MapPage = () => {
  const { session } = useContext(AuthContext);
  const { state: presence } = useContext(PresenceContext);
  const { coords, getPosition, loading: locLoading } = useGeoLocation();
  const { go } = useContext(RouterContext);
  
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<any>(null);

  const [entities, setEntities] = useState<MapEntity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (!coords) return;
    setEntitiesLoading(true);
    
    setTimeout(() => {
      const baseLat = coords.lat;
      const baseLng = coords.lng;
      const newEntities: MapEntity[] = [];
      
      for(let i=0; i<30; i++) {
        const mode = i % 2 === 0 ? 'networking' : 'social';
        newEntities.push({
            id: `ent-${i}`,
            lat: baseLat + (Math.random() - 0.5) * 0.015,
            lng: baseLng + (Math.random() - 0.5) * 0.015,
            type: i % 5 === 0 ? 'business' : 'person',
            mode: mode as AppContextMode,
            categories: [CATEGORY_OPTIONS[mode as AppContextMode][Math.floor(Math.random() * 3)]],
            name: i % 5 === 0 ? `Negocio ${i}` : `Usuario ${i}`,
            description: 'Disponible para conectar.',
            avatarUrl: `https://ui-avatars.com/api/?name=${i % 5 === 0 ? `Negocio ${i}` : `Usuario ${i}`}&background=random`,
            lastSeen: Date.now()
        });
      }
      setEntities(newEntities);
      setEntitiesLoading(false);
    }, 1000);

  }, [coords, session?.user.currentMode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([0, 0], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    
    // @ts-ignore
    if (L.markerClusterGroup) {
        // @ts-ignore
        markersGroupRef.current = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 40,
            iconCreateFunction: function (cluster: any) {
		        var childCount = cluster.getChildCount();
		        return L.divIcon({ 
                    html: '<div class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-lg">' + childCount + '</div>', 
                    className: 'bg-transparent', 
                    iconSize: [40, 40] 
                });
	        }
        });
        map.addLayer(markersGroupRef.current);
    }

    mapRef.current = map;
    getPosition();
  }, []);

  useEffect(() => {
    if (!mapRef.current || !coords) return;
    const map = mapRef.current;
    const clusterGroup = markersGroupRef.current;

    if (map.getCenter().lat === 0) map.setView([coords.lat, coords.lng], 16);

    if (clusterGroup) clusterGroup.clearLayers();
    map.eachLayer(layer => {
        if ((layer as any).options?.icon?.options?.className?.includes('user-indicator')) map.removeLayer(layer);
    });

    if (presence.isVisible) {
        const jittered = PresenceService.applyJitter(coords.lat, coords.lng);
        
        L.circle([coords.lat, coords.lng], { radius: 100, color: 'transparent', fillColor: '#3b82f6', fillOpacity: 0.1 }).addTo(map);
        
        const userIcon = L.divIcon({
            className: 'user-indicator',
            html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg ring-4 ring-blue-500/30"></div>`,
            iconSize: [16, 16]
        });
        L.marker([jittered.lat, jittered.lng], { icon: userIcon }).addTo(map);
    }

    const markers: L.Marker[] = [];
    entities.forEach(ent => {
        if (ent.mode !== session?.user.currentMode && ent.type !== 'business') return;

        const color = ent.type === 'business' ? 'bg-purple-600' : 'bg-slate-700';
        const icon = L.divIcon({
            className: 'custom-pin',
            html: `<div class="${color} w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md hover:scale-110 transition-transform">
                ${ent.type === 'business' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v9"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'}
            </div>`,
            iconSize: [32, 32]
        });
        const m = L.marker([ent.lat, ent.lng], { icon });
        m.on('click', () => {
          setSelectedEntity(ent);
          // Don't verify profile modal here, rely on popup state
        });
        markers.push(m);
    });

    if (clusterGroup) clusterGroup.addLayers(markers);

  }, [coords, entities, presence.isVisible]);

  return (
    <div className="h-screen w-full relative bg-slate-100">
       <div ref={containerRef} className="absolute inset-0 z-0" />
       
       {/* Loading States */}
       {(locLoading || entitiesLoading) && (
         <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-sm px-4 py-2 rounded-full z-20 flex items-center gap-2 text-xs font-bold text-slate-600">
            <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full text-blue-600" />
            {locLoading ? 'Obteniendo GPS...' : 'Buscando gente...'}
         </div>
       )}

       {/* Context Selector (Top) */}
       <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg flex justify-between items-center">
             <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Modo Actual</p>
                <p className="font-bold text-slate-800 capitalize flex items-center gap-2">
                  {MODE_ICONS[session?.user.currentMode || 'networking']}
                  {session?.user.currentMode || 'Cargando...'}
                </p>
             </div>
             <button onClick={() => go('profile')} className="bg-slate-100 p-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
                <Settings size={18}/>
             </button>
          </div>
       </div>

       {/* Selected Entity Popup */}
       {selectedEntity && !showProfileModal && (
         <div className="absolute bottom-24 left-4 right-4 z-30">
            <div className="bg-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5">
               <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{selectedEntity.name}</h3>
                  <button onClick={() => setSelectedEntity(null)}><X size={20} className="text-slate-400"/></button>
               </div>
               <p className="text-sm text-slate-500 mb-4">{selectedEntity.description}</p>
               <div className="grid grid-cols-2 gap-3">
                  <Button label="Ver Perfil" variant="secondary" size="sm" onClick={() => setShowProfileModal(true)} />
                  <Button label="Conectar" size="sm" icon={<MessageCircle size={16}/>} onClick={() => {
                    setSelectedEntity(null);
                    go('chat', { userId: selectedEntity.id, userName: selectedEntity.name, userAvatar: selectedEntity.avatarUrl });
                  }}/>
               </div>
            </div>
         </div>
       )}

       {showProfileModal && selectedEntity && (
         <PublicProfileModal entity={selectedEntity} onClose={() => setShowProfileModal(false)} />
       )}
    </div>
  );
};

// 6. PROFILE (Expanded)
const ProfilePage = () => {
  const { session, updateProfile, signOut } = useContext(AuthContext);
  const { go } = useContext(RouterContext);
  
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ 
      name: session?.user.name || '', 
      bio: session?.user.bio || '', 
      currentMode: session?.user.currentMode || 'networking',
      categories: session?.user.categories || [],
      avatarUrl: session?.user.avatarUrl || ''
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
                   value={form.name} onChange={e => setForm({...form, name: e.target.value})}
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
                        onClick={() => setForm({...form, currentMode: m, categories: []})}
                        className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all flex items-center gap-1.5 ${
                            form.currentMode === m 
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
                    value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                isSelected
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

         <div className="pt-4">
            <Button label="Cerrar Sesión" variant="danger" fullWidth onClick={() => { signOut(); go('login'); }} />
         </div>
      </div>
    </div>
  );
};

// 7. HOME
const Home = () => {
  const { session } = useContext(AuthContext);
  const { state: presence, toggleVisibility, syncLocation } = useContext(PresenceContext);
  const { coords } = useGeoLocation();
  const { go } = useContext(RouterContext);
  
  useEffect(() => {
      if (coords) syncLocation(coords.lat, coords.lng);
  }, [coords]);

  return (
    <div className="h-screen bg-slate-50 p-6 flex flex-col">
       <header className="mb-6 flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold text-slate-900">Hola, {session?.user.name.split(' ')[0]} 👋</h1>
             <p className="text-slate-500 text-sm flex items-center gap-1">
               <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
               En línea
             </p>
          </div>
          <div onClick={() => go('profile')} className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow cursor-pointer">
            <img src={session?.user.avatarUrl || `https://ui-avatars.com/api/?name=${session?.user.name}`} className="w-full h-full object-cover" />
          </div>
       </header>

       <div className={`rounded-3xl p-6 text-white shadow-xl mb-6 transition-all relative overflow-hidden ${presence.isVisible ? 'bg-blue-600' : 'bg-slate-800'}`}>
           {presence.isVisible && <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />}
           
           <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                 {presence.isVisible ? <Eye size={24}/> : <EyeOff size={24}/>}
              </div>
              {presence.isVisible && <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">EXPIRA: 59m</span>}
           </div>
           <h2 className="text-2xl font-bold mb-1 relative z-10">{presence.isVisible ? 'Estás Visible' : 'Estás Oculto'}</h2>
           <p className="text-blue-100 text-xs mb-6 relative z-10 leading-relaxed opacity-90">
             {presence.isVisible ? 'Tu ubicación aproximada se muestra en el mapa para otros usuarios en modo ' + session?.user.currentMode : 'Nadie puede ver tu ubicación en el mapa.'}
           </p>
           <button 
             onClick={() => toggleVisibility()} 
             className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg active:scale-[0.98]"
           >
             {presence.isVisible ? 'Ocultarme Ahora' : 'Hacerme Visible'}
           </button>
       </div>

       <div className="grid grid-cols-2 gap-4">
          <div onClick={() => go('map')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 cursor-pointer transition-all hover:-translate-y-1 group">
             <div className="bg-green-50 w-10 h-10 rounded-full flex items-center justify-center text-green-600 mb-3 group-hover:scale-110 transition-transform">
                <MapPin size={20}/>
             </div>
             <h3 className="font-bold text-slate-800">Explorar</h3>
             <p className="text-xs text-slate-500 mt-1">Ver mapa en vivo</p>
          </div>
          <div onClick={() => go('chat')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 cursor-pointer transition-all hover:-translate-y-1 group">
             <div className="bg-indigo-50 w-10 h-10 rounded-full flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                <MessageCircle size={20}/>
             </div>
             <h3 className="font-bold text-slate-800">Mensajes</h3>
             <p className="text-xs text-slate-500 mt-1">Ver conversaciones</p>
          </div>
       </div>
    </div>
  );
};

// --- APP ROOT ---

const App = () => (
  <AppProviders>
    <MainLayout />
  </AppProviders>
);

const MainLayout = () => {
  const { current } = useContext(RouterContext);
  return (
    <div className="antialiased text-slate-900 font-sans max-w-md mx-auto bg-white shadow-2xl min-h-screen relative overflow-hidden border-x border-slate-100">
      {current === 'splash' && <Splash />}
      {current === 'login' && <AuthScreen type="login" />}
      {current === 'signup' && <AuthScreen type="signup" />}
      {current === 'permission' && <PermissionPage />}
      {current === 'home' && <Home />}
      {current === 'map' && <MapPage />}
      {current === 'profile' && <ProfilePage />}
      {current === 'chat' && <ChatPage />}
      <BottomNav />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);