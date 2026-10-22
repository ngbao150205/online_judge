import { Router } from 'express';
import { getAdminProblems, createProblem, getAdminProblemDetail, updateProblem, deleteProblem } from '../../controllers/admin/problem.controller.js';

import { validateBody, validateParams } from '../../middlewares/validation.middleware.js';
import { createProblemBody, idParams, updateProblemBody } from '../../validation/request.schemas.js';
import { getTestcaseVersions } from '../../controllers/admin/testcase.controller.js';

const router = Router();

// Authentication and ADMIN authorization are applied by the parent router.
router.route('/')
  .get(getAdminProblems)
  .post(validateBody(createProblemBody), createProblem);
router.get('/:id/testcases/versions', validateParams(idParams), getTestcaseVersions);
router.route('/:id')
  .get(validateParams(idParams), getAdminProblemDetail)
  .put(validateParams(idParams), validateBody(updateProblemBody), updateProblem)
  .delete(validateParams(idParams), deleteProblem);

export default router;
