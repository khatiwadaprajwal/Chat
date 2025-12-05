import express from 'express';
import { createGroup, getUserGroups } from '../controllers/groupcontroller.js';
import isLoggedIn from "../middleware/auth.middleware.js";

const router = express.Router();

//router.post('/create', isLoggedIn, createGroup);
//router.get('/my-groups', isLoggedIn, getUserGroups);

export default router;