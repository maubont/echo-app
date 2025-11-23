import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../lib/types';
import { supabase } from '../lib/supabase';

interface AuthSession {
    access_token: string;
    user: UserProfile;
    expires_at: number;
}

interface AuthContextType {
    session: AuthSession | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signUp: (email: string, name: string, role: UserRole, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

// Helper to convert Supabase User to UserProfile
const mapUserToProfile = (user: User): UserProfile => {
    return {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
        role: (user.user_metadata?.role as UserRole) || 'person',
        currentMode: user.user_metadata?.currentMode || 'networking',
        categories: user.user_metadata?.categories || [],
        bio: user.user_metadata?.bio || '¡Hola! Soy nuevo aquí.',
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.avatarUrl || `https://ui-avatars.com/api/?name=${user.email}`,
        status: user.user_metadata?.status || undefined,
    };
};

// Helper to convert Supabase Session to AuthSession
const mapSessionToAuthSession = (session: Session): AuthSession => {
    return {
        access_token: session.access_token,
        user: mapUserToProfile(session.user),
        expires_at: new Date(session.expires_at!).getTime(),
    };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
            if (supaSession) {
                setSession(mapSessionToAuthSession(supaSession));
            }
            setAuthLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSession) => {
            if (supaSession) {
                setSession(mapSessionToAuthSession(supaSession));
            } else {
                setSession(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const authMethods = {
        signIn: async (email: string, password: string) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            if (data.session) {
                setSession(mapSessionToAuthSession(data.session));
            }
        },

        signInWithGoogle: async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/map`,
                }
            });
            if (error) throw error;
        },

        signUp: async (email: string, name: string, role: UserRole, password: string) => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role,
                        currentMode: 'networking',
                        categories: [],
                        bio: '¡Hola! Soy nuevo aquí.',
                    }
                }
            });
            if (error) throw error;

            if (data.user) {
                // Create profile in public.profiles table
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: data.user.id,
                    name,
                    role,
                    email,
                    current_mode: 'networking',
                    bio: '¡Hola! Soy nuevo aquí.',
                    avatar_url: `https://ui-avatars.com/api/?name=${name}`
                });

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    // Continue anyway as auth user is created
                }

                if (data.session) {
                    setSession(mapSessionToAuthSession(data.session));
                }
            }
        },

        signOut: async () => {
            await supabase.auth.signOut();
            setSession(null);
        },

        updateProfile: async (updates: Partial<UserProfile>) => {
            const { data, error } = await supabase.auth.updateUser({
                data: updates
            });
            if (error) throw error;
            if (data.user && session) {
                setSession({
                    ...session,
                    user: mapUserToProfile(data.user)
                });
            }
        }
    };

    return (
        <AuthContext.Provider value={{ session, loading: authLoading, ...authMethods }}>
            {children}
        </AuthContext.Provider>
    );
};
