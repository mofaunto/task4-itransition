import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import "dotenv/config"; 
import { PrismaClient } from '@prisma/client';

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

// POST /api/register - User Registration
router.post('/register', async (req: Request<{}, { message?: string }, any>, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
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
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  } finally {
      await prisma.$disconnect();
    }
});

// login api
router.post('/login', async (req: Request<{}, { token?: string }, any>, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findFirst({
        where: { email: { equals: email.toLowerCase() } },
        select: { id: true, name: true, email: true, status: true, last_login: true, deleted_at: true, password_hash: true }
    });

    // doesn't exist or deleted
    if (!user || user.deleted_at) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // check for block
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate jwt token
    const token = jwt.sign(
      { userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' }
    );

    // Update last login time
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
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
});

// logout api
router.post('/logout', verifyToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    
    res.json({
      message: 'Logged out successfully',
      userId
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// verify email api
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

    // Update status to active
    if (!user.is_verified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { is_verified: true, status: 'active' },
      });
    }

    res.json({ message: 'Email verified successfully! User is now active.' });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;