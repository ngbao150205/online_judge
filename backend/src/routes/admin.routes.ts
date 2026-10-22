import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import dashboardRoutes from './admin/dashboard.routes.js';
import userRoutes from './admin/user.routes.js';
import problemRoutes from './admin/problem.routes.js';
import roadmapRoutes from './admin/roadmap.routes.js';
import categoryRoutes from './admin/category.routes.js';

const router = Router();

// Every admin endpoint requires authentication and the ADMIN role.
router.use(authenticate, authorize('ADMIN'));
router.use('/', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/problems', problemRoutes);
router.use('/roadmaps', roadmapRoutes);
router.use('/categories', categoryRoutes);

export default router;
