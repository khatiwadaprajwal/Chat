import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Send Friend Request
export const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverEmail } = req.body;

    if (!receiverEmail) return res.status(400).json({ message: "Receiver email is required" });

    const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
    if (!receiver) return res.status(404).json({ message: "User not found" });
    if (receiver.id === senderId) return res.status(400).json({ message: "Cannot add yourself" });

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "ACCEPTED") return res.status(400).json({ message: "Already friends" });
      if (existingRequest.status === "PENDING") return res.status(400).json({ message: "Request already pending" });
      if (existingRequest.status === "REJECTED") {
        const updatedRequest = await prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: { status: "PENDING", senderId, receiverId: receiver.id },
          include: { sender: true, receiver: true },
        });
        return res.json({ message: "Friend request sent again", data: updatedRequest });
      }
    }

    const newRequest = await prisma.friendRequest.create({
      data: { senderId, receiverId: receiver.id },
      include: { sender: true, receiver: true },
    });

    res.json({ message: "Friend request sent", data: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", err });
  }
};

// Accept Friend Request
export const acceptRequest = async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ message: "Request not found" });

    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });

    // Optional: create chat for new friends
    const chat = await prisma.chat.create({
      data: {
        type: "PRIVATE",
        members: { create: [{ userId: request.senderId }, { userId: request.receiverId }] },
      },
    });

    res.json({ message: "Friend request accepted", chat, senderId: request.senderId, receiverId: request.receiverId });
  } catch (err) { res.status(500).json({ message: "Server error", err }); }
};

// Reject Friend Request
export const rejectRequest = async (req, res) => {
  const { requestId } = req.body;
  try {
    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });
    res.json({ message: "Request rejected" });
  } catch (err) { res.status(500).json({ message: "Server error", err }); }
};

// Cancel Sent Request
export const cancelRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ message: "Receiver ID required" });

    const result = await prisma.friendRequest.deleteMany({
      where: { senderId, receiverId, status: "PENDING" },
    });

    if (result.count === 0) return res.status(404).json({ message: "No pending request found" });

    res.json({ message: "Friend request canceled" });
  } catch (err) { res.status(500).json({ message: "Server error", err }); }
};

// Get Received Requests
export const pendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: { sender: true },
    });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: "Server error", err }); }
};

// Get Sent Requests
export const sentRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await prisma.friendRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      include: { receiver: true },
    });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: "Server error", err }); }
};

// List Friends
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
  } catch (err) { res.status(500).json({ message: "Server error", err }); }
};
