import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageCircle, MoreVertical, Phone, Send, Timer, Flame, Shield } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { ChatConversation } from '../../lib/types';
import { chatService } from '../../services/chat';

/** Format time remaining for ephemeral chats */
const formatTimeRemaining = (expiresAt: number): string => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expirado';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

export const ChatPage = () => {
    const { session } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Get params from state OR URL query params
    const stateParams = location.state as { userId?: string, userName?: string, userAvatar?: string } | null;
    const targetUserId = stateParams?.userId || searchParams.get('userId');
    const targetUserName = stateParams?.userName || searchParams.get('userName');
    const targetUserAvatar = stateParams?.userAvatar || searchParams.get('userAvatar');

    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Tick for ephemeral countdown (update every minute)
    const [, setTick] = useState(0);
    useEffect(() => {
        const hasEphemeral = conversations.some(c => c.expiresAt);
        if (!hasEphemeral) return;
        const interval = setInterval(() => setTick(t => t + 1), 60_000);
        return () => clearInterval(interval);
    }, [conversations]);

    // Auto scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversations, activeChatId]);

    // Load conversations from Supabase
    useEffect(() => {
        const loadConversations = async () => {
            if (!session) return;

            console.log('💬 ChatPage loading. Target:', targetUserId);

            // If navigating from map with target user, create/open conversation
            if (targetUserId) {
                try {
                    const currentMode = session.user.currentMode || 'networking';
                    const conversationId = await chatService.getOrCreateConversation(
                        [session.user.id, targetUserId],
                        currentMode
                    );
                    setActiveChatId(conversationId);

                    // Load initial messages
                    const messages = await chatService.fetchMessages(conversationId);

                    // Calculate expiry for adult mode
                    const expiresAt = currentMode === 'adult'
                        ? Date.now() + 24 * 60 * 60 * 1000
                        : undefined;

                    const tempConv: ChatConversation = {
                        id: conversationId,
                        participantId: targetUserId,
                        participantName: targetUserName || 'Usuario',
                        participantAvatar: targetUserAvatar,
                        lastMessage: messages[messages.length - 1]?.content || '',
                        lastTimestamp: messages[messages.length - 1] ? new Date(messages[messages.length - 1].createdAt).getTime() : Date.now(),
                        unreadCount: 0,
                        messages: messages.map(m => ({
                            id: m.id,
                            senderId: m.senderId,
                            text: m.content,
                            timestamp: new Date(m.createdAt).getTime()
                        })),
                        mode: currentMode,
                        expiresAt
                    };
                    setConversations([tempConv]);
                } catch (error) {
                    console.error('Error creating conversation:', error);
                }
            } else {
                // Load list of existing conversations
                try {
                    const list = await chatService.getChatList();
                    setConversations(list);
                } catch (error) {
                    console.error('Error loading chat list:', error);
                }
            }
        };

        loadConversations();
    }, [targetUserId, targetUserName, targetUserAvatar, session]);

    // Subscribe to real-time updates for the list
    useEffect(() => {
        if (!session || activeChatId) return;

        const unsubscribe = chatService.subscribeToAllConversations(session.user.id, (newMessage) => {
            // Play notification sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed (user interaction needed):', e));

            // Update conversations list
            setConversations(prev => {
                const existingConv = prev.find(c => c.id === newMessage.conversation_id);

                if (existingConv) {
                    const updatedConv = {
                        ...existingConv,
                        lastMessage: newMessage.content,
                        lastTimestamp: new Date(newMessage.created_at).getTime(),
                        unreadCount: existingConv.unreadCount + 1
                    };
                    return [updatedConv, ...prev.filter(c => c.id !== newMessage.conversation_id)];
                } else {
                    return prev;
                }
            });
        });

        return () => {
            unsubscribe();
        };
    }, [session, activeChatId]);

    const [error, setError] = useState<string | null>(null);

    const handleSend = async () => {
        if (!inputText.trim() || !activeChatId || !session) return;

        const messageText = inputText;
        setInputText('');
        setError(null);

        try {
            await chatService.sendMessage(activeChatId, messageText);

            // Optimistically update UI
            setConversations(prev => prev.map(chat => {
                if (chat.id === activeChatId) {
                    return {
                        ...chat,
                        messages: [...chat.messages, {
                            id: `temp-${Date.now()}`,
                            senderId: session.user.id,
                            text: messageText,
                            timestamp: Date.now()
                        }],
                        lastMessage: messageText,
                        lastTimestamp: Date.now()
                    };
                }
                return chat;
            }));
        } catch (err: any) {
            console.error('Error sending message:', err);
            setError(`Error al enviar: ${err.message || 'Error desconocido'}`);
            setInputText(messageText);
        }
    };

    const handleChatClick = async (chatId: string) => {
        setActiveChatId(chatId);
        try {
            const messages = await chatService.fetchMessages(chatId);
            setConversations(prev => prev.map(c => {
                if (c.id === chatId) {
                    return {
                        ...c,
                        messages: messages.map(m => ({
                            id: m.id,
                            senderId: m.senderId,
                            text: m.content,
                            timestamp: new Date(m.createdAt).getTime()
                        }))
                    };
                }
                return c;
            }));
        } catch (error) {
            console.error('Error fetching messages for chat:', error);
        }
    };

    const activeChat = conversations.find(c => c.id === activeChatId);
    const isEphemeral = activeChat?.mode === 'adult' && !!activeChat?.expiresAt;

    // View: Chat List
    if (!activeChatId) {
        return (
            <div className="min-h-screen bg-theme-main pb-[90px] flex flex-col transition-colors duration-300">
                <div className="p-6 pb-2">
                    <h1 className="text-2xl font-bold text-theme-primary">Mensajes</h1>
                    {session?.user.currentMode === 'adult' && (
                        <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                            <Shield size={12} />
                            Modo Adulto — Los chats expiran en 24h
                        </p>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 space-y-2">
                    {conversations.length === 0 ? (
                        <div className="text-center mt-20 text-theme-tertiary">
                            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No tienes mensajes aún.</p>
                            <Button variant="ghost" label="Ir al mapa" onClick={() => navigate('/map')} className="mt-4" />
                        </div>
                    ) : (
                        conversations.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => handleChatClick(chat.id)}
                                className={`flex items-center gap-4 p-4 rounded-2xl hover:bg-theme-secondary/30 transition-all cursor-pointer border border-transparent hover:border-theme-secondary/10 active:scale-[0.99] ${
                                    chat.expiresAt && chat.expiresAt < Date.now() ? 'opacity-40 pointer-events-none' : ''
                                }`}
                            >
                                <div className="relative">
                                    <img
                                        src={chat.participantAvatar || `https://ui-avatars.com/api/?name=${chat.participantName}&background=random`}
                                        className={`w-12 h-12 rounded-full object-cover border-2 shadow-sm ${
                                            chat.mode === 'adult' ? 'border-red-400' : ''
                                        }`}
                                        style={chat.mode !== 'adult' ? { borderColor: 'rgb(var(--bg-card))' } : {}}
                                    />
                                    {chat.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full" style={{ boxShadow: '0 0 0 2px rgb(var(--bg-main))' }}>
                                            {chat.unreadCount}
                                        </span>
                                    )}
                                    {chat.mode === 'adult' && (
                                        <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full" style={{ boxShadow: '0 0 0 2px rgb(var(--bg-main))' }}>
                                            <Flame size={8} />
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-bold text-theme-primary truncate">{chat.participantName}</h3>
                                        <div className="flex items-center gap-1.5">
                                            {chat.expiresAt && (
                                                <span className="text-[9px] text-red-400 flex items-center gap-0.5 font-medium">
                                                    <Timer size={9} />
                                                    {formatTimeRemaining(chat.expiresAt)}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-theme-tertiary">
                                                {new Date(chat.lastTimestamp).getHours()}:{new Date(chat.lastTimestamp).getMinutes().toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    </div>
                                    <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-theme-primary font-semibold' : 'text-theme-secondary'}`}>
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
        <div className="fixed top-0 bottom-0 w-full max-w-md left-0 right-0 mx-auto z-50 bg-theme-main flex flex-col shadow-2xl overflow-hidden transition-colors duration-300">
            {/* Header */}
            <div className="flex-none h-16 px-4 border-b flex items-center gap-3 bg-theme-card/90 backdrop-blur-xl shadow-theme-sm z-50 transition-all duration-300" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                <button onClick={() => setActiveChatId(null)} className="p-2 -ml-2 rounded-full transition-colors hover:bg-theme-secondary/30">
                    <ArrowLeft size={20} className="text-theme-primary" />
                </button>
                <div className="relative">
                    <img
                        src={activeChat?.participantAvatar || `https://ui-avatars.com/api/?name=${activeChat?.participantName}`}
                        className={`w-10 h-10 rounded-full object-cover border-2 shadow-theme-sm ${
                            isEphemeral ? 'border-red-400' : ''
                        }`}
                        style={!isEphemeral ? { borderColor: 'rgb(var(--primary-500))' } : {}}
                    />
                    {isEphemeral ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full" style={{ boxShadow: '0 0 0 2px rgb(var(--bg-card))' }}></span>
                    ) : (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full" style={{ boxShadow: '0 0 0 2px rgb(var(--bg-card))' }}></span>
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-theme-primary text-sm">{activeChat?.participantName}</h3>
                    {isEphemeral ? (
                        <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                            <Timer size={10} />
                            Expira en {formatTimeRemaining(activeChat!.expiresAt!)}
                        </p>
                    ) : (
                        <p className="text-xs text-theme-secondary font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span> En línea
                        </p>
                    )}
                </div>
                <button className="p-2 text-theme-secondary hover:bg-theme-secondary/20 rounded-full transition-colors">
                    <Phone size={20} />
                </button>
                <button className="p-2 text-theme-secondary hover:bg-theme-secondary/20 rounded-full transition-colors">
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Ephemeral Banner */}
            {isEphemeral && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-center gap-2">
                    <Shield size={12} className="text-red-400" />
                    <span className="text-[11px] text-red-400 font-medium">
                        Chat privado — se autodestruye en {formatTimeRemaining(activeChat!.expiresAt!)}
                    </span>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 transition-colors duration-300" style={{ background: 'rgb(var(--bg-secondary) / 0.3)' }}>
                {/* Subtle Chat Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

                {activeChat?.messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in duration-500">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ${
                            isEphemeral ? 'bg-red-50' : 'bg-blue-50'
                        }`}>
                            {isEphemeral ? (
                                <Flame size={40} className="text-red-400 opacity-80" />
                            ) : (
                                <MessageCircle size={40} className="text-blue-500 opacity-80" />
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {isEphemeral ? 'Chat Privado' : 'Comienza la charla'}
                        </h3>
                        <p className="text-slate-500 text-sm max-w-[220px] leading-relaxed">
                            {isEphemeral
                                ? <>Este chat se autodestruirá en <span className="font-bold text-red-500">24 horas</span>. Sé discreto.</>
                                : <>Envía un mensaje para romper el hielo con <span className="font-bold text-blue-600">{activeChat?.participantName}</span>.</>
                            }
                        </p>
                    </div>
                )}
                {activeChat?.messages.map(msg => {
                    const isMe = msg.senderId === session?.user.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in-up`}>
                            <div className={`max-w-[75%] px-5 py-3 text-sm shadow-theme-md transition-all ${isMe
                                ? isEphemeral
                                    ? 'bg-red-500 text-white rounded-2xl rounded-tr-sm'
                                    : 'bg-primary text-white rounded-2xl rounded-tr-sm'
                                : 'bg-theme-card/80 backdrop-blur-lg text-theme-primary border rounded-2xl rounded-tl-sm'
                                }`}
                                style={!isMe ? { borderColor: 'rgb(var(--glass-border))' } : {}}>
                                {msg.text}
                                <div className={`text-[10px] mt-1 text-right opacity-70 font-medium ${isMe ? '' : 'text-theme-tertiary'}`} style={isMe ? { color: 'rgba(255, 255, 255, 0.7)' } : {}}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-theme-card/80 backdrop-blur-lg border px-4 py-3 rounded-2xl rounded-tl-sm shadow-theme-sm" style={{ borderColor: 'rgb(var(--glass-border))' }}>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgb(var(--text-tertiary))', animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgb(var(--text-tertiary))', animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgb(var(--text-tertiary))', animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
                <div className="fixed bottom-36 left-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm text-center shadow-sm z-50">
                    {error}
                </div>
            )}

            {/* Input */}
            <div className="fixed bottom-24 left-0 right-0 p-4 z-60 pointer-events-none" style={{ background: 'linear-gradient(to top, transparent, rgb(var(--bg-main) / 0.5), transparent)' }}>
                <div className={`max-w-md mx-auto glass-effect rounded-full p-1.5 flex items-center gap-2 shadow-theme-xl pointer-events-auto transition-all duration-300 ${
                    isEphemeral ? 'ring-1 ring-red-400/30' : ''
                }`}>
                    <div className="pl-4 flex-1">
                        <input
                            className="w-full bg-transparent text-sm outline-none font-medium text-theme-primary placeholder-theme-tertiary"
                            placeholder={isEphemeral ? "Mensaje privado..." : "Escribe un mensaje..."}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className={`text-white p-3 rounded-full hover:shadow-theme-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0 ${
                            isEphemeral ? 'bg-red-500' : 'bg-primary'
                        }`}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
