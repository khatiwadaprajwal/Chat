import { PrismaClient } from "@prisma/client";
import { error } from "console";
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

    // Check existing pending request
    const existing = await prisma.friendRequest.findFirst({
      where: {
        senderId,
        receiverId: receiver.id,
        status: "PENDING",
      },
    });

    if (existing)
      return res.status(400).json({ message: "Request already sent" });

    // Check if already friends
    const accepted = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id, status: "ACCEPTED" },
          { senderId: receiver.id, receiverId: senderId, status: "ACCEPTED" },
        ],
      },
    });

    if (accepted)
      return res.status(400).json({ message: "Already friends" });

    // Create new friend request
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
  const { senderId, receiverId } = req.body;

  try {
    await prisma.friendRequest.deleteMany({
      where: {
        senderId,
        receiverId,
        status: "PENDING",
      },
    });

    res.json({ message: "Friend request canceled" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
export const pendingRequests = async (req, res) => {
  try {
    const userId = req.user.id; // <-- from token

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
    const userId = req.user.id; // <-- from token

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
    const userId = req.user.id; // Logged-in user

    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "PENDING",
      },
      include: {
        receiver: true, // include receiver details
      },
    });

    res.json(requests);
  } catch (err) {
    console.error("SENT REQUESTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
