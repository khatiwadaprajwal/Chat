// middleware/isLoggedIn.js
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

/*const isLoggedIn = async (req, res, next) => {
  try {
    
    let accessToken = req.headers.authorization?.split(" ")[1];
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
        
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        
        req.user = user;
        return next();
      } catch (err) {
        // If it's not an expired token error, return unauthorized
        if (err.name !== "TokenExpiredError") {
          return res.status(401).json({ message: "Invalid access token" });
        }
        // Access token expired, continue to check refresh token
      }
    }

    // 3️⃣ Verify refresh token if access token expired or missing
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
        
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          { sub: user.id, accountType: decoded.accountType },
          JWT_SECRET,
          { expiresIn: "30m" }
        );

        // Attach new access token in header for client to update
        res.setHeader("x-access-token", newAccessToken);
        
        req.user = user;
        return next();
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }
    }

    // If no valid token
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};*/


const isLoggedIn = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // FIX HERE
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },  // <---- USE decoded.id
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
export default isLoggedIn;