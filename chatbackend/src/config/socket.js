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
    
    // ... (Your existing sendMessage logic here) ...
    socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
      try {
        const sId = Number(senderId);
        const rId = Number(receiverId);

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

        io.to(rId.toString()).emit("receiveMessage", newMessage);
        // Also emit back to sender to confirm saved (optional if you handle optimistic UI)
        socket.emit("messageSent", newMessage); 
        
      } catch (error) {
        console.error("❌ Socket Chat Error:", error);
      }
    });

    // 👇👇👇 NEW DELETE MESSAGE LOGIC 👇👇👇
    socket.on("deleteMessage", async ({ messageId, receiverId }) => {
      try {
        const msgId = Number(messageId);
        const rId = Number(receiverId);

        console.log(`🗑️ Request to delete message: ${msgId}`);

        // 1. Verify ownership (Security: Only sender can delete)
        const message = await prisma.message.findUnique({
          where: { id: msgId }
        });

        if (!message) return;
        if (message.senderId !== userId) {
          console.log("⚠️ Unauthorized delete attempt");
          return;
        }

        // 2. Delete from Database
        await prisma.message.delete({
          where: { id: msgId }
        });

        // 3. Notify Receiver (Real-time removal)
        if (rId) {
          io.to(rId.toString()).emit("messageDeleted", msgId);
        }

        // 4. Notify Sender (Real-time removal)
        socket.emit("messageDeleted", msgId);

        console.log(`✅ Message ${msgId} deleted successfully`);

      } catch (error) {
        console.error("❌ Error deleting message:", error);
      }
    });
    // inside initializeSocket
socket.on("deleteAllConversation", async ({ receiverId }) => {
  try {
    const rId = Number(receiverId);

    // Find chat
    const chat = await prisma.chat.findFirst({
      where: {
        type: "PRIVATE",
        AND: [
          { members: { some: { userId: userId } } },
          { members: { some: { userId: rId } } },
        ],
      },
    });

    if (!chat) return;

    await prisma.message.deleteMany({ where: { chatId: chat.id } });

    // Notify both sender and receiver
    socket.emit("conversationDeleted", chat.id);
    if (rId) io.to(rId.toString()).emit("conversationDeleted", chat.id);
    
  } catch (error) {
    console.error("❌ deleteAllConversation Socket error:", error);
  }
});

    


    // ========================================
    // 📞 WEBRTC SIGNALING LOGIC
    // ========================================
    // ... (Your existing call logic remains unchanged) ...

    socket.on("callUser", (data) => {
      const receiverId = Number(data.userToCall);
      if (userSocketMap.has(receiverId)) {
          io.to(receiverId.toString()).emit("callUser", { 
            signal: data.signalData, 
            from: data.from, 
            name: data.name,
            isVideoEnabled: data.isVideoEnabled // Ensure this is passed
          });
      }
    });

    socket.on("answerCall", (data) => {
      io.to(data.to.toString()).emit("callAccepted", data.signal);
    });

    socket.on("ice-candidate", (data) => {
      io.to(data.to.toString()).emit("ice-candidate", data.candidate);
    });

    socket.on("toggleMedia", (data) => {
       io.to(data.to.toString()).emit("toggleMedia", data);
    });

    socket.on("endCall", ({ to }) => {
      io.to(to.toString()).emit("callEnded");
    });

    socket.on("disconnect", () => {
      console.log(`🔻 User disconnected: ${userId}`);
      if (userId) userSocketMap.delete(userId);
    });
  });

  return io;
};