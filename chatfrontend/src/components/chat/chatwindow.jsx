import React from 'react';
import { ChevronLeft, Phone, Video, Trash2, Send, MessageSquare } from 'lucide-react';

const ChatWindow = ({ 
  selectedFriend, 
  messages, 
  authUser, 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  onCallUser, 
  onDeleteMessage, 
  onDeleteConversation, 
  onBack, 
  scrollRef 
}) => {
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  if (!selectedFriend) {
    return (
      <div className="hidden md:flex flex-col flex-1 items-center justify-center p-8 bg-slate-50 text-center relative h-full">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse ring-8 ring-indigo-50/50">
            <MessageSquare className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ChatApp</h2>
        <p className="text-gray-500 max-w-xs">Select a conversation from the sidebar to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-slate-50 relative h-full">
      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex justify-between items-center z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
            <ChevronLeft />
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border border-indigo-50">
            {selectedFriend.profilePic ? <img src={selectedFriend.profilePic} className="w-full h-full object-cover" alt="friend"/> : getInitials(selectedFriend.name)}
          </div>
          <div>
              <h3 className="font-bold text-gray-800 text-sm md:text-base leading-tight">{selectedFriend.name}</h3>
              <span className="text-xs text-green-500 font-medium">Active Now</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onCallUser(false)} className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition"><Phone size={20} /></button>
          <button onClick={() => onCallUser(true)} className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition"><Video size={20} /></button>
          <button onClick={onDeleteConversation} className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition ml-2" title="Delete Conversation"><Trash2 size={20} /></button>
        </div>
      </div>

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:p-6" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundColor: '#f8fafc' }}>
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                 <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner">👋</div>
                 <h3 className="text-lg font-semibold text-gray-700">Say Hi to {selectedFriend.name}!</h3>
            </div>
        )}
        
        {messages.map((msg, index) => {
            const isMe = authUser && String(msg.senderId) === String(authUser.id);
            const isCallMsg = msg.text.startsWith("📞 Call ended");

            if (isCallMsg) {
                return (
                    <div key={index} className="flex justify-center my-4 animate-in fade-in duration-300">
                        <div className="bg-gray-100 text-gray-500 text-xs py-1 px-4 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
                           <span>{msg.text}</span>
                           <span className="text-[10px] text-gray-400 opacity-70">
                               {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                    </div>
                );
            }

            return (
              <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 group`}>
                <div className={`relative max-w-[75%] md:max-w-[60%] px-4 py-2 shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'}`}>
                  <p className="text-sm md:text-[15px] leading-relaxed break-words">{msg.text}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className={`text-[10px] ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <button 
                        onClick={() => onDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full"
                        title="Delete for everyone"
                      >
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
        })}
        <div ref={scrollRef}></div>
      </div>

      {/* INPUT AREA */}
      <div className="bg-white p-3 md:p-4 border-t border-gray-100">
        <form onSubmit={onSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto bg-gray-50 p-1.5 rounded-[24px] border border-gray-200 focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-md transition-all">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message..." className="flex-1 py-2.5 px-4 bg-transparent outline-none text-gray-800 text-sm placeholder:text-gray-400" />
          <button type="submit" disabled={!newMessage.trim()} className={`p-2.5 rounded-full transition-all shrink-0 ${newMessage.trim() ? 'bg-indigo-600 text-white shadow-md hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              <Send size={18} className={newMessage.trim() ? "ml-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;