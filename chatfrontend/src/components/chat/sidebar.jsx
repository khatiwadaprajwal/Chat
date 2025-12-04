import React from 'react';
import { Search } from 'lucide-react';

const Sidebar = ({ 
  friends, 
  selectedFriend, 
  onSelectFriend, 
  searchTerm, 
  setSearchTerm 
}) => {
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  
  const filteredFriends = friends.filter(friend => friend.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`w-full md:w-[380px] bg-white border-r border-gray-100 flex-col h-full ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-4 bg-white border-b border-gray-100 sticky top-0 z-10">
         <div className="relative group">
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-700 rounded-full outline-none border border-transparent focus:border-indigo-300 focus:bg-white transition" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredFriends.map((friend) => (
           <div 
             key={friend.friendshipId} 
             onClick={() => onSelectFriend(friend)} 
             className={`flex items-center gap-4 p-4 mx-2 my-1 rounded-2xl cursor-pointer transition-all border-l-4 ${
               String(selectedFriend?.id) === String(friend.id) 
               ? 'bg-indigo-50 border-indigo-500' 
               : 'hover:bg-gray-50 border-transparent'
             }`}
           >
              <div className="relative w-14 h-14 shrink-0">
                 <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-sm">
                    {friend.profilePic ? (
                      <img src={friend.profilePic} className="w-full h-full object-cover" alt="profile"/>
                    ) : (
                      getInitials(friend.name)
                    )}
                 </div>
                 <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-semibold truncate ${friend.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>{friend.name}</h3>
                    {friend.lastMessageTime && <span className={`text-[11px] ${friend.unreadCount > 0 ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>{new Date(friend.lastMessageTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                  </div>
                  
                  <div className="flex justify-between items-center">
                      <p className={`text-sm truncate max-w-[70%] ${friend.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                        {friend.lastMessage || <span className="text-indigo-500 italic">Tap to start chatting</span>}
                      </p>
                      
                      {friend.unreadCount > 0 && (
                        <div className="min-w-[20px] h-5 bg-red-600 rounded-full flex items-center justify-center shadow-sm px-1.5 animate-in zoom-in">
                          <span className="text-white text-[10px] font-bold leading-none">
                            {friend.unreadCount > 99 ? '99+' : friend.unreadCount}
                          </span>
                        </div>
                      )}
                  </div>
              </div>
           </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;