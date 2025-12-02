import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Bell, Search, LogOut, Users, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { AuthContext } from '../context/AuthContext';

const ChatNavbar = () => {
  const { token, user: authUser, logout } = useContext(AuthContext);
  const navigate = useNavigate(); // 2. Initialize the hook
  
  // Data State
  const [user, setUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  
  // UI State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const BASE_URL = 'http://localhost:5000/v1';

  // --- Helpers ---
  const getAuthHeader = () => {
    if (!token) return {};
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return {
      'Authorization': formattedToken,
      'Content-Type': 'application/json'
    };
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // --- API Calls ---
  const fetchUserProfile = useCallback(async () => {
    try {
      if (!token) return;
      const email = authUser?.email || 'prajwalkhatiwada28@gmail.com';
      const response = await fetch(`${BASE_URL}/users/${email}`, { headers: getAuthHeader() });
      if (response.ok) setUser(await response.json());
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [token, authUser]);

  const fetchRequests = useCallback(async () => {
    try {
      if (!token) return;
      const pendingRes = await fetch(`${BASE_URL}/friends/pending`, { headers: getAuthHeader() });
      if (pendingRes.ok) setPendingRequests(await pendingRes.json());

      const sentRes = await fetch(`${BASE_URL}/friends/sent`, { headers: getAuthHeader() });
      if (sentRes.ok) setSentRequests(await sentRes.json());
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, [token]);

  const fetchFriendsList = useCallback(async () => {
    try {
      if (!token) return;
      const response = await fetch(`${BASE_URL}/friends/list`, { headers: getAuthHeader() });
      if (response.ok) {
        const data = await response.json();
        setFriendsList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching friends list:', error);
    }
  }, [token]);

  // --- Actions ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchResults([]);
    setSearchMessage('');

    try {
      const response = await fetch(`${BASE_URL}/users/search?query=${searchQuery}`, { 
        headers: getAuthHeader() 
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(Array.isArray(data) ? data : [data]);
      } else {
        if (searchQuery.includes('@')) {
           setSearchResults([{ email: searchQuery, name: 'User', isFallback: true }]);
        } else {
          setSearchMessage('No users found.');
        }
      }
    } catch (error) {
      if (searchQuery.includes('@')) {
        setSearchResults([{ email: searchQuery, name: 'Unknown User', isFallback: true }]);
      }
    }
  };

  const sendFriendRequest = async (receiverEmail) => {
    try {
      const response = await fetch(`${BASE_URL}/friends/send-request`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ receiverEmail })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Friend request sent!');
        setSearchQuery('');
        setSearchResults([]);
        fetchRequests();
      } else {
        alert(data.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
    }
  };

  const respondToRequest = async (id, action) => {
    const endpoint = action === 'accept' ? '/friends/accept' : '/friends/reject';
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ requestId: id })
      });
      if (response.ok) {
        fetchRequests();
        if (action === 'accept') fetchFriendsList();
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
    }
  };

  // --- Handling Logout ---
  const handleLogout = () => {
    logout(); // Clear context
    setShowProfileMenu(false); // Close menu
    navigate('/'); // 3. Navigate to default page
  };

  // --- Effects ---
  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchRequests();
      fetchFriendsList();
    }
  }, [token, fetchUserProfile, fetchRequests, fetchFriendsList]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
      if (searchRef.current && !searchRef.current.contains(event.target) && !event.target.closest('.search-container')) setSearchResults([]);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full gap-4">
          
          <div className="flex items-center flex-shrink-0">
            <h1 className="text-blue-600 text-xl font-bold">ChatApp</h1>
          </div>

          <div className="flex-1 max-w-2xl relative search-container" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            {(searchResults.length > 0 || searchMessage) && (
              <div className="absolute mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden py-1">
                {searchMessage && <p className="p-4 text-sm text-gray-500 text-center">{searchMessage}</p>}
                {searchResults.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {getInitials(result.name || result.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{result.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{result.email}</p>
                      </div>
                    </div>
                    <button onClick={() => sendFriendRequest(result.email)} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-gray-100 relative">
                <Bell className="w-6 h-6 text-gray-500" />
                {pendingRequests.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden">
                   <div className="flex border-b">
                    <button onClick={() => setActiveTab('received')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'received' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Received</button>
                    <button onClick={() => setActiveTab('sent')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'sent' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Sent</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {activeTab === 'received' ? (
                       pendingRequests.map(req => (
                         <div key={req.id} className="p-3 border-b hover:bg-gray-50 flex items-center gap-3">
                           <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs">{getInitials(req.sender?.name)}</div>
                           <div className="flex-1 min-w-0">
                             <p className="font-medium text-sm truncate">{req.sender?.name}</p>
                             <div className="flex gap-2 mt-1">
                               <button onClick={() => respondToRequest(req.id, 'accept')} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Accept</button>
                               <button onClick={() => respondToRequest(req.id, 'reject')} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Reject</button>
                             </div>
                           </div>
                         </div>
                       ))
                    ) : (
                      sentRequests.map(req => (
                        <div key={req.id} className="p-3 border-b hover:bg-gray-50 flex items-center gap-3">
                           <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs">{getInitials(req.receiver?.name || req.receiverName)}</div>
                           <div>
                             <p className="font-medium text-sm">{req.receiver?.name || req.receiverName}</p>
                             <p className="text-xs text-gray-500">Pending</p>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-md">
                {user?.profilePic ? <img src={user.profilePic} alt="P" className="w-full h-full rounded-full object-cover"/> : getInitials(user?.name || authUser?.name)}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden">
                  <div className="p-4 border-b bg-gray-50">
                    <p className="font-bold text-gray-900">{user?.name || authUser?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email || authUser?.email}</p>
                  </div>

                  <div className="py-2">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Friends ({friendsList.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {friendsList.length === 0 ? (
                        <p className="px-4 py-2 text-sm text-gray-500 italic">No friends yet</p>
                      ) : (
                        friendsList.map((item) => {
                          const myEmail = user?.email || authUser?.email;
                          const friend = (item.sender?.email === myEmail) ? item.receiver : item.sender;
                          if(!friend) return null;

                          return (
                            <div key={item.id} className="px-4 py-2 hover:bg-gray-50 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {getInitials(friend.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{friend.name}</p>
                                <p className="text-xs text-gray-500 truncate">{friend.email}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="border-t"></div>
                  {/* 4. Use handleLogout here */}
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ChatNavbar;