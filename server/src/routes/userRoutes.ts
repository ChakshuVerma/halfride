import { Router } from 'express';
import { requireSession } from '../middleware/sessionAuth';
import { createMe, meExists, profile } from '../controllers/userController';

export const userRouter = Router();

userRouter.get('/user/profile', requireSession, profile);

// Create a user profile for the authenticated uid
userRouter.post('/user/me', requireSession, createMe);

// Check if a user profile exists for the authenticated uid
userRouter.get('/user/me/exists', requireSession, meExists);
