import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateAccessToken = (userId, accountType) => {
  return jwt.sign(
    { id: userId, accountType }, 
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // Short life for security
  );
};

export const generateRefreshToken = (userId, accountType) => {
  return jwt.sign(
    { id: userId, accountType }, 
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" } // Long life for convenience
  );
};