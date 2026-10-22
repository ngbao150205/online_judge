import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import studentRoutes from './student.routes.js';

const router = Router();

// Mount explicit groups before the general student/public API.
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/', studentRoutes);

export default router;
