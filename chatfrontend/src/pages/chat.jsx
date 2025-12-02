import React, { useState, useEffect, useContext } from 'react';
import { Search, MoreVertical, MessageSquare, Phone, Video, Paperclip, Send, Smile } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ChatNavbar from '../components/navbar'; // Assuming you have the navbar here

const ChatPage = () => {
  const { token, user: authUser } = useContext(AuthContext);
  
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const BASE_URL = 'http://localhost:5000/v1';

  // Helper to safely format token
  const getAuthHeader = () => {
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return {
      'Authorization': formattedToken,
      'Content-Type': 'application/json'
    };
  };

  // Helper to generate initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // 1. Fetch Friends List
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        if (!token || !authUser) return;

        const response = await fetch(`${BASE_URL}/friends/list`, {
          headers: getAuthHeader()
        });

        if (response.ok) {
          const data = await response.json();
          
          // Process the data: Identify which object is the "friend"
          const formattedFriends = data.map(item => {
            const isSender = item.sender.email === authUser.email;
            // If I am the sender, my friend is the receiver. 
            // If I am the receiver, my friend is the sender.
            const friendDetails = isSender ? item.receiver : item.sender;

            return {
              friendshipId: item.id,
              ...friendDetails, // id, name, email, profilePic, lastSeen
              // Mocking last message for UI purposes (since API doesn't provide it yet)
              lastMessage: "Hey! How are you?", 
              lastMessageTime: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
          });

          setFriends(formattedFriends);
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [token, authUser]);

  // Filter friends based on search
  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Navbar */}
      <ChatNavbar />

      {/* Main Chat Layout (WhatsApp Style) */}
      <div className="flex flex-1 pt-16 container max-w-7xl mx-auto h-full">
        
        {/* --- LEFT SIDEBAR (Friends List) --- */}
        <div className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 flex flex-col h-full">
          
          {/* Header */}
          

          {/* Search Bar */}
          <div className="p-3 bg-white border-b">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search or start new chat"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Friends List Container */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading contacts...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No friends found.</p>
                <p className="text-xs mt-1">Search for users in the navbar to add friends.</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div 
                  key={friend.friendshipId}
                  onClick={() => setSelectedFriend(friend)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-gray-50
                    ${selectedFriend?.id === friend.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Profile Pic */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                      {friend.profilePic ? (
                        <img src={friend.profilePic} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(friend.name)
                      )}
                    </div>
                    {/* Online Status Dot (Optional) */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{friend.name}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">{friend.lastMessageTime}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {friend.lastMessage}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RIGHT SIDE (Chat Area) --- */}
        <div className="hidden md:flex flex-col flex-1 bg-[#efe7dd] relative">
          
          {selectedFriend ? (
            <>
              {/* Chat Header */}
              <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold overflow-hidden">
                    {selectedFriend.profilePic ? (
                      <img src={selectedFriend.profilePic} alt={selectedFriend.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(selectedFriend.name)
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{selectedFriend.name}</h3>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>
                <div className="flex gap-4 text-gray-600">
                  <Video className="w-5 h-5 cursor-pointer hover:text-blue-600" />
                  <Phone className="w-5 h-5 cursor-pointer hover:text-blue-600" />
                  <Search className="w-5 h-5 cursor-pointer hover:text-blue-600" />
                  <MoreVertical className="w-5 h-5 cursor-pointer hover:text-blue-600" />
                </div>
              </div>

              {/* Messages Area (Background Pattern) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: 0.9 }}>
                {/* Dummy Messages for Visual */}
                <div className="flex justify-center">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-lg shadow-sm">
                    Today
                  </span>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-green-100 p-2 rounded-lg rounded-tr-none shadow-sm max-w-xs text-sm">
                    <p>Hello! Is this the correct email: {selectedFriend.email}?</p>
                    <span className="text-[10px] text-gray-500 block text-right mt-1">10:30 AM</span>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-xs text-sm">
                    <p>Yes, that is me! Good to see you here.</p>
                    <span className="text-[10px] text-gray-500 block text-right mt-1">10:32 AM</span>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="bg-gray-50 p-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Smile className="w-6 h-6 text-gray-500 cursor-pointer hover:text-gray-700" />
                  <Paperclip className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
                  <input 
                    type="text" 
                    placeholder="Type a message" 
                    className="flex-1 py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:border-blue-500"
                  />
                  <button className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors">
                    <Send className="w-5 h-5 pl-0.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Empty State (No chat selected)
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 border-l border-gray-200">
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                 <MessageSquare className="w-16 h-16 text-gray-400" />
              </div>
              <h2 className="text-2xl font-light text-gray-700 mb-2">Welcome to ChatApp</h2>
              <p className="text-gray-500">Select a friend from the sidebar to start chatting.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ChatPage;