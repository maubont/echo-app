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
                    <div className="antialiased text-slate-900 font-sans max-w-md mx-auto bg-white shadow-2xl min-h-screen relative overflow-hidden border-x border-slate-100">
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
                </PresenceProvider>
            </AuthProvider>
        </Router>
    );
};

export default App;
