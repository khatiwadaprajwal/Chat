// src/controllers/user.controller.js
import { PrismaClient } from "@prisma/client";

import cloudinary from "../config/cloudinary.js";
import {
  uploadProfilePicture,
  deleteCloudinaryImage,
} from "../middleware/upload.middleware.js";
const prisma = new PrismaClient();


const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting local file:", error);
  }
};
// ----------------------------
// Get all users (admin use)
// ----------------------------
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!users.length) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ----------------------------
// Get a single user by email
// ----------------------------
export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) return res.status(400).json({ message: "Email parameter is required" });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true,profilePic:true, createdAt: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user by email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ✅ Call Cloudinary service
    const uploadResult = await uploadProfilePicture(req.file.path);

    if (!uploadResult.success) {
      return res.status(500).json({ message: "Upload failed" });
    }

    // Update user in DB
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePic: uploadResult.url },
      select: {
        id: true,
        name: true,
        email: true,
        profilePic: true,
      },
    });

    res.status(200).json({
      message: "Profile picture updated!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({
      error: "Upload failed",
      details: error.message,
    });
  }
};

// ✅ Update Profile (name, email, profilePic)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    let updateData = {};

    // Update name if provided
    if (name) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          message: "Name must be at least 2 characters long",
        });
      }
      updateData.name = name.trim();
    }

    // Handle profile picture upload
    if (req.file) {
      try {
        console.log("📁 File details:", {
          filename: req.file.filename,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        console.log("☁️ Uploading to Cloudinary...");

        const uploaded = await cloudinary.uploader.upload(req.file.path, {
          folder: "chatapp_profiles",
          transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto" },
          ],
        });

        console.log("✅ Cloudinary upload successful:", uploaded.secure_url);

        updateData.profilePic = uploaded.secure_url;
        deleteLocalFile(req.file.path);
      } catch (uploadError) {
        // ✅ LOG THE ACTUAL ERROR
        console.error("❌ Cloudinary Upload Error Details:", {
          message: uploadError.message,
          error: uploadError,
          http_code: uploadError.http_code,
          name: uploadError.name
        });

        deleteLocalFile(req.file.path);
        
        // Return more specific error message
        return res.status(500).json({
          message: "Failed to upload image to Cloudinary",
          error: uploadError.message,
          details: uploadError.http_code ? `HTTP ${uploadError.http_code}` : "Unknown error"
        });
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No data provided to update",
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        profilePic: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (req.file?.path) deleteLocalFile(req.file.path);

    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// ✅ Delete Profile Photo
export const deleteProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePic: true },
    });

    // Delete from Cloudinary if profile pic exists
    if (user?.profilePic) {
      await deleteCloudinaryImage(user.profilePic);
    }

    // ✅ NO deleteLocalFile() here - no file was uploaded!

    // Update user in database (set profilePic to null)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePic: null },
      select: {
        id: true,
        name: true,
        email: true,
        profilePic: true,
      },
    });

    res.status(200).json({
      message: "Profile photo removed",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================
// Example: Using in Message Controller
// ============================================
/*import { uploadChatImage } from "../services/cloudinary.service.js";

export const sendMessageWithImage = async (req, res) => {
  try {
    const { recipientId, text } = req.body;

    let imageUrl = null;

    // Upload image if provided
    if (req.file) {
      const uploadResult = await uploadChatImage(req.file.path);
      
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        recipientId,
        text: text || "",
        imageUrl,
      },
    });

    res.status(201).json({
      message: "Message sent",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};*/
