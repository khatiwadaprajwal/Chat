import express from 'express';
import authRoutes from './auth.routes.js'; 
import passRoutes from './password.routes.js'; 
import userRoutes from './user.routes.js';
import friendroutes from './friendroutes.js';
import messageRoutes from './message.routes.js';
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/', passRoutes);
router.use('/users', userRoutes);
router.use('/friends', friendroutes);
router.use('/messages', messageRoutes);

export default router;
