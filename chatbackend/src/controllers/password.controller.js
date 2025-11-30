// src/controllers/password.controller.js
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import sendOTPByEmail from "../utils/email.js";

const prisma = new PrismaClient();

// Utility: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ----------------------------------------------------------------------
// SEND OTP → For Password Reset
// ----------------------------------------------------------------------
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
     if (!email ) {
      return res.status(400).json({ message: "Provide email " });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Upsert OTP
    await prisma.otp.upsert({
      where: { email },
      update: { otp, createdAt: new Date(), otpAttempts: 0, isBlacklisted: false, blacklistedUntil: null, otpExpires },
      create: { email, otp, createdAt: new Date(), otpAttempts: 0, isBlacklisted: false, blacklistedUntil: null, otpExpires },
    });

    await sendOTPByEmail(email, otp);

    res.status(201).json({ message: "OTP sent to email for verification" });
  } catch (err) {
    console.error("❌ sendOtp ERROR:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ----------------------------------------------------------------------
// RESET PASSWORD → Verify OTP
// ----------------------------------------------------------------------
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Provide email, OTP, and newPassword" });
    }

    const otpEntry = await prisma.otp.findUnique({ where: { email } });
    if (!otpEntry) return res.status(400).json({ message: "No OTP request found" });

    // OTP validation and blacklist logic
    if (otpEntry.otp !== otp || otpEntry.otpExpires < new Date()) {
      const attempts = otpEntry.otpAttempts + 1;

      await prisma.otp.update({
        where: { email },
        data: {
          otpAttempts: attempts,
          isBlacklisted: attempts >= 10 ? true : otpEntry.isBlacklisted,
          blacklistedUntil: attempts >= 10 ? new Date(Date.now() + 24 * 60 * 60 * 1000) : otpEntry.blacklistedUntil,
        },
      });

      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Hash new password safely
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });

    await prisma.otp.delete({ where: { email } });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("❌ resetPassword ERROR:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// ----------------------------------------------------------------------
// CHANGE PASSWORD → Authenticated User
// ----------------------------------------------------------------------
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming authentication middleware sets req.user
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) return res.status(400).json({ message: "Provide old and new passwords" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Old password is incorrect" });

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ changePassword ERROR:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
