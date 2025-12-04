import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { 
  Bell, Search, LogOut, Users, UserPlus, Settings, Camera, X, Trash2, Lock, User as UserIcon 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ChatNavbar = () => {
  const { token, user: authUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Data State
  const [user, setUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  
  // UI State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  const [imageKey, setImageKey] = useState(Date.now()); // Used to force image refresh
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');

  // Settings Form State
  const [newName, setNewName] = useState('');
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
  const [isUploading, setIsUploading] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const fileInputRef = useRef(null);

  const BASE_URL = 'http://localhost:5000/v1';

  // --- Helpers ---
  const getAuthHeader = (isMultipart = false) => {
    if (!token) return {};
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    const headers = { 
      'Authorization': formattedToken 
    };
    
    // IMPORTANT: Do NOT set Content-Type for multipart (file upload), 
    // the browser sets it automatically with the boundary.
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // --- API Calls ---
  const fetchUserProfile = useCallback(async () => {
    try {
      if (!token) return;
      const email = user?.email || authUser?.email || 'prajwalkhatiwada28@gmail.com';
      const response = await fetch(`${BASE_URL}/users/${email}`, { headers: getAuthHeader() });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setNewName(userData.name);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [token, authUser, user?.email]);

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

  // --- Profile & Settings Actions ---

  // 1. Update Profile Picture
  const handleProfilePicUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      // API: POST http://localhost:5000/v1/users/profile-pic
      const response = await fetch(`${BASE_URL}/users/profile-pic`, {
        method: 'POST',
        headers: getAuthHeader(true), // true = do not set Content-Type
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Success: Update local user state immediately
        if (data.user) {
            setUser(data.user);
            // Force image refresh by updating key
            setImageKey(Date.now());
        } else {
            fetchUserProfile();
        }
        alert('Profile picture updated successfully!');
      } else {
        alert(data.message || 'Failed to update picture');
      }
    } catch (error) {
      console.error('Error updating pic:', error);
      alert('Network error uploading image');
    } finally {
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Delete Profile Picture
  const handleDeleteProfilePic = async () => {
    if(!window.confirm("Are you sure you want to remove your profile picture?")) return;
    
    try {
      const response = await fetch(`${BASE_URL}/users/profile-pic`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (response.ok) {
        alert('Profile picture removed.');
        // clear profile pic in local state
        setUser(prev => ({ ...prev, profilePic: null }));
      }
    } catch (error) {
      console.error('Error deleting pic:', error);
    }
  };

  // 3. Update Name
  const handleNameUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ name: newName })
      });
      if (response.ok) {
        alert('Name updated successfully!');
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  // 4. Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      // API: POST http://localhost:5000/v1/change-password
      const response = await fetch(`${BASE_URL}/change-password`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(passwordData)
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || 'Password changed successfully!');
        setPasswordData({ oldPassword: '', newPassword: '' });
      } else {
        alert(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error connecting to server.');
    }
  };

  // --- Search & Friends Actions ---
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

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
    navigate('/');
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
    <>
      <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full gap-4">
            
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <h1 className="text-blue-600 text-xl font-bold">ChatApp</h1>
            </div>

            {/* Search Bar */}
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

            {/* Right Side Icons */}
            <div className="flex items-center space-x-4">
              
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-gray-100 relative">
                  <Bell className="w-6 h-6 text-gray-500" />
                  {pendingRequests.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
                </button>
                {/* Notification Dropdown Code (Unchanged) */}
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

              {/* PROFILE MENU - CHANGED TO OVAL FIELD */}
              <div className="relative" ref={profileRef}>
                
                {/* 
                   UPDATED BUTTON: 
                   1. flex & items-center: Aligns image and text side-by-side
                   2. rounded-full: Creates the oval/pill shape ends
                   3. border & p-1 pr-3: Adds the outline and spacing 
                */}
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)} 
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-full p-1 pr-3 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {/* The Image (Circle inside the Oval) */}
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                    {user?.profilePic ? (
                      <img key={imageKey} src={`${user.profilePic}?t=${imageKey}`} alt="P" className="w-full h-full object-cover"/>
                    ) : (
                      getInitials(user?.name || authUser?.name)
                    )}
                  </div>

                  {/* The Name (Visible text makes it an oval) */}
                  <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">
                    {user?.name || authUser?.name || 'User'}
                  </span>
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
                    
                    <button 
                      onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>

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

      {/* --- Settings Modal (Unchanged) --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Profile Settings
              </h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <div className="mb-8 flex flex-col items-center">
                <div className="relative w-24 h-24 mb-4">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold overflow-hidden border-2 border-gray-100 shadow-sm">
                    {user?.profilePic ? (
                      <img src={`${user.profilePic}?t=${imageKey}`} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user?.name)
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-md transition-colors"
                    disabled={isUploading}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleProfilePicUpdate}
                  />
                </div>
                {user?.profilePic && (
                  <button 
                    onClick={handleDeleteProfilePic}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Picture
                  </button>
                )}
                {isUploading && <p className="text-xs text-blue-600 mt-2">Uploading...</p>}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Display Name
                </label>
                <form onSubmit={handleNameUpdate} className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="Your Name"
                  />
                  <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800">
                    Save
                  </button>
                </form>
              </div>

              <div className="border-t my-6"></div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Security
                </label>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Old Password"
                    value={passwordData.oldPassword}
                    onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                  <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                    Update Password
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
 
};

export default ChatNavbar;