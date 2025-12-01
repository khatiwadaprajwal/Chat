import express from "express";
import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  pendingRequests,
  listFriends,
  sentRequests
} from "../controllers/friendcontroller.js";
import isLoggedIn from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/send-request",isLoggedIn ,sendRequest);
router.post("/accept", isLoggedIn,acceptRequest);
router.post("/reject", isLoggedIn,rejectRequest);
router.post("/cancel",isLoggedIn, cancelRequest);
router.get("/pending",isLoggedIn, pendingRequests);
router.get("/list", isLoggedIn,listFriends);
router.get("/sent", isLoggedIn,sentRequests);

export default router;
