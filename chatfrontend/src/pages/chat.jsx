import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Search, MessageSquare, Phone, Video, Send, X, 
  Mic, MicOff, Video as VideoIcon, VideoOff, ChevronLeft,
  Clock, Circle, Trash2 
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
  // 1. SAFE GUARD: Ensure default values if Context is still loading
  const { token, user: authUser } = useContext(AuthContext) || {}; 
  
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState(""); 
  const [searchTerm, setSearchTerm] = useState('');
  const [callDuration, setCallDuration] = useState("00:00");

  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callerPic, setCallerPic] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true); 

  const socketRef = useRef(); 
  const scrollRef = useRef(); 
  const myVideo = useRef();   
  const userVideo = useRef(); 
  const connectionRef = useRef();
  const incomingCallIsVideo = useRef(true); 
  const callStartTime = useRef(null);
  const callTimerInterval = useRef(null);
  
  const selectedFriendRef = useRef(null);

  const BASE_URL = 'http://localhost:5000/v1';
  const SOCKET_URL = 'http://localhost:5000';

  const getAuthHeader = () => {
    // 2. SAFE GUARD: Check if token exists before manipulating
    if (!token) return {}; 
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return { 'Authorization': formattedToken, 'Content-Type': 'application/json' };
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  // --- Call Timer ---
  useEffect(() => {
    if (callAccepted && callStartTime.current) {
      callTimerInterval.current = setInterval(() => {
        const elapsed = Date.now() - callStartTime.current;
        const seconds = Math.floor((elapsed / 1000) % 60);
        const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
        const hours = Math.floor((elapsed / (1000 * 60 * 60)));
        
        if (hours > 0) {
          setCallDuration(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        } else {
          setCallDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }
      }, 1000);
    } else {
      if (callTimerInterval.current) {
        clearInterval(callTimerInterval.current);
        callTimerInterval.current = null;
      }
      setCallDuration("00:00");
    }
    return () => {
      if (callTimerInterval.current) clearInterval(callTimerInterval.current);
    };
  }, [callAccepted]);

  // --- Socket Initialization ---
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

  // --- Handle Incoming Messages & Deletes ---
  useEffect(() => {
    if (!socketRef.current) return;

    const handleMessage = (msg) => {
      const currentSelected = selectedFriendRef.current;
      
      // 3. SAFE GUARD: Ensure authUser exists
      if (!authUser) return; 

      if (currentSelected && (String(msg.senderId) === String(currentSelected.id) || String(msg.senderId) === String(authUser.id))) {
        setMessages((prev) => {
          if (prev.some(m => m.createdAt === msg.createdAt && m.text === msg.text)) return prev;
          return [...prev, msg];
        });
      }
      handleIncomingMessageUpdate(msg);
    };

    const handleMessageDeleted = (deletedMsgId) => {
      setMessages((prev) => prev.filter((m) => m.id !== deletedMsgId));
    };

    // ========== NEW: Handle Conversation Deleted Event ==========
    const handleConversationDeleted = (chatId) => {
      // If the current messages belong to the deleted chat, clear them
      setMessages((prev) => {
        if (prev.length > 0 && prev[0].chatId === chatId) {
          // Also reset sidebar preview
          setFriends(prevFriends => prevFriends.map(f => {
            if(selectedFriendRef.current && String(f.id) === String(selectedFriendRef.current.id)) {
              return { ...f, lastMessage: "", lastMessageTime: null, unreadCount: 0 };
            }
            return f;
          }));
          return [];
        }
        return prev;
      });
    };

    socketRef.current.on("receiveMessage", handleMessage);
    socketRef.current.on("messageDeleted", handleMessageDeleted);
    socketRef.current.on("conversationDeleted", handleConversationDeleted); // <--- Listen here

    return () => {
        socketRef.current?.off("receiveMessage", handleMessage);
        socketRef.current?.off("messageDeleted", handleMessageDeleted);
        socketRef.current?.off("conversationDeleted", handleConversationDeleted);
    };
  }, [authUser]); 

  const handleIncomingMessageUpdate = (msg) => {
    setFriends(prevFriends => {
      const updatedList = prevFriends.map(friend => {
        const friendId = String(friend.id);
        const senderId = String(msg.senderId);
        const receiverId = String(msg.receiverId);
        
        if (friendId === senderId || friendId === receiverId) {
          let newUnreadCount = friend.unreadCount || 0;
          const isActive = selectedFriendRef.current && String(selectedFriendRef.current.id) === friendId;

          if (friendId === senderId && !isActive) {
             newUnreadCount += 1;
          }

          return {
            ...friend,
            lastMessage: msg.text,
            lastMessageTime: new Date().toISOString(),
            unreadCount: newUnreadCount 
          };
        }
        return friend;
      });

      return updatedList.sort((a, b) => {
        const dateA = new Date(a.lastMessageTime || 0);
        const dateB = new Date(b.lastMessageTime || 0);
        return dateB - dateA; 
      });
    });
  };

  // --- Fetch Friends ---
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        if (!token || !authUser) return;
        const res = await fetch(`${BASE_URL}/friends/list`, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          const formattedFriends = data.map(i => ({ 
            friendshipId: i.id, 
            ...(i.sender.email === authUser.email ? i.receiver : i.sender), 
            lastMessage: "", 
            unreadCount: 0, 
            lastMessageTime: null 
          }));
          setFriends(formattedFriends);
        }
      } catch (e) { console.error(e); }
    };
    fetchFriends();
  }, [token, authUser]);

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setFriends(prev => prev.map(f => 
      String(f.id) === String(friend.id) ? { ...f, unreadCount: 0 } : f
    ));
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedFriend) return;
      try {
        const res = await fetch(`${BASE_URL}/messages/${selectedFriend.id}`, { headers: getAuthHeader() });
        if (res.ok) setMessages(await res.json());
      } catch(e) { console.error(e); }
    };
    fetchMessages();
  }, [selectedFriend, token]);

  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  // --- WebRTC Logic ---
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
      if(event.streams[0].getVideoTracks().length > 0) setIsRemoteVideoEnabled(true);
    };
    return peer;
  };

  const callUser = async (isVideo) => {
    setIsInCall(true);
    setIsRemoteVideoEnabled(true);
    const stream = await getMediaStream(isVideo);
    if (!stream) { setIsInCall(false); return; }

    const peer = createPeerConnection(stream);
    connectionRef.current = peer;

    socketRef.current.on("callAccepted", async (signal) => {
      setCallAccepted(true);
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
    if (callTimerInterval.current) {
      clearInterval(callTimerInterval.current);
      callTimerInterval.current = null;
    }
    setCallEnded(true);
    setIsInCall(false);
    setReceivingCall(false);
    setCallAccepted(false);
    setStream(null);
    setRemoteStream(null);
    setCaller("");
    setCallerSignal(null);
    callStartTime.current = null;
    setCallDuration("00:00");
  };

  const leaveCall = () => {
    const targetId = selectedFriend ? selectedFriend.id : caller;
    if (callAccepted && callStartTime.current) {
        const duration = formatDuration(callStartTime.current);
        const endMsgText = `📞 Call ended • ${duration}`;
        
        socketRef.current.emit("sendMessage", { 
          senderId: authUser.id, 
          receiverId: targetId, 
          text: endMsgText 
        });

        const localMsg = { 
            senderId: authUser.id, 
            receiverId: targetId, 
            text: endMsgText, 
            createdAt: new Date().toISOString() 
        };

        if (selectedFriend && (String(selectedFriend.id) === String(targetId) || String(caller) === String(selectedFriend.id))) {
            setMessages(prev => [...prev, localMsg]);
        }
        handleIncomingMessageUpdate(localMsg);
    }
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
    
    const payload = { 
      senderId: authUser.id, 
      receiverId: selectedFriend.id, 
      text: newMessage, 
      createdAt: new Date().toISOString() 
    };

    setMessages((prev) => [...prev, payload]);
    handleIncomingMessageUpdate(payload); 
    socketRef.current.emit("sendMessage", { senderId: authUser.id, receiverId: selectedFriend.id, text: newMessage });
    setNewMessage(""); 
  };

  const handleDeleteMessage = (msgId) => {
    if (!selectedFriend) return;
    socketRef.current.emit("deleteMessage", { 
      messageId: msgId, 
      receiverId: selectedFriend.id 
    });
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  // ========== NEW: Handle Delete All Conversation Function ==========
  const handleDeleteConversation = async () => {
    if (!selectedFriend) return;
    
    // Optional: Add a confirm dialog
    if(!window.confirm("Are you sure you want to delete this entire conversation?")) return;

    try {
        const res = await fetch(`${BASE_URL}/messages/conversation/${selectedFriend.id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        if (res.ok) {
            // 1. Clear UI immediately
            setMessages([]);
            
            // 2. Notify socket to inform the other user
            socketRef.current.emit("deleteAllConversation", { receiverId: selectedFriend.id });

            // 3. Update sidebar to remove last message preview
            setFriends(prev => prev.map(f => 
                String(f.id) === String(selectedFriend.id)
                ? { ...f, lastMessage: "", lastMessageTime: null, unreadCount: 0 } 
                : f
            ));
        } else {
            alert("Failed to delete conversation.");
        }
    } catch (error) {
        console.error("Error deleting conversation:", error);
    }
  };


  const filteredFriends = friends.filter(friend => friend.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeName = selectedFriend ? selectedFriend.name : callerName;
  const activePic = selectedFriend ? selectedFriend.profilePic : callerPic;

  // 4. PREVENT BLANK PAGE: If authUser is not ready, return a simple loader
  if (!authUser) {
    return <div className="h-screen flex items-center justify-center bg-slate-50">Loading Chat...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 overflow-hidden font-sans">
      <ChatNavbar />

      {/* ================= INCOMING CALL MODAL ================= */}
      {receivingCall && !callAccepted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-gray-900 via-indigo-900/50 to-gray-900 border border-indigo-500/30 p-10 rounded-3xl shadow-2xl flex flex-col items-center w-full max-w-md animate-in zoom-in duration-500">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
              <div className="relative w-36 h-36 rounded-full p-2 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-2xl animate-in zoom-in duration-700">
                <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden flex items-center justify-center">
                  {callerPic ? (
                    <img src={callerPic} className="w-full h-full object-cover" alt="caller"/>
                  ) : (
                    <span className="text-3xl font-bold text-white">{getInitials(callerName)}</span>
                  )}
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center shadow-lg animate-pulse">
                <Circle className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-white mb-3 animate-in slide-in-from-bottom duration-500">{callerName}</h3>
            <p className="text-purple-300 mb-10 text-base flex items-center gap-2 animate-pulse">
              {incomingCallIsVideo.current ? <VideoIcon size={18} className="text-purple-400"/> : <Phone size={18} className="text-purple-400"/>} 
              <span className="font-medium">Incoming {incomingCallIsVideo.current ? 'Video' : 'Audio'} Call</span>
            </p>
            
            <div className="flex gap-16 w-full justify-center">
              <button 
                onClick={() => { setReceivingCall(false); socketRef.current.emit("endCall", {to: caller}) }} 
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 group-hover:shadow-red-500/50 group-hover:rotate-12">
                  <X className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-red-400 text-sm font-semibold">Decline</span>
              </button>
              
              <button 
                onClick={answerCall} 
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 animate-pulse group-hover:shadow-green-500/50 group-hover:-rotate-12">
                  {incomingCallIsVideo.current ? (
                    <Video className="w-10 h-10 text-white" strokeWidth={2.5} />
                  ) : (
                    <Phone className="w-10 h-10 text-white" strokeWidth={2.5} />
                  )}
                </div>
                <span className="text-green-400 text-sm font-semibold">Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ACTIVE CALL OVERLAY ================= */}
      {isInCall && (
        <div className="fixed inset-0 z-[50] bg-gradient-to-br from-gray-900 via-indigo-900/30 to-gray-900 flex flex-col">
          <div className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-3xl"></div>
          
          <div className="absolute inset-0 w-full h-full">
            <video 
              ref={userVideo} 
              className={`w-full h-full object-cover transition-opacity duration-700 ${(!callAccepted || !isRemoteVideoEnabled) ? 'opacity-0' : 'opacity-100'}`} 
              playsInline 
              autoPlay 
            />
          </div>

          {(!callAccepted || !isRemoteVideoEnabled) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
              {!callAccepted && (
                <>
                  <div className="absolute w-[65vh] h-[65vh] border border-indigo-500/10 rounded-full animate-[ping_4s_ease-out_infinite]"></div>
                  <div className="absolute w-[50vh] h-[50vh] border border-indigo-400/20 rounded-full animate-[ping_4s_ease-out_infinite] animation-delay-1000"></div>
                  <div className="absolute w-[35vh] h-[35vh] border border-indigo-300/30 rounded-full animate-[ping_4s_ease-out_infinite] animation-delay-2000"></div>
                </>
              )}
              
              <div className="relative animate-in zoom-in duration-1000">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-40 animate-pulse"></div>
                <div className="relative w-44 h-44 md:w-64 md:h-64 rounded-full p-2.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden flex items-center justify-center ring-4 ring-white/10">
                    {activePic ? (
                      <img src={activePic} className="w-full h-full object-cover" alt="remote user"/>
                    ) : (
                      <div className="text-6xl font-bold text-white">{getInitials(activeName)}</div>
                    )}
                  </div>
                </div>
                <div className={`absolute bottom-6 right-6 w-8 h-8 rounded-full border-4 border-gray-900 ${callAccepted ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-yellow-400 to-yellow-500 animate-pulse'} shadow-xl flex items-center justify-center`}>
                  <Circle className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
              
              <h3 className="text-white text-5xl font-bold mt-12 animate-in slide-in-from-bottom duration-1000 tracking-tight">{activeName}</h3>
              <p className="text-indigo-300 mt-4 text-xl font-semibold animate-in slide-in-from-bottom duration-1000 delay-100 flex items-center gap-2">
                {callAccepted ? (
                  <>
                    <Clock className="w-5 h-5" />
                    {isRemoteVideoEnabled ? "Video Paused" : "Camera Off"}
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                    Connecting...
                  </>
                )}
              </p>
            </div>
          )}

          {callAccepted && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl animate-in slide-in-from-top duration-700">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white font-semibold text-lg tracking-wider">{callDuration}</span>
              </div>
            </div>
          )}

          <div className={`absolute top-8 right-8 z-30 w-40 h-56 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 transition-all duration-700 ${isVideoEnabled && stream ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-90 pointer-events-none'}`}>
            <video ref={myVideo} playsInline muted autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
            <div className="absolute bottom-3 left-3 text-white text-xs font-semibold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">You</div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-4xl">{getInitials(authUser?.name || 'You')}</div>
              </div>
            )}
          </div>

          <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-8 z-40 px-6 animate-in slide-in-from-bottom duration-1000">
            <button 
              onClick={toggleAudio} 
              className={`w-16 h-16 rounded-full backdrop-blur-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${isAudioEnabled ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-white text-red-600 border border-white'}`}
            >
              {isAudioEnabled ? <Mic size={26} strokeWidth={2} /> : <MicOff size={26} strokeWidth={2} />}
            </button>
            
            <button 
              onClick={leaveCall} 
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:shadow-red-500/60 transition-all duration-300 hover:rotate-12 border-2 border-white/20"
            >
              <Phone size={36} className="transform rotate-[135deg]" strokeWidth={2.5} />
            </button>
            
            <button 
              onClick={toggleVideo} 
              className={`w-16 h-16 rounded-full backdrop-blur-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-white text-red-600 border border-white'}`}
            >
              {isVideoEnabled ? <VideoIcon size={26} strokeWidth={2} /> : <VideoOff size={26} strokeWidth={2} />}
            </button>
          </div>
        </div>
      )}


      {/* ================= CHAT UI ================= */}
      <div className="flex flex-1 pt-16 container max-w-7xl mx-auto h-full shadow-2xl rounded-lg overflow-hidden my-0 md:my-4 bg-white">
        
        {/* SIDEBAR */}
        <div className={`w-full md:w-[380px] bg-white border-r border-gray-100 flex-col h-full ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 bg-white border-b border-gray-100 sticky top-0 z-10">
             <div className="relative group">
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-700 rounded-full outline-none border border-transparent focus:border-indigo-300 focus:bg-white transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredFriends.map((friend) => (
               <div 
                 key={friend.friendshipId} 
                 onClick={() => handleSelectFriend(friend)} 
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
                          
                          {/* === NEW MESSAGE COUNTER === */}
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

        {/* CHAT AREA */}
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
                  
                  {/* ========== NEW: Delete Conversation Button ========== */}
                  <button 
                    onClick={handleDeleteConversation} 
                    className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition ml-2" 
                    title="Delete Conversation"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:p-6" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundColor: '#f8fafc' }}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                         <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner">👋</div>
                         <h3 className="text-lg font-semibold text-gray-700">Say Hi to {selectedFriend.name}!</h3>
                    </div>
                )}
                
                {messages.map((msg, index) => {
                    // 5. CRITICAL FIX: Safe check on authUser before accessing ID
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
                            
                            {/* Delete Button (Only for Sender) */}
                            {isMe && (
                              <button 
                                onClick={() => handleDeleteMessage(msg.id)}
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