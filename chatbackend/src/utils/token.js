import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// -----------------------------
// Generate Access Token
// -----------------------------
export const generateAccessToken = (userId, accountType) => {
  try {
    return jwt.sign(
      { sub: userId, accountType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  } catch (error) {
    throw new Error("Error generating access token: " + error.message);
  }
};

// -----------------------------
// Generate Refresh Token
// -----------------------------
export const generateRefreshToken = (userId, accountType) => {
  try {
    return jwt.sign(
      { sub: userId, accountType },
      process.env.REFRESH_SECRET,
      { expiresIn: "24h" }
    );
  } catch (error) {
    throw new Error("Error generating refresh token: " + error.message);
  }
};

// -----------------------------
// Generate Password Reset Token
// -----------------------------
/*
export const generatePasswordResetToken = () => {
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  return { resetToken, hashedToken, expiresAt };
};*/
