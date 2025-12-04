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

initializeSocket(server);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Connect DB (if needed for other non-prisma things)
connectDB();

app.use("/v1", routes);

app.get("/", (req, res) => {
  res.send("Server is running…");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});