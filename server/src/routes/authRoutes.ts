import { Router } from 'express';
import { forgotPasswordComplete, login, logout, me, refresh, signupComplete, getFirebaseCustomToken } from '../controllers/authController';
import { requireSession } from '../middleware/sessionAuth';

export const authRouter = Router();

authRouter.post('/auth/signup/complete', signupComplete);
authRouter.post('/auth/login', login);
authRouter.post('/auth/refresh', refresh);
authRouter.post('/auth/logout', logout);
authRouter.get('/auth/me', me);
authRouter.post('/auth/forgot-password/complete', forgotPasswordComplete);
authRouter.post('/auth/firebase/custom-token', requireSession, getFirebaseCustomToken);

