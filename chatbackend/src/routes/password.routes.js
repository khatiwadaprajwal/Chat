// routes/password.routes.js
import express from 'express';
import { sendOtp, resetPassword, changePassword } from '../controllers/password.controller.js';
import isLoggedIn from '../middleware/auth.middleware.js';


const router = express.Router();

// Send OTP for password reset
router.post('/send-otp', sendOtp);

// Reset password using OTP
router.post('/reset-password', resetPassword);

// Change password (authenticated users)
router.post('/change-password', isLoggedIn, changePassword);

export default router;
