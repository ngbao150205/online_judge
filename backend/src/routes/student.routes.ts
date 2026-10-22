import { Router } from 'express';
import { getCategories } from '../controllers/common/category.controller.js';
import { getLeaderboard } from '../controllers/student/leaderboard.controller.js';
import problemRoutes from './student/problem.routes.js';
import roadmapRoutes from './student/roadmap.routes.js';
import submissionRoutes from './student/submission.routes.js';
import aiRoutes from './student/ai.routes.js';
import profileRoutes from './student/profile.routes.js';

import { validateQuery } from '../middlewares/validation.middleware.js';
import { leaderboardQuery } from '../validation/request.schemas.js';

const router = Router();

// This API contains both public and authenticated endpoints.
router.get('/categories', getCategories);
router.get('/leaderboard', validateQuery(leaderboardQuery), getLeaderboard);
router.use('/problems', problemRoutes);
router.use('/roadmaps', roadmapRoutes);
router.use('/submissions', submissionRoutes);
router.use('/ai', aiRoutes);
router.use('/users', profileRoutes);

export default router;
