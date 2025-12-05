import { prisma } from "../config/db.js"; // Adjust path to your db file

// Create a new Group
export const createGroup = async (req, res) => {
  try {
    const creatorId = Number(req.user.id);
    const { name, members } = req.body; // members should be array of userIds: [2, 5, 8]

    if (!name || !members || members.length < 1) {
      return res.status(400).json({ message: "Group name and at least 1 member required" });
    }

    // Prepare member data: Creator is ADMIN, others are MEMBERS
    const memberData = [
      { userId: creatorId, role: "ADMIN" },
      ...members.map((id) => ({ userId: Number(id), role: "MEMBER" })),
    ];

    // Transaction: Create Chat -> Add Members
    const group = await prisma.chat.create({
      data: {
        type: "GROUP",
        name: name,
        members: {
          create: memberData,
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, profilePic: true } }
          }
        }
      }
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("❌ Create Group Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all groups the current user belongs to
export const getUserGroups = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const groups = await prisma.chat.findMany({
      where: {
        type: "GROUP",
        members: {
          some: { userId: userId },
        },
      },
      include: {
        members: {
            include: { user: { select: { id: true, name: true, profilePic: true } } }
        },
        messages: {
            take: 1, // Get the latest message for the sidebar preview
            orderBy: { createdAt: 'desc' }
        }
      },
    });

    res.json(groups);
  } catch (error) {
    console.error("❌ Get Groups Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};