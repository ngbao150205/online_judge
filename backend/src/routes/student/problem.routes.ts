import { Router } from 'express';
import { getPublicProblems, getPublicProblemDetail } from '../../controllers/student/problem.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

import { validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { problemQuery, slugParams } from '../../validation/request.schemas.js';

const router = Router();

// Listing includes the current user's solved state; detail remains public.
router.get('/', authenticate, validateQuery(problemQuery), getPublicProblems);
router.get('/:slug', validateParams(slugParams), getPublicProblemDetail);

export default router;
