import { Router } from 'express';
import { getMe, updateProfile, changePassword } from '../../controllers/common/auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

import { validateBody } from '../../middlewares/validation.middleware.js';
import { changePasswordBody, profileBody } from '../../validation/request.schemas.js';

const router = Router();

// Compatibility aliases for /auth/me and /auth/change-password.
router.route('/profile')
  .get(authenticate, getMe)
  .put(authenticate, validateBody(profileBody), updateProfile);
router.put('/change-password', authenticate, validateBody(changePasswordBody), changePassword);

export default router;
