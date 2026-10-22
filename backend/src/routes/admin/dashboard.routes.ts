import { Router } from 'express';
import {
  getAdminStats, getLiveSubmissions, getWorkers, getAlerts, getAnalytics,
} from '../../controllers/admin/dashboard.controller.js';

const router = Router();

// Keep existing monitoring URLs; authentication is applied by the parent router.
router.get('/stats', getAdminStats);
router.get('/submissions/live', getLiveSubmissions);
router.get('/workers', getWorkers);
router.get('/alerts', getAlerts);
router.get('/analytics', getAnalytics);

export default router;
