import React from 'react';
import { Phone, Video, X, Circle } from 'lucide-react';

const IncomingCallModal = ({ 
  callerName, 
  callerPic, 
  isVideo, 
  onAccept, 
  onDecline 
}) => {
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-gray-900 via-indigo-900/50 to-gray-900 border border-indigo-500/30 p-10 rounded-3xl shadow-2xl flex flex-col items-center w-full max-w-md animate-in zoom-in duration-500">
        
        {/* Caller Avatar */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
          <div className="relative w-36 h-36 rounded-full p-2 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-2xl">
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
        
        <h3 className="text-3xl font-bold text-white mb-3">{callerName}</h3>
        <p className="text-purple-300 mb-10 text-base flex items-center gap-2 animate-pulse">
          {isVideo ? <Video size={18} className="text-purple-400"/> : <Phone size={18} className="text-purple-400"/>} 
          <span className="font-medium">Incoming {isVideo ? 'Video' : 'Audio'} Call</span>
        </p>
        
        <div className="flex gap-16 w-full justify-center">
          <button onClick={onDecline} className="flex flex-col items-center gap-3 group">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 group-hover:shadow-red-500/50 group-hover:rotate-12">
              <X className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-red-400 text-sm font-semibold">Decline</span>
          </button>
          
          <button onClick={onAccept} className="flex flex-col items-center gap-3 group">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 animate-pulse group-hover:shadow-green-500/50 group-hover:-rotate-12">
              {isVideo ? <Video className="w-10 h-10 text-white" strokeWidth={2.5} /> : <Phone className="w-10 h-10 text-white" strokeWidth={2.5} />}
            </div>
            <span className="text-green-400 text-sm font-semibold">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;