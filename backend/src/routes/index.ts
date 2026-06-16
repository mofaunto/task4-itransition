import express from 'express';
import authRoutes from './auth';

const router = express.Router();

// mount auth routes at /api/auth
router.use('/auth', authRoutes);

export default router;