import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../controllers/common/category.controller.js';

import { validateBody, validateParams } from '../../middlewares/validation.middleware.js';
import { categoryBody, idParams } from '../../validation/request.schemas.js';

const router = Router();

// Authentication and ADMIN authorization are applied by the parent router.
router.route('/')
  .get(getCategories)
  .post(validateBody(categoryBody), createCategory);
router.route('/:id')
  .put(validateParams(idParams), validateBody(categoryBody), updateCategory)
  .delete(validateParams(idParams), deleteCategory);

export default router;
