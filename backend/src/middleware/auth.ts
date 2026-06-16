import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: { userId: number; email: string };
}

// verify jwt
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// requirement 5
export const ensureUserActive = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, status: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const protect = [verifyToken, ensureUserActive];