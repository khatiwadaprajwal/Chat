import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { generateAccessToken } from "../utils/token.js";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

const isLoggedIn = async (req, res, next) => {
  try {
    // 1. Check for Token in Header
    const authHeader = req.headers.authorization;
    let accessToken = authHeader && authHeader.split(" ")[1];
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    // 2. Try to Verify Access Token
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: parseInt(decoded.id) } });
        
        if (!user) return res.status(401).json({ message: "User not found" });
        
        req.user = user;
        return next(); // Success!
      } catch (err) {
        if (err.name !== "TokenExpiredError") {
          return res.status(401).json({ message: "Invalid token" });
        }
        // If expired, fall through to step 3
      }
    }

    // 3. Access Token Expired? Check Refresh Token
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = await prisma.user.findUnique({ where: { id: parseInt(decoded.id) } });

        if (!user) return res.status(401).json({ message: "User not found" });

        // Generate NEW Access Token
        const newAccessToken = generateAccessToken(user.id, decoded.accountType || "User");

        // Send new token in header (Frontend should update this if possible, but requests will succeed for now)
        res.setHeader("x-new-access-token", newAccessToken);
        
        req.user = user;
        return next();
      } catch (err) {
        return res.status(401).json({ message: "Session expired. Please login again." });
      }
    }

    return res.status(401).json({ message: "Unauthorized" });

  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ message: "Internal Auth Error" });
  }
};

export default isLoggedIn;