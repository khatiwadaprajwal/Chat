import React from 'react';
import { Phone, Mic, MicOff, Video as VideoIcon, VideoOff, Clock, Circle } from 'lucide-react';

const ActiveCallOverlay = ({
  callAccepted,
  callDuration,
  isVideoEnabled,
  isAudioEnabled,
  isRemoteVideoEnabled,
  stream,
  myVideoRef,
  userVideoRef,
  activeName,
  activePic,
  authUser,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall
}) => {
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="fixed inset-0 z-[50] bg-gradient-to-br from-gray-900 via-indigo-900/30 to-gray-900 flex flex-col">
      <div className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-3xl"></div>
      
      {/* Remote Video */}
      <div className="absolute inset-0 w-full h-full">
        <video 
          ref={userVideoRef} 
          className={`w-full h-full object-cover transition-opacity duration-700 ${(!callAccepted || !isRemoteVideoEnabled) ? 'opacity-0' : 'opacity-100'}`} 
          playsInline 
          autoPlay 
        />
      </div>

      {/* Placeholder / Status Overlay */}
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

      {/* Call Duration */}
      {callAccepted && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-lg tracking-wider">{callDuration}</span>
          </div>
        </div>
      )}

      {/* My Video (PiP) */}
      <div className={`absolute top-8 right-8 z-30 w-40 h-56 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 transition-all duration-700 ${isVideoEnabled && stream ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-90 pointer-events-none'}`}>
        <video ref={myVideoRef} playsInline muted autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
        <div className="absolute bottom-3 left-3 text-white text-xs font-semibold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">You</div>
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="text-4xl text-white">{getInitials(authUser?.name || 'You')}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-8 z-40 px-6 animate-in slide-in-from-bottom duration-1000">
        <button 
          onClick={onToggleAudio} 
          className={`w-16 h-16 rounded-full backdrop-blur-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${isAudioEnabled ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-white text-red-600 border border-white'}`}
        >
          {isAudioEnabled ? <Mic size={26} strokeWidth={2} /> : <MicOff size={26} strokeWidth={2} />}
        </button>
        
        <button 
          onClick={onLeaveCall} 
          className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:shadow-red-500/60 transition-all duration-300 hover:rotate-12 border-2 border-white/20"
        >
          <Phone size={36} className="transform rotate-[135deg]" strokeWidth={2.5} />
        </button>
        
        <button 
          onClick={onToggleVideo} 
          className={`w-16 h-16 rounded-full backdrop-blur-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-white text-red-600 border border-white'}`}
        >
          {isVideoEnabled ? <VideoIcon size={26} strokeWidth={2} /> : <VideoOff size={26} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
};

export default ActiveCallOverlay;