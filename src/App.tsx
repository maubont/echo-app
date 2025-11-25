import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PresenceProvider } from './context/PresenceContext';
import { ThemeProvider } from './context/ThemeContext';
import { BottomNav } from './components/layout/BottomNav';
import { Splash } from './features/splash/Splash';
import { AuthScreen } from './features/auth/AuthScreen';
import { PermissionPage } from './features/auth/PermissionPage';
import { HomePage } from './features/home/HomePage';
import { MapPage } from './features/map/MapPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ChatPage } from './features/chat/ChatPage';

const App = () => {
    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <PresenceProvider>
                        <div className="antialiased font-sans max-w-md mx-auto shadow-2xl min-h-screen relative overflow-hidden border-x border-slate-200/50 bg-theme-main text-theme-primary transition-colors duration-300">
                            {/* Theme-aware Mesh Gradient Background */}
                            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse" style={{ background: 'rgb(var(--mesh-1))' }}></div>
                                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse" style={{ background: 'rgb(var(--mesh-2))', animationDelay: '1s' }}></div>
                                <div className="absolute top-[40%] left-[40%] w-[60%] h-[60%] rounded-full blur-[120px] animate-pulse" style={{ background: 'rgb(var(--mesh-3))', animationDelay: '2s' }}></div>
                            </div>
                            <div className="relative z-10 min-h-screen flex flex-col">
                                <Routes>
                                    <Route path="/" element={<Splash />} />
                                    <Route path="/login" element={<AuthScreen type="login" />} />
                                    <Route path="/signup" element={<AuthScreen type="signup" />} />
                                    <Route path="/permission" element={<PermissionPage />} />
                                    <Route path="/home" element={<HomePage />} />
                                    <Route path="/map" element={<MapPage />} />
                                    <Route path="/profile" element={<ProfilePage />} />
                                    <Route path="/chat" element={<ChatPage />} />
                                </Routes>
                                <BottomNav />
                            </div>
                        </div>
                    </PresenceProvider>
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
};

export default App;
