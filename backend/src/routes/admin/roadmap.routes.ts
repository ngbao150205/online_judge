import { Router } from 'express';
import { getAllRoadmapsForAdmin, createRoadmap, updateRoadmap, deleteRoadmap } from '../../controllers/admin/roadmap.controller.js';

import { validateBody, validateParams } from '../../middlewares/validation.middleware.js';
import { createRoadmapBody, idParams, updateRoadmapBody } from '../../validation/request.schemas.js';

const router = Router();

// Authentication and ADMIN authorization are applied by the parent router.
router.route('/')
  .get(getAllRoadmapsForAdmin)
  .post(validateBody(createRoadmapBody), createRoadmap);
router.route('/:id')
  .put(validateParams(idParams), validateBody(updateRoadmapBody), updateRoadmap)
  .delete(validateParams(idParams), deleteRoadmap);

export default router;
