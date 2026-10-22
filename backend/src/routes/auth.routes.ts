import { Router } from 'express';
import {
  register, login, googleLogin, forgotPassword, resetPassword,
  getMe, updateProfile, changePassword,
} from '../controllers/common/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginRateLimit, accountLoginRateLimit, otpSendRateLimit, otpEmailRateLimit, otpVerifyRateLimit, rateLimit } from '../middlewares/rate-limit.middleware.js';
import { logout, logoutAll } from '../controllers/common/session.controller.js';

import { validateBody } from '../middlewares/validation.middleware.js';
import { changePasswordBody, forgotPasswordBody, googleBody, loginBody, profileBody, registerBody, resetPasswordBody } from '../validation/request.schemas.js';

const router = Router();

// Public authentication endpoints.
router.post('/register', rateLimit('register-ip', 10, 900), validateBody(registerBody), register);
router.post('/login', loginRateLimit, validateBody(loginBody), accountLoginRateLimit, login);
router.post('/google', loginRateLimit, validateBody(googleBody), googleLogin);
router.post('/forgot-password', otpSendRateLimit, validateBody(forgotPasswordBody), otpEmailRateLimit, forgotPassword);
router.post('/reset-password', loginRateLimit, validateBody(resetPasswordBody), otpVerifyRateLimit, resetPassword);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);

// Authentication is scoped to these endpoints so unknown /auth paths remain 404.
router.route('/me')
  .get(authenticate, getMe)
  .put(authenticate, validateBody(profileBody), updateProfile);
router.put('/change-password', authenticate, validateBody(changePasswordBody), changePassword);

export default router;
