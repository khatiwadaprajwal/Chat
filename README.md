# 📱 Real-Time Chat Application  
### Messaging + Audio/Video Calling (React + Node.js + Socket.io + WebRTC + Prisma)

This project is a **full-stack real-time messaging and calling application** featuring:

✔ One-to-one chat  
✔ Audio & video calls using WebRTC  
✔ Friend requests system   
✔ Delete messages & delete full conversation  
✔ JWT authentication  
✔ Socket.io signaling  
✔ Prisma + MySQL database  

---

# 🚀 Features

## 🔐 Authentication
- Register user  
- Login user  
- JWT-based authorization  
- Protected routes  

## 👥 Friends System
- Send friend request  
- Accept/decline request  
- Fetch friend list  
  

## 💬 Real-Time Chat
- Send text messages  
- Receive live messages instantly  
- Delete messages  
- Delete entire conversations  


## 🎥 WebRTC Audio/Video Calls
- Start call  
- Accept/Reject call  
- Live audio + video streaming  
- Toggle camera  
- Toggle microphone  
- End call  
- Remote sync of mic/camera state  

## 📡 Technologies Used

| Tech | Purpose |
|------|---------|
| React + Vite | Frontend UI |
| Node.js + Express | Backend API |
| Socket.io | Real-time events |
| WebRTC | Audio/Video streaming |
| Prisma ORM | Database modeling |
| MySQL | Data storage |
| JWT | Authentication |

---

┌────────────┐        Socket.io        ┌──────────────┐
│  Frontend  │ <──────────────────────>│   Backend     │
│ (React/Vite│                         │ (Express.js)  │
└─────┬──────┘                         └──────┬───────┘
      │                                        │
      │ WebRTC (P2P Media Stream)              │
      └────────────────────────────────────────┘
                    Direct Call


