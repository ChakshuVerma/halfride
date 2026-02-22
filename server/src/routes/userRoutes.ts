import { Router } from 'express';
import { requireSession } from '../middleware/sessionAuth';
import { uploadProfilePhoto } from '../middleware/uploadPhoto';
import {
  createMe,
  meExists,
  profile,
  profileByUsername,
  uploadProfilePhotoHandler,
} from '../controllers/userController';

export const userRouter = Router();

userRouter.get('/user/profile', requireSession, profile);
userRouter.get('/user/profile/:username', requireSession, profileByUsername);

// Upload profile photo (multipart form "photo")
userRouter.post(
  '/user/profile/photo',
  requireSession,
  (req, res, next) => {
    uploadProfilePhoto(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          ok: false,
          error: err.message || 'Invalid or missing photo file',
        });
      }
      next();
    });
  },
  uploadProfilePhotoHandler,
);

// Create a user profile for the authenticated uid
userRouter.post('/user/me', requireSession, createMe);

// Check if a user profile exists for the authenticated uid
userRouter.get('/user/me/exists', requireSession, meExists);
