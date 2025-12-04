import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Search, MessageSquare, Phone, Video, Send, X, 
  Mic, MicOff, Video as VideoIcon, VideoOff, ChevronLeft
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ChatNavbar from '../components/navbar';
import io from 'socket.io-client'; 

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Helper to format duration (e.g., "1h 5m 20s" or "3m 12s")
const formatDuration = (startTime) => {
  if (!startTime) return "0s";
  const diff = Date.now() - startTime;
  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)));

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const ChatPage = () => {
  const { token, user: authUser } = useContext(AuthContext);
  
  // --- UI States ---
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState(""); 
  const [searchTerm, setSearchTerm] = useState('');

  // --- Call States ---
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callerPic, setCallerPic] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  
  // --- Media States ---
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true); 

  // --- Refs ---
  const socketRef = useRef(); 
  const scrollRef = useRef(); 
  const myVideo = useRef();   
  const userVideo = useRef(); 
  const connectionRef = useRef();
  const incomingCallIsVideo = useRef(true); 
  const callStartTime = useRef(null); // <--- NEW: Tracks when call started

  const BASE_URL = 'http://localhost:5000/v1';
  const SOCKET_URL = 'http://localhost:5000';

  const getAuthHeader = () => {
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return { 'Authorization': formattedToken, 'Content-Type': 'application/json' };
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  // ==========================================
  // 1. SOCKET INITIALIZATION
  // ==========================================
  useEffect(() => {
    if (authUser && !socketRef.current) {
      socketRef.current = io(SOCKET_URL, { query: { userId: authUser.id } });

      socketRef.current.on("callUser", (data) => {
        setReceivingCall(true);
        setCaller(data.from);
        setCallerName(data.name);
        setCallerPic(data.profilePic);
        setCallerSignal(data.signal);
        
        incomingCallIsVideo.current = data.isVideoEnabled;
        setIsRemoteVideoEnabled(data.isVideoEnabled); 
      });

      socketRef.current.on("callEnded", () => {
        destroyConnection();
      });

      socketRef.current.on("toggleMedia", ({ type, status }) => {
         if (type === 'video') setIsRemoteVideoEnabled(status);
      });
    }

    return () => {
      if(socketRef.current) {
        socketRef.current.off("callUser");
        socketRef.current.off("callEnded");
        socketRef.current.off("toggleMedia");
      }
    };
  }, [authUser]);

  // Message Handling
  useEffect(() => {
    if (!socketRef.current) return;
    const handleMessage = (msg) => {
      if (selectedFriend && (msg.senderId === selectedFriend.id || msg.senderId === authUser.id)) {
        setMessages((prev) => {
          // Deduplication check
          if (prev.some(m => m.createdAt === msg.createdAt && m.text === msg.text)) return prev;
          return [...prev, msg];
        });
      }
      handleIncomingMessageUpdate(msg);
    };
    socketRef.current.on("receiveMessage", handleMessage);
    return () => socketRef.current.off("receiveMessage", handleMessage);
  }, [selectedFriend, authUser]);

  const handleIncomingMessageUpdate = (msg) => {
    setFriends(prevFriends => prevFriends.map(friend => {
        if (friend.id === msg.senderId || friend.id === msg.receiverId) {
          const isCurrentChat = selectedFriend?.id === friend.id;
          return {
            ...friend,
            lastMessage: msg.text,
            lastMessageTime: new Date(),
            unreadCount: (!isCurrentChat && msg.receiverId === authUser.id) ? (friend.unreadCount || 0) + 1 : 0
          };
        }
        return friend;
    }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)));
  };

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        if (!token || !authUser) return;
        const res = await fetch(`${BASE_URL}/friends/list`, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          setFriends(data.map(i => ({ friendshipId: i.id, ...(i.sender.email === authUser.email ? i.receiver : i.sender), lastMessage: "", unreadCount: 0 })));
        }
      } catch (e) { console.error(e); }
    };
    fetchFriends();
  }, [token, authUser]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedFriend) return;
      setFriends(prev => prev.map(f => f.id === selectedFriend.id ? { ...f, unreadCount: 0 } : f));
      try {
        const res = await fetch(`${BASE_URL}/messages/${selectedFriend.id}`, { headers: getAuthHeader() });
        if (res.ok) setMessages(await res.json());
      } catch(e) { console.error(e); }
    };
    fetchMessages();
  }, [selectedFriend, token]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ==========================================
  // 2. MEDIA STREAM HANDLING
  // ==========================================
  useEffect(() => {
    if (stream && myVideo.current) myVideo.current.srcObject = stream;
    if (remoteStream && userVideo.current) userVideo.current.srcObject = remoteStream;
  }, [stream, remoteStream]);

  const getMediaStream = async (enableVideo) => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!enableVideo) {
        currentStream.getVideoTracks().forEach(track => track.enabled = false);
      }
      setStream(currentStream);
      setIsVideoEnabled(enableVideo);
      setIsAudioEnabled(true);
      return currentStream;
    } catch (err) {
      console.error("Media Error:", err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setStream(audioStream);
        setIsVideoEnabled(false);
        setIsAudioEnabled(true);
        return audioStream;
      } catch (audioErr) {
        alert("Microphone/Camera permission is required.");
        return null;
      }
    }
  };

  const createPeerConnection = (localStream) => {
    const peer = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        const targetId = selectedFriend ? selectedFriend.id : caller;
        socketRef.current.emit("ice-candidate", { to: targetId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      // If we get a video track, assume video is ON to fix initial state sync
      if(event.streams[0].getVideoTracks().length > 0) setIsRemoteVideoEnabled(true);
    };
    return peer;
  };

  const callUser = async (isVideo) => {
    setIsInCall(true);
    setIsRemoteVideoEnabled(true); // Optimistic UI

    const stream = await getMediaStream(isVideo);
    if (!stream) { setIsInCall(false); return; }

    const peer = createPeerConnection(stream);
    connectionRef.current = peer;

    socketRef.current.on("callAccepted", async (signal) => {
      setCallAccepted(true);
      
      // --- START TIMER ---
      callStartTime.current = Date.now();
      
      await peer.setRemoteDescription(new RTCSessionDescription(signal));
      socketRef.current.emit("toggleMedia", { to: selectedFriend.id, type: 'video', status: isVideo });
    });

    socketRef.current.on("ice-candidate", async (candidate) => {
      try { if (peer) await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socketRef.current.emit("callUser", {
      userToCall: selectedFriend.id,
      signalData: offer,
      from: authUser.id,
      name: authUser.name,
      profilePic: authUser.profilePic,
      isVideoEnabled: isVideo
    });
  };

  const answerCall = async () => {
    setIsInCall(true);
    setCallAccepted(true);
    
    // --- START TIMER ---
    callStartTime.current = Date.now();
    
    const shouldEnableVideo = incomingCallIsVideo.current;
    
    const stream = await getMediaStream(shouldEnableVideo);
    if(!stream) { destroyConnection(); return; }

    const peer = createPeerConnection(stream);
    connectionRef.current = peer;

    socketRef.current.on("ice-candidate", async (candidate) => {
      try { if (peer) await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
    });

    await peer.setRemoteDescription(new RTCSessionDescription(callerSignal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socketRef.current.emit("answerCall", { signal: answer, to: caller });
    socketRef.current.emit("toggleMedia", { to: caller, type: 'video', status: shouldEnableVideo });
  };

  const destroyConnection = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.off("callAccepted");
      socketRef.current.off("ice-candidate");
    }
    setCallEnded(true);
    setIsInCall(false);
    setReceivingCall(false);
    setCallAccepted(false);
    setStream(null);
    setRemoteStream(null);
    setCaller("");
    setCallerSignal(null);
    callStartTime.current = null; // Reset timer
  };

  const leaveCall = () => {
    const targetId = selectedFriend ? selectedFriend.id : caller;

    // --- SEND CALL ENDED MESSAGE WITH DURATION ---
    if (callAccepted && callStartTime.current) {
        const duration = formatDuration(callStartTime.current);
        const endMsgText = `📞 Call ended • ${duration}`;
        
        // 1. Send to server so friend gets it
        socketRef.current.emit("sendMessage", { 
          senderId: authUser.id, 
          receiverId: targetId, 
          text: endMsgText 
        });

        // 2. Add to my own UI immediately
        const localMsg = { 
            senderId: authUser.id, 
            receiverId: targetId, 
            text: endMsgText, 
            createdAt: new Date().toISOString() 
        };

        // Update messages state if we are in the chat
        if (selectedFriend && (selectedFriend.id === targetId || caller === selectedFriend.id)) {
            setMessages(prev => [...prev, localMsg]);
        }
        handleIncomingMessageUpdate(localMsg);
    }
    // ----------------------------------------------

    if (targetId) socketRef.current.emit("endCall", { to: targetId });
    destroyConnection();
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const newStatus = !isVideoEnabled;
        videoTrack.enabled = newStatus;
        setIsVideoEnabled(newStatus);
        const targetId = selectedFriend ? selectedFriend.id : caller;
        socketRef.current.emit("toggleMedia", { to: targetId, type: 'video', status: newStatus });
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;
    const payload = { senderId: authUser.id, receiverId: selectedFriend.id, text: newMessage, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, payload]);
    handleIncomingMessageUpdate(payload); 
    socketRef.current.emit("sendMessage", { senderId: authUser.id, receiverId: selectedFriend.id, text: newMessage });
    setNewMessage(""); 
  };

  const filteredFriends = friends.filter(friend => friend.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeName = selectedFriend ? selectedFriend.name : callerName;
  const activePic = selectedFriend ? selectedFriend.profilePic : callerPic;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden font-sans">
      <ChatNavbar />

      {/* ================= INCOMING CALL MODAL ================= */}
      {receivingCall && !callAccepted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-gray-900 border border-gray-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center w-full max-w-sm">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg">
                    <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden flex items-center justify-center">
                        {callerPic ? <img src={callerPic} className="w-full h-full object-cover" alt="caller"/> : <span className="text-2xl font-bold text-white">{getInitials(callerName)}</span>}
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{callerName}</h3>
                <p className="text-indigo-400 mb-8 text-sm flex items-center gap-2">
                    {incomingCallIsVideo.current ? <VideoIcon size={14}/> : <Phone size={14}/>} 
                    Incoming {incomingCallIsVideo.current ? 'Video' : 'Audio'} Call...
                </p>
                <div className="flex gap-10 w-full justify-center">
                    <button onClick={() => { setReceivingCall(false); socketRef.current.emit("endCall", {to: caller}) }} className="flex flex-col items-center gap-2 group">
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg"><X className="w-8 h-8 text-white" /></div>
                    </button>
                    <button onClick={answerCall} className="flex flex-col items-center gap-2 group">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                             {incomingCallIsVideo.current ? <Video className="w-8 h-8 text-white" /> : <Phone className="w-8 h-8 text-white" />}
                        </div>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ================= ACTIVE CALL OVERLAY ================= */}
      {isInCall && (
        <div className="fixed inset-0 z-[50] bg-gray-900 flex flex-col">
            
            {/* BACKGROUND: REMOTE VIDEO */}
            <div className="absolute inset-0 w-full h-full bg-black">
                <video 
                    ref={userVideo} 
                    className={`w-full h-full object-cover ${(!callAccepted || !isRemoteVideoEnabled) ? 'opacity-0' : 'opacity-100'}`} 
                    playsInline 
                    autoPlay 
                />
            </div>

            {/* AVATAR OVERLAY */}
            {(!callAccepted || !isRemoteVideoEnabled) && (
                <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center">
                     {!callAccepted && (
                        <>
                          <div className="absolute w-[50vh] h-[50vh] border border-white/5 rounded-full animate-[ping_3s_linear_infinite]"></div>
                          <div className="absolute w-[35vh] h-[35vh] border border-white/10 rounded-full animate-[ping_3s_linear_infinite_1.5s]"></div>
                        </>
                     )}
                     <div className="relative">
                         <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gray-800 p-2 shadow-2xl ring-4 ring-indigo-500/30 overflow-hidden">
                             {activePic ? (
                                 <img src={activePic} className="w-full h-full object-cover rounded-full" alt="remote user"/>
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gray-700 text-4xl font-bold text-white">{getInitials(activeName)}</div>
                             )}
                         </div>
                         <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-gray-900 ${callAccepted ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                     </div>
                     <h3 className="text-white text-3xl font-bold mt-8">{activeName}</h3>
                     <p className="text-indigo-200/70 mt-2 text-lg font-medium">
                         {callAccepted ? (isRemoteVideoEnabled ? "Video Paused" : "Camera Off") : "Connecting..."}
                     </p>
                </div>
            )}

            {/* PIP: LOCAL VIDEO */}
            <div className={`absolute top-6 right-6 z-30 w-32 h-48 bg-black rounded-xl overflow-hidden shadow-2xl border border-white/20 transition-all duration-500 ${isVideoEnabled && stream ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                 <video ref={myVideo} playsInline muted autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
            </div>

            {/* CONTROLS */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6 z-40 px-6">
                <button onClick={toggleAudio} className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition-all ${isAudioEnabled ? 'bg-gray-700/60 hover:bg-gray-600 text-white' : 'bg-white text-red-600'}`}>
                    {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button onClick={leaveCall} className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:bg-red-700 hover:scale-110 transition-all">
                    <Phone size={32} className="transform rotate-[135deg]" />
                </button>
                <button onClick={toggleVideo} className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition-all ${isVideoEnabled ? 'bg-gray-700/60 hover:bg-gray-600 text-white' : 'bg-white text-red-600'}`}>
                    {isVideoEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                </button>
            </div>
        </div>
      )}

      {/* ================= CHAT UI ================= */}
      <div className="flex flex-1 pt-16 container max-w-7xl mx-auto h-full shadow-2xl rounded-lg overflow-hidden my-0 md:my-4 bg-white">
        <div className={`w-full md:w-[380px] bg-white border-r border-gray-100 flex-col h-full ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 bg-white border-b border-gray-100 sticky top-0 z-10">
             <div className="relative group">
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-700 rounded-full outline-none border border-transparent focus:border-indigo-300 focus:bg-white transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredFriends.map((friend) => (
               <div key={friend.friendshipId} onClick={() => setSelectedFriend(friend)} className={`flex items-center gap-4 p-4 mx-2 my-1 rounded-2xl cursor-pointer transition-all ${selectedFriend?.id === friend.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                  <div className="relative w-14 h-14 shrink-0">
                     <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                        {friend.profilePic ? <img src={friend.profilePic} className="w-full h-full object-cover" alt="profile"/> : getInitials(friend.name)}
                     </div>
                     <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className={`font-semibold truncate ${friend.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{friend.name}</h3>
                        {friend.lastMessageTime && <span className={`text-[11px] ${friend.unreadCount > 0 ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>{new Date(friend.lastMessageTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                      </div>
                      <div className="flex justify-between items-center">
                          <p className={`text-sm truncate max-w-[85%] ${friend.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                            {friend.lastMessage || <span className="text-indigo-500 italic">Tap to start chatting</span>}
                          </p>
                          {friend.unreadCount > 0 && <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-[10px] font-bold">{friend.unreadCount}</span></div>}
                      </div>
                  </div>
               </div>
            ))}
          </div>
        </div>

        <div className={`flex-col flex-1 bg-slate-50 relative h-full ${selectedFriend ? 'flex' : 'hidden md:flex'}`}>
          {selectedFriend ? (
            <>
              <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex justify-between items-center z-10 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedFriend(null)} className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border border-indigo-50">
                    {selectedFriend.profilePic ? <img src={selectedFriend.profilePic} className="w-full h-full object-cover" alt="friend"/> : getInitials(selectedFriend.name)}
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-800 text-sm md:text-base leading-tight">{selectedFriend.name}</h3>
                      <span className="text-xs text-green-500 font-medium">Active Now</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => callUser(false)} className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition"><Phone size={20} /></button>
                  <button onClick={() => callUser(true)} className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition"><Video size={20} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:p-6" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundColor: '#f8fafc' }}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                         <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner">👋</div>
                         <h3 className="text-lg font-semibold text-gray-700">Say Hi to {selectedFriend.name}!</h3>
                    </div>
                )}
                
                {/* --- MESSAGE MAPPING (Includes System Message Rendering) --- */}
                {messages.map((msg, index) => {
                    const isMe = String(msg.senderId) === String(authUser.id);
                    
                    // Check for System Call Message
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
                      <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[75%] md:max-w-[60%] px-4 py-2 shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'}`}>
                          <p className="text-sm md:text-[15px] leading-relaxed break-words">{msg.text}</p>
                          <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )
                })}
                <div ref={scrollRef}></div>
              </div>

              <div className="bg-white p-3 md:p-4 border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto bg-gray-50 p-1.5 rounded-[24px] border border-gray-200 focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-md transition-all">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message..." className="flex-1 py-2.5 px-4 bg-transparent outline-none text-gray-800 text-sm placeholder:text-gray-400" />
                  <button type="submit" disabled={!newMessage.trim()} className={`p-2.5 rounded-full transition-all shrink-0 ${newMessage.trim() ? 'bg-indigo-600 text-white shadow-md hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      <Send size={18} className={newMessage.trim() ? "ml-0.5" : ""} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse ring-8 ring-indigo-50/50">
                    <MessageSquare className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ChatApp</h2>
                <p className="text-gray-500 max-w-xs">Select a conversation from the sidebar to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;