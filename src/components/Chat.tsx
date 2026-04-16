import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../lib/firebase';
import { chatService, userService } from '../lib/firestore';
import { UserProfile } from '../types';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Search, 
  MoreVertical, 
  User, 
  X,
  FileText,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { format } from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { cn } from '../lib/utils';
import { safelyFormatDate } from '../lib/dateUtils';

export default function Chat() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Initialize Socket.io
    socketRef.current = io(window.location.origin, {
      transports: ['polling', 'websocket'], // Ensure compatibility with proxy
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socketRef.current.on('connect_error', (err) => {
      console.warn('Chat connection info (non-critical):', err.message);
    });

    socketRef.current.emit('join', user.uid);

    socketRef.current.on('typing', ({ conversationId, userId }) => {
      if (activeConv?.id === conversationId) {
        setTyping(userId);
        setTimeout(() => setTyping(null), 3000);
      }
    });

    // Fetch conversations
    const unsubConvs = chatService.getConversations(user.uid, (data) => {
      setConversations(data);
    });

    // Fetch all users to start new chats
    const unsubUsers = userService.getUsers((data) => {
      setUsers(data.filter(u => u.uid !== user.uid));
    });

    return () => {
      unsubConvs();
      unsubUsers();
      socketRef.current?.disconnect();
    };
  }, [user?.uid, activeConv?.id]);

  useEffect(() => {
    if (activeConv) {
      const unsubMsgs = chatService.getMessages(activeConv.id, (data) => {
        setMessages(data);
      });
      return () => unsubMsgs();
    } else {
      setMessages([]);
    }
  }, [activeConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConv || !user) return;

    const content = newMessage;
    setNewMessage('');
    setShowEmojiPicker(false);

    await chatService.sendMessage(activeConv.id, {
      senderId: user.uid,
      content,
      type: 'text'
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        await chatService.sendMessage(activeConv.id, {
          senderId: user.uid,
          content: '',
          type: file.type.startsWith('image/') ? 'image' : 'file',
          fileUrl: data.url,
          fileName: data.name
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const startConversation = async (otherUser: UserProfile) => {
    if (!user) return;
    try {
      const convId = await chatService.getOrCreateConversation([user.uid, otherUser.uid]);
      setActiveConv({ id: convId, otherUser });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleTyping = () => {
    if (!activeConv || !user) return;
    socketRef.current?.emit('typing', {
      conversationId: activeConv.id,
      userId: user.uid,
      receiverId: activeConv.otherUser.uid
    });
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[var(--card-bg)] rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl mt-4">
      {/* Sidebar */}
      <div className="w-80 border-r border-[var(--border)] flex flex-col bg-[var(--bg)]/50">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--card-bg)]">
          <h2 className="text-xl font-bold text-[var(--text-main)]">Messages</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length > 0 ? (
            conversations.map(conv => {
              const otherUserId = conv.participants.find((id: string) => id !== user?.uid);
              const otherUser = users.find(u => u.uid === otherUserId);
              if (!otherUser) return null;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv({ ...conv, otherUser })}
                  className={cn(
                    "w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left",
                    activeConv?.id === conv.id ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-[var(--accent)]/10"
                  )}
                >
                  <div className="relative">
                    <img 
                      src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}`} 
                      className="w-12 h-12 rounded-full border-2 border-white/20"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold truncate">{otherUser.displayName}</h4>
                        <span className="text-[10px] opacity-70">
                          {safelyFormatDate(conv.updatedAt, 'HH:mm', '')}
                        </span>
                      </div>
                    <p className={cn("text-xs truncate opacity-70 mt-0.5", activeConv?.id === conv.id ? "text-white" : "text-[var(--text-muted)]")}>
                      {conv.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">
              No conversations yet. Start one below!
            </div>
          )}

          <div className="pt-4 px-2 pb-2">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-2 mb-2">Team Members</h5>
            {users.map(u => (
              <button
                key={u.uid}
                onClick={() => startConversation(u)}
                className="w-full p-2 rounded-lg flex items-center gap-2 hover:bg-[var(--accent)]/10 transition-colors text-left"
              >
                <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                <span className="text-sm font-medium text-[var(--text-main)]">{u.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--card-bg)]">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card-bg)] z-10">
              <div className="flex items-center gap-3">
                <img 
                  src={activeConv.otherUser.photoURL || `https://ui-avatars.com/api/?name=${activeConv.otherUser.displayName}`} 
                  className="w-10 h-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-[var(--text-main)] leading-tight">{activeConv.otherUser.displayName}</h3>
                  <p className="text-[10px] text-green-500 font-medium">
                    {typing === activeConv.otherUser.uid ? 'typing...' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-xl transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-xl transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-dots">
              {messages.map((msg, i) => {
                const isMine = msg.senderId === user?.uid;
                const nextMsg = messages[i + 1];
                const showAvatar = !isMine && (!nextMsg || nextMsg.senderId !== msg.senderId);

                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", isMine ? "flex-row-reverse" : "flex-row")}>
                    {!isMine ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        {showAvatar ? (
                          <img src={activeConv.otherUser.photoURL || `https://ui-avatars.com/api/?name=${activeConv.otherUser.displayName}`} className="w-full h-full" referrerPolicy="no-referrer" />
                        ) : <div className="w-8" />}
                      </div>
                    ) : null}
                    
                    <div className={cn(
                      "max-w-[70%] group relative",
                      isMine ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm transition-all",
                        isMine 
                          ? "bg-[var(--accent)] text-white rounded-br-none" 
                          : "bg-[var(--bg)] text-[var(--text-main)] rounded-bl-none border border-[var(--border)]"
                      )}>
                        {msg.type === 'text' && <p>{msg.content}</p>}
                        {msg.type === 'image' && (
                          <div className="space-y-1">
                            <img src={msg.fileUrl} alt="attachment" className="rounded-lg max-w-full cursor-pointer hover:opacity-90" onClick={() => window.open(msg.fileUrl)} />
                            {msg.content && <p>{msg.content}</p>}
                          </div>
                        )}
                        {msg.type === 'file' && (
                          <a 
                            href={msg.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors"
                          >
                            <FileText className="w-5 h-5" />
                            <span className="text-xs truncate max-w-[150px]">{msg.fileName}</span>
                          </a>
                        )}
                          <div className={cn(
                            "flex items-center gap-1.5 mt-1 opacity-70 text-[9px]",
                            isMine ? "justify-end" : "justify-start"
                          )}>
                            {safelyFormatDate(msg.createdAt, 'HH:mm', '')}
                            {isMine && <CheckCheck className="w-3 h-3" />}
                          </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--card-bg)] relative">
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: -10, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-4 z-[100] shadow-2xl"
                  >
                    <EmojiPicker theme={Theme.AUTO} onEmojiClick={onEmojiClick} />
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-xl transition-colors"
                  >
                    <Smile className="w-6 h-6" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-xl transition-colors"
                  >
                    <Paperclip className="w-6 h-6" />
                  </button>
                </div>
                
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 py-3 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
                />

                <button 
                  type="submit"
                  disabled={!newMessage.trim() && !isUploading}
                  className="w-12 h-12 flex items-center justify-center bg-[var(--accent)] text-white rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              
              {isUploading && (
                <div className="absolute top-0 left-0 w-full h-1 overflow-hidden">
                  <div className="h-full bg-[var(--accent)] animate-[progress_1s_infinite]" />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-24 h-24 bg-[var(--accent)]/10 rounded-full flex items-center justify-center">
              <Mail className="w-12 h-12 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-main)]">Your Messages</h3>
              <p className="text-[var(--text-muted)] max-w-sm mt-2">
                Send private messages and attachments to your team members. All conversations are secure and synced across your devices.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .bg-dots {
          background-image: radial-gradient(var(--border) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
