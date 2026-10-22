import { Router } from 'express';
import { explainErrorWithAI } from '../../controllers/student/ai.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { rateLimit } from '../../middlewares/rate-limit.middleware.js';

import { validateBody } from '../../middlewares/validation.middleware.js';
import { explainBody } from '../../validation/request.schemas.js';

const router = Router();
router.use(authenticate);
router.post('/explain', rateLimit('ai-user', 10, 60, 'user'), validateBody(explainBody), explainErrorWithAI);

export default router;
