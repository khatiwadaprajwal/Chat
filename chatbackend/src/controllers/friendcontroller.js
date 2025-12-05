import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id; // <-- FROM TOKEN
    const { receiverEmail } = req.body;

    if (!receiverEmail)
      return res.status(400).json({ message: "Receiver email is required" });

    const receiver = await prisma.user.findUnique({
      where: { email: receiverEmail },
    });

    if (!receiver)
      return res.status(404).json({ message: "User not found" });

    if (receiver.id === senderId)
      return res.status(400).json({ message: "Cannot add yourself" });

    // Check for ANY existing interaction between these two
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });

    if (existingRequest) {
      // 1. If already friends
      if (existingRequest.status === "ACCEPTED") {
        return res.status(400).json({ message: "Already friends" });
      }

      // 2. If request is pending
      if (existingRequest.status === "PENDING") {
        return res.status(400).json({ message: "Request already sent/pending" });
      }

      // 3. ✅ IF REJECTED: Reactivate it (Update status to PENDING)
      if (existingRequest.status === "REJECTED") {
        await prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: "PENDING",
            senderId: senderId,    // Ensure sender is the current user
            receiverId: receiver.id // Ensure receiver is the target
          },
        });
        return res.json({ message: "Friend request sent again" });
      }
    }

    // 4. If no interaction exists, create new
    await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: receiver.id,
      },
    });

    res.json({ message: "Friend request sent" });

  } catch (err) {
    console.error("SEND REQUEST ERROR:", err);
    res.status(500).json({ message: "Server error", err });
  }
};

export const acceptRequest = async (req, res) => {
  const { requestId } = req.body;

  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) return res.status(404).json({ message: "Request not found" });

    // Update status
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    // Create private chat
    const chat = await prisma.chat.create({
      data: {
        type: "PRIVATE",
        members: {
          create: [
            { userId: request.senderId },
            { userId: request.receiverId },
          ],
        },
      },
    });

    res.json({ message: "Friend request accepted", chat });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

export const rejectRequest = async (req, res) => {
  const { requestId } = req.body;

  try {
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    res.json({ message: "Request rejected" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};


export const cancelRequest = async (req, res) => {
  try {
    const senderId = req.user.id; // <-- Securely get from Token
    const { receiverId } = req.body; // We only need the ID of who we sent it to

    if (!receiverId) return res.status(400).json({ message: "Receiver ID required" });

    // Delete the request where YOU are the sender and it is PENDING
    const result = await prisma.friendRequest.deleteMany({
      where: {
        senderId: senderId,
        receiverId: receiverId,
        status: "PENDING",
      },
    });

    if (result.count === 0) {
        return res.status(404).json({ message: "No pending request found to cancel" });
    }

    res.json({ message: "Friend request canceled" });
  } catch (err) {
    console.error("CANCEL ERROR", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const pendingRequests = async (req, res) => {
  try {
    const userId = req.user.id; 

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      include: {
        sender: true,
      },
    });

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const listFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friends = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: userId, status: "ACCEPTED" },
          { receiverId: userId, status: "ACCEPTED" },
        ],
      },
      include: { sender: true, receiver: true },
    });

    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const sentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "PENDING",
      },
      include: {
        receiver: true, 
      },
    });

    res.json(requests);
  } catch (err) {
    console.error("SENT REQUESTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};