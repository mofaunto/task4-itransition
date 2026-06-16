import express from 'express';
import authRoutes from './auth';
import userRoutes from './users';

const router = express.Router();

// mount auth routes at /api/auth
router.use('/auth', authRoutes);

// mount user routes at /api/users
router.use('/users', userRoutes);

export default router;