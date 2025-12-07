import { Server } from "socket.io";
import { prisma } from "./db.js"; 

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin:"*" ,
      methods: ["GET", "POST"],
    },
  });

  const userSocketMap = new Map(); // Maps userId (Number) -> socketId (String)

  io.on("connection", (socket) => {
    const userId = parseInt(socket.handshake.query.userId);

    if (userId) {
      userSocketMap.set(userId, socket.id);
      socket.join(userId.toString());
      console.log(`✅ User connected: ${userId}`);
    } else {
      socket.disconnect();
      return;
    }

    // ========================================
    // 👥 FRIEND REQUEST LOGIC (Notifications)
    // ========================================

    // 1. Send Friend Request
    socket.on("sendFriendRequest", (data) => {
      const receiverId = Number(data.receiverId);
      // Emit to the specific receiver
      if (userSocketMap.has(receiverId)) {
        // We pass the full request data so receiver can update UI instantly
        io.to(receiverId.toString()).emit("newFriendRequest", data);
      }
    });

    // 2. Accept Friend Request
    socket.on("acceptFriendRequest", (data) => {
      const senderId = Number(data.senderId); // The person who sent the request originally
      const receiverId = Number(data.receiverId); // The person accepting (current user)

      // Notify the original sender that their request was accepted
      if (userSocketMap.has(senderId)) {
        io.to(senderId.toString()).emit("requestAccepted", { 
           friendId: receiverId, 
           friendName: data.receiverName, // You can pass more info if needed
           friendEmail: data.receiverEmail
        });
      }
    });

    // 3. Cancel Friend Request
    socket.on("cancelFriendRequest", (data) => {
      const receiverId = Number(data.receiverId);
      if (userSocketMap.has(receiverId)) {
         // Tell receiver to remove it from their "Received" list
         io.to(receiverId.toString()).emit("requestCanceled", { senderId: userId });
      }
    });
    
    // ========================================
    // 💬 CHAT LOGIC (Existing)
    // ========================================
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
        socket.emit("messageSent", newMessage); 
        
      } catch (error) {
        console.error("❌ Socket Chat Error:", error);
      }
    });

    socket.on("deleteMessage", async ({ messageId, receiverId }) => {
      try {
        const msgId = Number(messageId);
        const rId = Number(receiverId);

        const message = await prisma.message.findUnique({
          where: { id: msgId }
        });

        if (!message) return;
        if (message.senderId !== userId) return;

        await prisma.message.delete({
          where: { id: msgId }
        });

        if (rId) io.to(rId.toString()).emit("messageDeleted", msgId);
        socket.emit("messageDeleted", msgId);
      } catch (error) {
        console.error("❌ Error deleting message:", error);
      }
    });

    socket.on("deleteAllConversation", async ({ receiverId }) => {
      try {
        const rId = Number(receiverId);
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
        socket.emit("conversationDeleted", chat.id);
        if (rId) io.to(rId.toString()).emit("conversationDeleted", chat.id);
      } catch (error) {
        console.error("❌ deleteAllConversation Socket error:", error);
      }
    });

    // ========================================
    // 📞 WEBRTC SIGNALING LOGIC
    // ========================================
    socket.on("callUser", (data) => {
      const receiverId = Number(data.userToCall);
      if (userSocketMap.has(receiverId)) {
          io.to(receiverId.toString()).emit("callUser", { 
            signal: data.signalData, 
            from: data.from, 
            name: data.name,
            isVideoEnabled: data.isVideoEnabled 
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