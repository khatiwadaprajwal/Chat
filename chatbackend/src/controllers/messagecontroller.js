import { prisma } from "../config/db.js";

export const getMessages = async (req, res) => {
  try {
    // 1. SAFELY PARSE IDS
    const userId = Number(req.user.id);
    const friendId = Number(req.params.friendId);

    console.log(`🔎 Fetching chat between User ${userId} and Friend ${friendId}...`);

    if (!userId || !friendId) {
      console.log("❌ Missing IDs");
      return res.status(400).json({ error: "Invalid IDs" });
    }

    // 2. FIND THE CHAT
    // We look for a chat where BOTH users are members
    const chat = await prisma.chat.findFirst({
      where: {
        type: "PRIVATE",
        AND: [
          { members: { some: { userId: userId } } },
          { members: { some: { userId: friendId } } },
        ],
      },
    });

    if (!chat) {
      console.log("⚠️ No chat found in DB for these two users.");
      return res.status(200).json([]); // Return empty array so frontend doesn't crash
    }

    console.log(`✅ Found Chat ID: ${chat.id}`);

    // 3. FETCH MESSAGES FOR THIS CHAT
    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, profilePic: true }
        }
      }
    });

    console.log(`📦 Returning ${messages.length} messages.`);
    
    res.status(200).json(messages);

  } catch (error) {
    console.error("❌ Error in getMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};