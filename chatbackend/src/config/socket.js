import { Server } from "socket.io";
import { prisma } from "./db.js"; 

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = new Map(); // Maps userId (Number) -> socketId (String)

  io.on("connection", (socket) => {
    // 1. CONNECTION SETUP
    const userId = parseInt(socket.handshake.query.userId);

    if (userId) {
      userSocketMap.set(userId, socket.id);
      // IMPORTANT: Join a room named by the User ID (String)
      socket.join(userId.toString());
      console.log(`✅ User connected: ${userId} (Socket: ${socket.id})`);
    } else {
      console.log(`❌ Connection attempt without userId`);
      socket.disconnect();
      return;
    }

    // ========================================
    // 💬 CHAT LOGIC
    // ========================================
    socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
      try {
        const sId = Number(senderId);
        const rId = Number(receiverId);

        // 1. Database Operations
        let chat = await prisma.chat.findFirst({
          where: {
            type: "PRIVATE",
            AND: [
              { members: { some: { userId: sId } } },
              { members: { some: { userId: rId } } },
            ],
          },
        });

        if (!chat) {
          chat = await prisma.chat.create({
            data: {
              type: "PRIVATE",
              members: {
                create: [
                  { userId: sId, role: "MEMBER" },
                  { userId: rId, role: "MEMBER" },
                ],
              },
            },
          });
        }

        const newMessage = await prisma.message.create({
          data: {
            chatId: chat.id,
            senderId: sId,
            text: text,
          },
          include: {
            sender: { select: { id: true, name: true, profilePic: true } },
          },
        });

        // 2. Real-time Delivery
        io.to(rId.toString()).emit("receiveMessage", newMessage);
        
      } catch (error) {
        console.error("❌ Socket Chat Error:", error);
      }
    });

    // ========================================
    // 📞 WEBRTC SIGNALING LOGIC
    // ========================================

    // 1. User A calls User B
    socket.on("callUser", (data) => {
      // Check if User B is online
      const receiverId = Number(data.userToCall);
      
      console.log(`📞 Call Request: From ${data.from} -> To ${receiverId}`);
      
      if (userSocketMap.has(receiverId)) {
          io.to(receiverId.toString()).emit("callUser", { 
            signal: data.signalData, 
            from: data.from, 
            name: data.name 
          });
          console.log(`🚀 Ringing User ${receiverId}...`);
      } else {
          console.log(`⚠️ User ${receiverId} is OFFLINE. Call failed.`);
          
      }
    });

    // 2. User B answers User A
    socket.on("answerCall", (data) => {
      console.log(`✅ Call Answered by ${userId} -> Connecting to ${data.to}`);
      io.to(data.to.toString()).emit("callAccepted", data.signal);
    });

    // 3. ICE Candidates (Network handshake)
    socket.on("ice-candidate", (data) => {
      io.to(data.to.toString()).emit("ice-candidate", data.candidate);
    });

    // 4. End Call
    socket.on("endCall", ({ to }) => {
      console.log(`📴 Call Ended by ${userId}`);
      io.to(to.toString()).emit("callEnded");
    });

    // ========================================

    socket.on("disconnect", () => {
      console.log(`🔻 User disconnected: ${userId}`);
      if (userId) userSocketMap.delete(userId);
    });
  });

  return io;
};