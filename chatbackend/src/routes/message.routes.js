import express from 'express';
import { getMessages,deleteAllConversation } from '../controllers/messagecontroller.js';
import isLoggedIn from "../middleware/auth.middleware.js";

const router = express.Router();

router.get('/:friendId', isLoggedIn, getMessages);
router.delete("/conversation/:friendId", isLoggedIn, deleteAllConversation);
export default router;