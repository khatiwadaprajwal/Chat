import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import sendOTPByEmail from "../utils/email.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

const prisma = new PrismaClient();

// --- SIGNUP (No changes needed) ---
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email already registered!" });

    // Clean up old temp users
    await prisma.tempUser.deleteMany({ where: { email } });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.tempUser.create({
      data: {
        name, email, password: hashedPassword, otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0, isBlacklisted: false,
      },
    });

    await sendOTPByEmail(email, otp);
    res.status(201).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- VERIFY OTP (No changes needed) ---
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Provide email and OTP" });

    const tempUser = await prisma.tempUser.findUnique({ where: { email } });
    if (!tempUser) return res.status(404).json({ message: "User not found" });
    if (tempUser.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (tempUser.otpExpires < new Date()) return res.status(400).json({ message: "OTP Expired" });

    const user = await prisma.user.create({
      data: { name: tempUser.name, email: tempUser.email, password: tempUser.password },
    });

    await prisma.tempUser.delete({ where: { email } });
    res.status(200).json({ message: "User Verified", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- LOGIN (UPDATED TO FIX YOUR ISSUE) ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Provide email and password" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password!" });

    // 1. Generate Tokens
    const accessToken = generateAccessToken(user.id, "User");
    const refreshToken = generateRefreshToken(user.id, "User");

    // 2. Set Refresh Token in Cookie (Hidden from frontend JS)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 3. Send Access Token in JSON
    // FIXED: Key is named 'token' so your Login.jsx works
    res.status(200).json({
      message: "Login successful!",
      token: accessToken, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};