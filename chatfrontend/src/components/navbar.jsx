import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { 
  Bell, Search, LogOut, Users, UserPlus, Settings, Camera, X, Trash2, Lock, User as UserIcon, ChevronRight, CheckCircle, Loader2
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
  const [imageKey, setImageKey] = useState(Date.now());
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Settings Form State
  const [newName, setNewName] = useState('');
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
  const [isUploading, setIsUploading] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const fileInputRef = useRef(null);

  const BASE_URL = 'http://localhost:5000/v1';

  // --- Helpers & API Calls (Kept Logic Identical, just refactored for readability) ---
  const getAuthHeader = (isMultipart = false) => {
    if (!token) return {};
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const headers = { 'Authorization': formattedToken };
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    return headers;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      if (!token) return;
      const email = user?.email || authUser?.email;
      const response = await fetch(`${BASE_URL}/users/${email}`, { headers: getAuthHeader() });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setNewName(userData.name);
      }
    } catch (error) { console.error('Error fetching user:', error); }
  }, [token, authUser, user?.email]);

  const fetchRequests = useCallback(async () => {
    try {
      if (!token) return;
      const [pendingRes, sentRes] = await Promise.all([
        fetch(`${BASE_URL}/friends/pending`, { headers: getAuthHeader() }),
        fetch(`${BASE_URL}/friends/sent`, { headers: getAuthHeader() })
      ]);
      if (pendingRes.ok) setPendingRequests(await pendingRes.json());
      if (sentRes.ok) setSentRequests(await sentRes.json());
    } catch (error) { console.error('Error fetching requests:', error); }
  }, [token]);

  const fetchFriendsList = useCallback(async () => {
    try {
      if (!token) return;
      const response = await fetch(`${BASE_URL}/friends/list`, { headers: getAuthHeader() });
      if (response.ok) {
        const data = await response.json();
        setFriendsList(Array.isArray(data) ? data : []);
      }
    } catch (error) { console.error('Error fetching friends list:', error); }
  }, [token]);

  // --- Actions ---
  const handleProfilePicUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      const response = await fetch(`${BASE_URL}/users/profile-pic`, {
        method: 'POST',
        headers: getAuthHeader(true),
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        if (data.user) { setUser(data.user); setImageKey(Date.now()); }
        else { fetchUserProfile(); }
      } else { alert(data.message || 'Failed to update picture'); }
    } catch (error) { console.error(error); } 
    finally { setIsUploading(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteProfilePic = async () => {
    if(!window.confirm("Remove profile picture?")) return;
    try {
      const response = await fetch(`${BASE_URL}/users/profile-pic`, { method: 'DELETE', headers: getAuthHeader() });
      if (response.ok) setUser(prev => ({ ...prev, profilePic: null }));
    } catch (error) { console.error(error); }
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ name: newName })
      });
      if (response.ok) fetchUserProfile();
    } catch (error) { console.error(error); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/change-password`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(passwordData)
      });
      const data = await response.json();
      if (response.ok) {
        alert('Password updated successfully');
        setPasswordData({ oldPassword: '', newPassword: '' });
      } else {
        alert(data.message);
      }
    } catch (error) { console.error(error); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSearchMessage('');

    try {
      const response = await fetch(`${BASE_URL}/users/search?query=${searchQuery}`, { headers: getAuthHeader() });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(Array.isArray(data) ? data : [data]);
      } else {
        if (searchQuery.includes('@')) setSearchResults([{ email: searchQuery, name: 'User', isFallback: true }]);
        else setSearchMessage('No users found.');
      }
    } catch (error) {
      if (searchQuery.includes('@')) setSearchResults([{ email: searchQuery, name: 'Unknown User', isFallback: true }]);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverEmail) => {
    try {
      const response = await fetch(`${BASE_URL}/friends/send-request`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ receiverEmail })
      });
      if (response.ok) {
        setSearchQuery('');
        setSearchResults([]);
        fetchRequests();
      }
    } catch (error) { console.error(error); }
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
    } catch (error) { console.error(error); }
  };

  const handleLogout = () => { logout(); setShowProfileMenu(false); navigate('/'); };

  useEffect(() => {
    if (token) { fetchUserProfile(); fetchRequests(); fetchFriendsList(); }
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
      {/* Navbar Container - Glassmorphism */}
      <nav className="fixed w-full top-0 z-50 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full gap-6">
            
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 shadow-blue-200 shadow-lg">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <h1 className="text-slate-800 text-xl font-bold tracking-tight">Chat<span className="text-blue-600">App</span></h1>
            </div>

            {/* Search Bar - Central & Modern */}
            <div className="flex-1 max-w-lg relative search-container group" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isSearching ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> : <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-300 shadow-inner focus:shadow-md"
                  placeholder="Search people by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
              
              {/* Search Results Dropdown */}
              {(searchResults.length > 0 || searchMessage) && (
                <div className="absolute mt-3 w-full bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {searchMessage && <p className="p-4 text-sm text-slate-500 text-center">{searchMessage}</p>}
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors cursor-pointer group px-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white shadow-sm">
                          {getInitials(result.name || result.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{result.name || 'User'}</p>
                          <p className="text-xs text-slate-500 truncate">{result.email}</p>
                        </div>
                      </div>
                      <button onClick={() => sendFriendRequest(result.email)} className="bg-slate-900 text-white p-2 rounded-full hover:bg-blue-600 hover:scale-105 transition-all shadow-md group-hover:shadow-lg">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className={`p-2.5 rounded-full transition-all duration-200 relative ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                >
                  <Bell className="w-5 h-5" />
                  {pendingRequests.length > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="flex border-b border-slate-100 bg-slate-50/50">
                      <button onClick={() => setActiveTab('received')} className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'received' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        Received
                      </button>
                      <button onClick={() => setActiveTab('sent')} className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'sent' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        Sent
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {activeTab === 'received' ? (
                        pendingRequests.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No pending requests</p> :
                        pendingRequests.map(req => (
                          <div key={req.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-3">
                            <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs shadow-sm mt-1">{getInitials(req.sender?.name)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-800">{req.sender?.name}</p>
                              <p className="text-xs text-slate-500 mb-2">Sent you a friend request</p>
                              <div className="flex gap-2">
                                <button onClick={() => respondToRequest(req.id, 'accept')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium">Accept</button>
                                <button onClick={() => respondToRequest(req.id, 'reject')} className="text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors font-medium">Decline</button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        sentRequests.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No sent requests</p> :
                        sentRequests.map(req => (
                          <div key={req.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 flex items-center gap-3">
                            <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">{getInitials(req.receiver?.name || req.receiverName)}</div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800">{req.receiver?.name || req.receiverName}</p>
                              <div className="flex items-center gap-1 text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full w-fit mt-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Pending
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Pill Button */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)} 
                  className={`flex items-center gap-2.5 border transition-all duration-200 rounded-full p-1 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${showProfileMenu ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold overflow-hidden shrink-0 shadow-sm ring-2 ring-white">
                    {user?.profilePic ? (
                      <img key={imageKey} src={`${user.profilePic}?t=${imageKey}`} alt="Profile" className="w-full h-full object-cover"/>
                    ) : (
                      getInitials(user?.name || authUser?.name)
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 hidden sm:block max-w-[100px] truncate">
                    {user?.name || authUser?.name || 'User'}
                  </span>
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="p-5 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                      <p className="font-bold text-slate-900 text-base">{user?.name || authUser?.name}</p>
                      <p className="text-sm text-slate-500 truncate">{user?.email || authUser?.email}</p>
                    </div>

                    <div className="py-2">
                      <div className="px-5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Friends</span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{friendsList.length}</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {friendsList.length === 0 ? (
                          <div className="px-5 py-3 text-sm text-slate-400 italic flex items-center gap-2">
                             <UserPlus className="w-4 h-4" /> Add friends to start chatting
                          </div>
                        ) : (
                          friendsList.map((item) => {
                            const myEmail = user?.email || authUser?.email;
                            const friend = (item.sender?.email === myEmail) ? item.receiver : item.sender;
                            if(!friend) return null;
                            return (
                              <div key={item.id} className="px-5 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors group">
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm border border-green-200">
                                  {getInitials(friend.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{friend.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{friend.email}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 my-1"></div>
                    
                    <button 
                      onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                      className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </button>

                    <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors mb-1">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- Professional Settings Modal --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowSettingsModal(false)}></div>
          
          {/* Modal Content */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 relative z-10 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Account Settings</h2>
                <p className="text-sm text-slate-500">Manage your profile and security</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-3xl font-bold overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-200">
                    {user?.profilePic ? (
                      <img src={`${user.profilePic}?t=${imageKey}`} alt="Profile" className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-75" />
                    ) : (
                      getInitials(user?.name)
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Camera className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full text-white shadow-md border-2 border-white">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfilePicUpdate} />
                
                <div className="mt-3 flex gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-blue-600 hover:text-blue-700">Change Photo</button>
                  {user?.profilePic && (
                    <>
                      <span className="text-slate-300">|</span>
                      <button onClick={handleDeleteProfilePic} className="text-sm font-medium text-red-500 hover:text-red-700">Remove</button>
                    </>
                  )}
                </div>
              </div>

              {/* Form Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Personal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                           <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                           <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
                            placeholder="John Doe"
                          />
                        </div>
                        <button onClick={handleNameUpdate} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                          Save
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm cursor-not-allowed">
                        {user?.email || authUser?.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Security</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Change Password</label>
                      <div className="relative mb-3">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          placeholder="Current Password"
                          value={passwordData.oldPassword}
                          onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                          className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          placeholder="New Password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Update Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatNavbar;