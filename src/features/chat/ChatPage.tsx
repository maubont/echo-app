import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageCircle, MoreVertical, Phone, Send, Smile } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { ChatConversation } from '../../lib/types';
import { chatService } from '../../services/chat';

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
                    const conversationId = await chatService.getOrCreateConversation([
                        session.user.id,
                        targetUserId
                    ]);
                    setActiveChatId(conversationId);

                    // Load initial messages
                    const messages = await chatService.fetchMessages(conversationId);
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
                        }))
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
        if (!session || activeChatId) return; // Don't play sound if already in chat (handled by other sub)

        const unsubscribe = chatService.subscribeToAllConversations(session.user.id, (newMessage) => {
            // Play notification sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep
            audio.play().catch(e => console.log('Audio play failed (user interaction needed):', e));

            // Update conversations list
            setConversations(prev => {
                const existingConv = prev.find(c => c.id === newMessage.conversation_id);

                if (existingConv) {
                    // Move to top and update
                    const updatedConv = {
                        ...existingConv,
                        lastMessage: newMessage.content,
                        lastTimestamp: new Date(newMessage.created_at).getTime(),
                        unreadCount: existingConv.unreadCount + 1
                    };
                    return [updatedConv, ...prev.filter(c => c.id !== newMessage.conversation_id)];
                } else {
                    // New conversation? We might need to fetch it, but for now just ignore or reload
                    // Ideally we fetch the new conversation details here
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
            // Send message to Supabase
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
            // Restore text if failed
            setInputText(messageText);
        }
    };

    const handleChatClick = async (chatId: string) => {
        setActiveChatId(chatId);
        // Fetch full message history when opening a chat from list
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
                            <Button variant="ghost" label="Ir al mapa" onClick={() => navigate('/map')} className="mt-4" />
                        </div>
                    ) : (
                        conversations.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => handleChatClick(chat.id)}
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
        <div className="fixed top-0 bottom-0 w-full max-w-md left-0 right-0 mx-auto z-50 bg-white flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex-none h-16 px-4 border-b border-slate-100 flex items-center gap-3 bg-white shadow-sm z-50">
                <button onClick={() => setActiveChatId(null)} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-slate-700" />
                </button>
                <div className="relative">
                    <img
                        src={activeChat?.participantAvatar || `https://ui-avatars.com/api/?name=${activeChat?.participantName}`}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white"></span>
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm">{activeChat?.participantName}</h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> En línea
                    </p>
                </div>
                <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
                    <Phone size={20} />
                </button>
                <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 pb-32">
                {/* Subtle Chat Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

                {activeChat?.messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <MessageCircle size={40} className="text-blue-500 opacity-80" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Comienza la charla</h3>
                        <p className="text-slate-500 text-sm max-w-[200px] leading-relaxed">
                            Envía un mensaje para romper el hielo con <span className="font-bold text-blue-600">{activeChat.participantName}</span>.
                        </p>
                    </div>
                )}
                {activeChat?.messages.map(msg => {
                    const isMe = msg.senderId === session?.user.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in-up`}>
                            <div className={`max-w-[75%] px-5 py-3 text-sm shadow-sm ${isMe
                                ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl rounded-tr-sm shadow-blue-500/20'
                                : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm'
                                }`}>
                                {msg.text}
                                <div className={`text-[10px] mt-1 text-right opacity-70 font-medium ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
            <div className="fixed bottom-24 left-0 right-0 p-4 bg-gradient-to-t from-white/0 via-white/50 to-transparent z-[60] pointer-events-none">
                <div className="max-w-md mx-auto glass rounded-full p-1.5 flex items-center gap-2 shadow-xl shadow-blue-900/5 border border-white/50 pointer-events-auto">
                    <div className="pl-4 flex-1">
                        <input
                            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 font-medium"
                            placeholder="Escribe un mensaje..."
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
