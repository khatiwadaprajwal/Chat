import express from 'express';
import { getMessages } from '../controllers/messagecontroller.js';
import isLoggedIn from "../middleware/auth.middleware.js";

const router = express.Router();

router.get('/:friendId', isLoggedIn, getMessages);

export default router;