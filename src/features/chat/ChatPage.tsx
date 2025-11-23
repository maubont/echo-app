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

    const handleSend = async () => {
        if (!inputText.trim() || !activeChatId || !session) return;

        const messageText = inputText;
        setInputText('');

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
        } catch (error) {
            console.error('Error sending message:', error);
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
        <div className="h-screen bg-white flex flex-col z-50 relative">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white/90 backdrop-blur shadow-sm">
                <button onClick={() => setActiveChatId(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft size={20} className="text-slate-600" />
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 pb-32">
                {activeChat?.messages.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        Envía un mensaje para comenzar a charlar.
                    </div>
                )}
                {activeChat?.messages.map(msg => {
                    const isMe = msg.senderId === session?.user.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe
                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
                                }`}>
                                {msg.text}
                                <div className={`text-[10px] mt-1 text-right opacity-70 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
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

            {/* Input */}
            <div className="fixed bottom-24 left-0 right-0 p-3 bg-white border-t border-slate-100 z-50 max-w-md mx-auto">
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
                        className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
