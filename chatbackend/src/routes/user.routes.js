import express from 'express';
import { 
  getAllUsers, 
  getUserByEmail, 
  uploadProfilePic,
  updateProfile,
  deleteProfilePhoto,
} from '../controllers/user.controller.js';
import isLoggedIn from '../middleware/auth.middleware.js'; 
import upload from "../middleware/multer.middleware.js";

const router = express.Router();


router.get('/getall', getAllUsers);

// Get a single user by email
router.get('/:email', getUserByEmail);


router.post(
  "/profile-pic",
  isLoggedIn,
  upload.single("profilePic"),
  uploadProfilePic
);

// Update profile (name and/or profile picture)
router.put(
  "/profile",
  isLoggedIn,
  upload.single("profilePic"),
  updateProfile
);

// Delete profile photo
router.delete("/profile-pic", isLoggedIn, deleteProfilePhoto);

export default router;
