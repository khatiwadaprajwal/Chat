// controllers/Auth.controller.js
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import sendOTPByEmail from "../utils/email.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

const prisma = new PrismaClient();

// ----------------------------------------------------------------------
// SIGNUP → Save in TempUser + send OTP
// ----------------------------------------------------------------------
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Provide name, email, and Password" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email already registered!" });

    // Delete old temp user if exists
    const existingTemp = await prisma.tempUser.findUnique({ where: { email } });
    if (existingTemp) {
      await prisma.tempUser.delete({ where: { email } });
    }

    // Hash password and generate OTP
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create temp user
    await prisma.tempUser.create({
      data: {
        name,
        email,
        password: hashedPassword,
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0,
        isBlacklisted: false,
        blacklistedUntil: null,
      },
    });

    // Send OTP
    await sendOTPByEmail(email, otp);

    res.status(201).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ----------------------------------------------------------------------
// VERIFY OTP → Create real User
// ----------------------------------------------------------------------
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Provide email and OTP" });
    }

    const tempUser = await prisma.tempUser.findUnique({ where: { email } });
    if (!tempUser) return res.status(404).json({ message: "User not found!" });

    if (tempUser.otp !== otp) return res.status(400).json({ message: "Invalid OTP!" });

    if (tempUser.otpExpires < new Date()) return res.status(400).json({ message: "OTP Expired!" });

    // Create real user
    const user = await prisma.user.create({
      data: {
        name: tempUser.name,
        email: tempUser.email,
        password: tempUser.password,
      },
    });

    // Delete temp user
    await prisma.tempUser.delete({ where: { email } });

    res.status(200).json({ message: "OTP Verified. User Registered.", user });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ----------------------------------------------------------------------
// LOGIN → Validate + Generate Tokens
// ----------------------------------------------------------------------
/*export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Provide email and password" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password!" });

    const accessToken = generateAccessToken(user.id, "User");
    const refreshToken = generateRefreshToken(user.id, "User");

    // ✅ Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(200).json({
      message: "Login successful!",
      accessToken,
      user,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};*/


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Provide email and password" 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      return res.status(404).json({ 
        message: "User not found!" 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ 
        message: "Incorrect password!" 
      });
    }

    // Generate token (single token, no refresh)
    const token = generateAccessToken(user.id, "User");

    // Return token in response
    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ 
      error: "Internal Server Error" 
    });
  }
};