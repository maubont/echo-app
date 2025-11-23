export type UserRole = 'person' | 'business';
export type AppContextMode = 'networking' | 'social' | 'dating' | 'tourism' | 'business';

export interface UserStatus {
    emoji: string;
    text: string;
    expiresAt: number;
    createdAt: number;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatarUrl?: string;
    bio?: string;
    currentMode: AppContextMode;
    categories: string[];
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    status?: UserStatus;
}

export interface AuthSession {
    access_token: string;
    user: UserProfile;
    expires_at: number;
}

export interface PresenceState {
    isVisible: boolean;
    lat: number | null;
    lng: number | null;
    lastHeartbeat: number | null;
    expiresAt?: number;
}

export interface MapEntity {
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
    status?: UserStatus;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: number;
}

export interface ChatConversation {
    id: string;
    participantId: string;
    participantName: string;
    participantAvatar?: string;
    lastMessage: string;
    lastTimestamp: number;
    unreadCount: number;
    messages: ChatMessage[];
}
