import { Router } from 'express';
import {
  submitCode,
  getMySubmissions, getSubmissionDetail,
} from '../../controllers/student/submission.controller.js';
import { runCustomInput, runProblem, getRunStatus } from '../../controllers/student/execution.controller.js';
import { getPlaygroundHistory, getPlaygroundRunDetail } from '../../controllers/student/playground-history.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { executionRateLimit } from '../../middlewares/rate-limit.middleware.js';

import { validateBody, validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { historyQuery, idParams, problemExecutionBody, runBody, runIdParams } from '../../validation/request.schemas.js';

const router = Router();

router.use(authenticate);

// PLAYGROUND runs have durable history; PROBLEM_TRIAL runs remain temporary in Redis.
router.post('/run', executionRateLimit, validateBody(runBody), runCustomInput);
router.post('/run-problem', executionRateLimit, validateBody(problemExecutionBody), runProblem);
router.get('/run-status/:runId', validateParams(runIdParams), getRunStatus);
router.get('/playground-history', validateQuery(historyQuery), getPlaygroundHistory);
router.get('/playground-history/:runId', validateParams(runIdParams), getPlaygroundRunDetail);

// Official submission and history.
router.post('/', executionRateLimit, validateBody(problemExecutionBody), submitCode);
router.get('/history', validateQuery(historyQuery), getMySubmissions);
router.get('/history/:id', validateParams(idParams), getSubmissionDetail);

// Legacy list alias retained for existing clients.
router.get('/my', validateQuery(historyQuery), getMySubmissions);

// General ID route must follow the named history/my routes.
router.get('/:id', validateParams(idParams), getSubmissionDetail);

export default router;
