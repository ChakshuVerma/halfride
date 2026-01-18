import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { createMe, meExists, profile } from '../controllers/userController';

export const userRouter = Router();

userRouter.get('/user/profile', verifyToken, profile);

// Create a user profile for the authenticated uid
userRouter.post('/user/me', verifyToken, createMe);

// Check if a user profile exists for the authenticated uid
userRouter.get('/user/me/exists', verifyToken, meExists);
