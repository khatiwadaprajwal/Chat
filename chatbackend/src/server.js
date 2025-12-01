import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser"; 
import { connectDB } from "./config/db.js";

import routes from "./routes/index.js"; 

dotenv.config();

const app = express();


app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173", // ✅ Specify origin
  credentials: true, // ✅ Important for cookies!
}));
app.use(express.json());
app.use(cookieParser()); // ✅ Add cookie-parser BEFORE routes

// Connect to DB
connectDB();

// Routes
app.use("/v1", routes);
import "./utils/nodecorn.js";

app.get("/", (req, res) => {
  res.send("Server is running…");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});