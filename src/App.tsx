import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PresenceProvider } from './context/PresenceContext';
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
            <AuthProvider>
                <PresenceProvider>
                    <div className="antialiased text-slate-900 font-sans max-w-md mx-auto bg-slate-50 shadow-2xl min-h-screen relative overflow-hidden border-x border-slate-200/50">
                        {/* Mesh Gradient Background */}
                        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/30 blur-[100px] animate-pulse"></div>
                            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/30 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                            <div className="absolute top-[40%] left-[40%] w-[60%] h-[60%] rounded-full bg-pink-300/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
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
        </Router>
    );
};

export default App;
