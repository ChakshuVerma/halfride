import type { Request, Response } from 'express';

export async function health(_req: Request, res: Response) {
  return res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
}
