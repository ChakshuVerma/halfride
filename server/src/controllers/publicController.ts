import type { Request, Response } from 'express';

export async function publicData(req: Request, res: Response) {
  if (req.user) {
    return res.json({
      message: `Hello ${req.user.uid}`,
      personalized: true,
      timestamp: new Date().toISOString(),
    });
  }

  return res.json({
    message: 'Hello guest',
    personalized: false,
    timestamp: new Date().toISOString(),
  });
}

