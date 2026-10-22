import { Router } from 'express';
import { getPublicRoadmaps, getStudentRoadmapDetail } from '../../controllers/student/roadmap.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

import { validateParams } from '../../middlewares/validation.middleware.js';
import { idParams } from '../../validation/request.schemas.js';

const router = Router();

router.get('/', getPublicRoadmaps);
// Detail includes personal progress and requires authentication.
router.get('/:id', authenticate, validateParams(idParams), getStudentRoadmapDetail);

export default router;
