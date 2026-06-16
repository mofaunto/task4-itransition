import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, protect } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(protect);

// /api/users – sorted by last_login (desc), if deleted, exclude
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        is_verified: true,
        last_login: true,
        created_at: true,
      },
      orderBy: { last_login: 'desc' }, // NULLs last by default
    });

    const formatted = users.map(u => ({
      ...u,
      last_login: u.last_login?.toISOString() || null,
      created_at: u.created_at.toISOString(),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
});

// /api/users/block
router.post('/block', async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: userIds }, status: { not: 'blocked' } },
      data: { status: 'blocked' },
    });

    res.json({ message: `${result.count} user(s) blocked successfully`, count: result.count });
  } catch (error) {
    console.error('Block error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
});

// /api/users/unblock
router.post('/unblock', async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    // get verified status for each user
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, is_verified: true },
    });

    const updates = users.map(u =>
      prisma.user.update({
        where: { id: u.id },
        data: { status: u.is_verified ? 'active' : 'unverified' },
      })
    );

    await prisma.$transaction(updates);
    res.json({ message: `${users.length} user(s) unblocked successfully`, count: users.length });
  } catch (error) {
    console.error('Unblock error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
});

// /api/users/delete (physical deletion)
router.post('/delete', async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const result = await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });

    const currentUserDeleted = userIds.includes(req.user!.userId);

    res.json({
      message: `${result.count} user(s) deleted permanently`,
      count: result.count,
      currentUserDeleted,
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
});

// /api/users/delete-unverified
router.post('/delete-unverified', async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.user.deleteMany({
      where: { status: 'unverified' },
    });

    res.json({
      message: `${result.count} unverified user(s) deleted permanently`,
      count: result.count,
    });
    
  } catch (error) {
    console.error('Delete unverified error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;