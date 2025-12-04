import React, { useState, useEffect, useContext, useRef } from 'react';
import io from 'socket.io-client'; 
import { AuthContext } from '../context/AuthContext';
import ChatNavbar from '../components/navbar';

// Import the separated UI Components
import IncomingCallModal from '../components/chat/incomingcall';
import ActiveCallOverlay from '../components/chat/activecall';
import Sidebar from '../components/chat/sidebar';
import ChatWindow from '../components/chat/chatwindow';

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
    if (!token) return {}; 
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return { 'Authorization': formattedToken, 'Content-Type': 'application/json' };
  };

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

    const handleConversationDeleted = (chatId) => {
      setMessages((prev) => {
        if (prev.length > 0 && prev[0].chatId === chatId) {
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
    socketRef.current.on("conversationDeleted", handleConversationDeleted);

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

  const handleDeleteConversation = async () => {
    if (!selectedFriend) return;
    if(!window.confirm("Are you sure you want to delete this entire conversation?")) return;

    try {
        const res = await fetch(`${BASE_URL}/messages/conversation/${selectedFriend.id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        if (res.ok) {
            setMessages([]);
            socketRef.current.emit("deleteAllConversation", { receiverId: selectedFriend.id });
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

  const activeName = selectedFriend ? selectedFriend.name : callerName;
  const activePic = selectedFriend ? selectedFriend.profilePic : callerPic;

  if (!authUser) {
    return <div className="h-screen flex items-center justify-center bg-slate-50">Loading Chat...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 overflow-hidden font-sans">
      <ChatNavbar />

      {/* 1. CLEAN INCOMING CALL MODAL */}
      {receivingCall && !callAccepted && (
        <IncomingCallModal 
           callerName={callerName}
           callerPic={callerPic}
           isVideo={incomingCallIsVideo.current}
           onAccept={answerCall}
           onDecline={() => { setReceivingCall(false); socketRef.current.emit("endCall", {to: caller}) }}
        />
      )}

      {/* 2. CLEAN ACTIVE CALL OVERLAY */}
      {isInCall && (
        <ActiveCallOverlay 
           callAccepted={callAccepted}
           callDuration={callDuration}
           isVideoEnabled={isVideoEnabled}
           isAudioEnabled={isAudioEnabled}
           isRemoteVideoEnabled={isRemoteVideoEnabled}
           stream={stream}
           myVideoRef={myVideo}
           userVideoRef={userVideo}
           activeName={activeName}
           activePic={activePic}
           authUser={authUser}
           onToggleAudio={toggleAudio}
           onToggleVideo={toggleVideo}
           onLeaveCall={leaveCall}
        />
      )}

      {/* 3. MAIN CHAT LAYOUT */}
      <div className="flex flex-1 pt-16 container max-w-7xl mx-auto h-full shadow-2xl rounded-lg overflow-hidden my-0 md:my-4 bg-white">
        
        {/* Sidebar Component */}
        <Sidebar 
           friends={friends}
           selectedFriend={selectedFriend}
           onSelectFriend={handleSelectFriend}
           searchTerm={searchTerm}
           setSearchTerm={setSearchTerm}
        />

        {/* Chat Window Component */}
        <ChatWindow 
           selectedFriend={selectedFriend}
           messages={messages}
           authUser={authUser}
           newMessage={newMessage}
           setNewMessage={setNewMessage}
           onSendMessage={handleSendMessage}
           onCallUser={callUser}
           onDeleteMessage={handleDeleteMessage}
           onDeleteConversation={handleDeleteConversation}
           onBack={() => setSelectedFriend(null)}
           scrollRef={scrollRef}
        />
        
      </div>
    </div>
  );
};

export default ChatPage;