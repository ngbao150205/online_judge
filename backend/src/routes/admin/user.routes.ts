import { Router } from 'express';
import { getAllStudentsAdminController, createStudentAdminController, updateStudentAdminController, deleteStudentAdminController } from '../../controllers/admin/user.controller.js';

import { validateBody, validateParams } from '../../middlewares/validation.middleware.js';
import { createUserBody, idParams, updateUserBody } from '../../validation/request.schemas.js';

const router = Router();

// Authentication and ADMIN authorization are applied by the parent router.
router.route('/')
  .get(getAllStudentsAdminController)
  .post(validateBody(createUserBody), createStudentAdminController);
router.route('/:id')
  .put(validateParams(idParams), validateBody(updateUserBody), updateStudentAdminController)
  .delete(validateParams(idParams), deleteStudentAdminController);

export default router;
