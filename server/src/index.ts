import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyToken, optionalAuth } from './middleware/auth';

dotenv.config();

const LOG_SERVER_RUNNING = (port: number) => `Server is running on http://localhost:${port}`

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

// Example: Public endpoint (no auth required)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Example: Protected endpoint (auth required)
app.get('/api/user/profile', verifyToken, (req: Request & { user?: any }, res: Response) => {
  // req.user contains the decoded Firebase token with user info
  const response = {
    uid: req.user?.uid,
    email: req.user?.email,
    phone: req.user?.phone_number,
    authTime: req.user?.auth_time,
    issuedAt: req.user?.iat,
    expiresAt: req.user?.exp,
    // Add any other user data from your database here
  }
  
  res.json(response);
});

// Example: Protected POST endpoint
app.post('/api/user/update', verifyToken, (req: Request & { user?: any }, res: Response) => {
  res.json({
    success: true,
    message: 'Profile updated',
    uid: req.user?.uid,
    updatedFields: Object.keys(req.body),
  });
});

// Example: Optional auth endpoint
app.get('/api/public/data', optionalAuth, (req: Request & { user?: any }, res: Response) => {
  if (req.user) {
    // User is authenticated - return personalized data
    res.json({ 
      message: `Hello ${req.user.uid}`, 
      personalized: true,
      timestamp: new Date().toISOString(),
    });
  } else {
    // User is not authenticated - return public data
    res.json({ 
      message: 'Hello guest', 
      personalized: false,
      timestamp: new Date().toISOString(),
    });
  }
});

app.listen(PORT, () => {
  console.log(LOG_SERVER_RUNNING(PORT));
});
