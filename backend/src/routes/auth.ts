import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import "dotenv/config"; 
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-in-production';

const router = Router();

// Middleware to verify JWT token
const verifyToken = (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(), //just in case
        password_hash: passwordHash,
        is_verified: false,
        status: 'unverified',
        last_login: null,
        created_at: new Date()
      },
      select: { id: true, email: true }
    });

    res.status(201).json({
      message: 'User registered successfully! Confirmation email will be sent.',
      userId: user.id,
      email: user.email
    });

  } catch (error: any) {
    // Handle known Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint violation – this is expected, return a clear message
        return res.status(409).json({ error: 'Email already exists' });
      }
      // Other Prisma errors
      console.error('Prisma error during registration:', error);
      return res.status(500).json({ error: 'Database error. Please try again later.' });
    }

    // other unexpected errors
    console.error('Unexpected registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email.toLowerCase() } },
      select: { id: true, name: true, email: true, status: true, last_login: true, deleted_at: true, password_hash: true }
    });

    if (!user || user.deleted_at) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        last_login: user.last_login?.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/auth/logout
router.post('/logout', verifyToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    res.json({
      message: 'Logged out successfully',
      userId
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true, status: true, is_verified: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked, cannot verify' });
    }

    if (!user.is_verified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { is_verified: true, status: 'active' },
      });
    }

    res.json({ message: 'Email verified successfully! User is now active.' });

  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;