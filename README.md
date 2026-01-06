<div align="center">

# 💬 Real-Time Chat & Video Calling Application
### MERN Stack | Socket.io | WebRTC | Prisma

A full-stack real-time communication platform supporting **instant messaging**, **group chats**, and **peer-to-peer video/audio calling**. Built with performance and scalability in mind using persistent Socket connections and PostgreSQL.

<!-- Badges -->
<p>
  <img src="https://img.shields.io/badge/React-v18-61DAFB?style=flat&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Socket.io-Realtime-010101?style=flat&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=flat&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/WebRTC-Video_Call-333333?style=flat&logo=webrtc&logoColor=white" alt="WebRTC" />
</p>

</div>

---

## 📖 Architecture & Concepts

### 🔌 Why Socket.io?
Unlike traditional HTTP requests where the client requests data and the server responds (Stateless), this application uses **WebSockets** for a persistent, bi-directional connection.

1.  **HTTP (Standard REST):** 
    *   Client Request $\rightarrow$ Server Response $\rightarrow$ Connection Closed.
    *   Great for fetching initial lists (Friends, Chat History).
2.  **Socket.io (Real-Time):** 
    *   Client Connects $\rightarrow$ Persistent "Handshake" Created.
    *   Server can **push** data (messages, incoming calls) to the client instantly without the client asking.
    *   Used here for: Live Chat, Online Status, Typing Indicators, and WebRTC Signaling.

---

## 🚀 Key Features

### 📨 Messaging
*   **Real-time Delivery:** Messages appear instantly without refreshing.
*   **Persistent History:** All chats are stored in PostgreSQL via Prisma.
*   **Group & Private Chats:** 
    *   **Private:** 1-on-1 rooms based on unique User IDs.
    *   **Group:** Auto-joining socket rooms (`socket.join('group_id')`) for multi-user broadcasting.
*   **Message Management:** Delete specific messages or clear entire conversations.

### 📹 Video & Audio Calling (WebRTC)
*   **Peer-to-Peer:** Direct media stream between users (mesh networking) for low latency.
*   **Signaling:** Uses Socket.io to exchange connection data (`offer`, `answer`, `ice-candidate`).
*   **Controls:** Toggle Camera/Mic on the fly, visible call timer.
*   **Notifications:** Real-time modal popup for incoming calls with custom ringtones.

### 🛡️ Security & State
*   **Authentication:** JWT-based protection for API routes.
*   **State Management:** Context API (`AuthContext`) + React Hooks for managing streams and socket instances.

---

## 📂 Project Structure

The project is structured as a monorepo with separate directories for the client and server.

```text
root/
├── chatbackend/                # Node.js & Express Server
│   ├── prisma/                 # Database Schema & Migrations
│   ├── src/
│   │   ├── config/             # Configuration Files
│   │   │   ├── cloudinary.js   # Cloud storage config
│   │   │   ├── db.js           # Prisma Client instance
│   │   │   └── socket.js       # Socket.io initialization & events
│   │   ├── controllers/        # Business Logic
│   │   │   ├── Auth.controller.js
│   │   │   ├── friendcontroller.js
│   │   │   ├── messagecontroller.js
│   │   │   └── ...
│   │   ├── middleware/         # Request processing
│   │   │   ├── auth.middleware.js
│   │   │   ├── multer.middleware.js
│   │   │   └── upload.middleware.js
│   │   ├── routes/             # API Endpoints
│   │   └── server.js           # Application Entry Point
│   └── uploads/                # Local temp storage
│
└── chatfrontend/               # React (Vite) Client
    ├── src/
    │   ├── api/                # Axios instances
    │   ├── components/
    │   │   ├── chat/           # Chat-specific Components
    │   │   │   ├── activecall.jsx   # Video call overlay
    │   │   │   ├── chatwindow.jsx   # Message list & input
    │   │   │   ├── incomingcall.jsx # Call notification modal
    │   │   │   └── sidebar.jsx      # Friend/Chat list
    │   │   └── ui/             # Shared UI (Navbar, etc.)
    │   ├── context/            # Global State (AuthContext)
    │   ├── pages/
    │   │   ├── auth/           # Authentication Screens
    │   │   │   ├── login.jsx
    │   │   │   ├── signup.jsx
    │   │   │   ├── sendotp.jsx      # OTP Generation
    │   │   │   └── verifyotp.jsx    # OTP Verification
    │   │   └── chat.jsx        # Main Dashboard
    │   └── App.jsx             # Routing & Layout
  └── .env                    # Environment Variables


```


---



## 🚀 Key Features & Logic

### 1. Real-Time Communication (Socket.io)
Located in `chatbackend/src/config/socket.js`, the server handles:
- **Connection**: Maps `userId ↔ socketId` in a standard Map object.
- **Messaging**: Listen for `sendMessage` events and emits `receiveMessage` to specific user rooms.
- **Groups**: Automatically joins users to `group_{id}` rooms upon connection for broadcasting.

### 2. Video & Audio Calling (WebRTC)
The frontend handles peer-to-peer connections in `chat.jsx` and `activecall.jsx`:
- **Signaling**: Uses Socket.io to exchange ICE candidates and SDP Offers/Answers.
- **Streams**: Uses `navigator.mediaDevices` to capture Camera/Mic.
- **UI Components**:
  - `incomingcall.jsx`: Modal that pops up when `socket.on('callUser')` triggers.
  - `activecall.jsx`: Displays local and remote video streams, plus duration and media controls.

### 3. Secure Authentication
- **Flow**: Signup → Send OTP (`sendotp.jsx`) → Verify OTP (`verifyotp.jsx`) → Login.
- **Security**: JWT Tokens stored in frontend (Context/LocalStorage) and verified via `auth.middleware.js` on the backend.
- **Password Management**: Includes `forgotpassword.jsx` functionality.

### 4. File Handling
- **Uploads**: Managed by `multer.middleware.js`.
- **Storage**: Files are processed and uploaded to Cloudinary (`config/cloudinary.js`) for permanent hosting.

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v16+
- PostgreSQL
- Cloudinary Account

### 1. Backend Setup
```bash
cd chatbackend

# Install dependencies
npm install

# Setup Environment (.env)
# PORT=5000
# DATABASE_URL="postgresql://user:pass@localhost:5432/chatdb"
# JWT_SECRET="your_secret_key"
# CLOUDINARY_CLOUD_NAME="your_cloud_name"
# CLOUDINARY_API_KEY="your_api_key"
# CLOUDINARY_API_SECRET="your_api_secret"

# Run Migrations
npx prisma migrate dev

# Start Server
npm run dev
```

### 2. Frontend Setup
```bash
cd chatfrontend

# Install dependencies
npm install

# Setup Environment (.env)
# VITE_API_URL="http://localhost:5000/v1"

# Start Client
npm run dev
```

---

## 🔄 How It Works (Workflow)

1. **Auth**: User logs in; Token is saved; `App.jsx` redirects to `/chat`.
2. **Socket Init**: `chat.jsx` connects to the server with query: `{ userId }`.
3. **Discovery**: `sidebar.jsx` fetches the friend list from the API.
4. **Messaging**:
   - User types in `chatwindow.jsx`.
   - Client emits `sendMessage`.
   - Server saves to Postgres (Prisma) and emits `receiveMessage`.
5. **Calling**:
   - User clicks Video Icon.
   - `callUser` event sent to server.
   - Receiver sees `incomingcall.jsx` modal.
   - On Accept, WebRTC Peer Connection is established.
