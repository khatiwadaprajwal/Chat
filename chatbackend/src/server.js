import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { connectDB } from "./config/db.js"; 
import routes from "./routes/index.js";
import { initializeSocket } from "./config/socket.js"; 
import "./utils/nodecorn.js";

dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.io


// ============================================
// ✅ UPDATED CORS CONFIGURATION
// ============================================
app.use(
 cors({
 origin: (origin, callback) => {
      callback(null, origin || "*");
     },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
   })
 );
// ... imports

// app.use(
//   cors({
//     // Replace with your exact Frontend URL (usually http://localhost:5173 for Vite)
//     origin: ["http://localhost:5173", "http://127.0.0.1:5173"], 
//     credentials: true, // ✅ Required for Cookies to work
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"], // ✅ Explicitly allow Auth headers
//   })
// );





app.use(express.json());
app.use(cookieParser());


// Connect DB 
connectDB();

// Routes
app.use("/v1", routes);

app.get("/", (req, res) => {
  res.send("Server is running…");
});

app.get("/test", (req, res) => {
  res.send("Test endpoint is working! on external network.");
});

const PORT = process.env.PORT || 5000;
initializeSocket(server);

// ============================================
// ✅ LISTEN ON ALL NETWORK INTERFACES (0.0.0.0)
// ============================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💻 Local:   http://localhost:${PORT}`);
});