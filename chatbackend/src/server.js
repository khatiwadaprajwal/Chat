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
initializeSocket(server);

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
  })
);

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

// ============================================
// ✅ LISTEN ON ALL NETWORK INTERFACES (0.0.0.0)
// ============================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💻 Local:   http://localhost:${PORT}`);
});