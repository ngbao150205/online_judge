import { Router } from 'express';
import {
  register,
  login,
  getMe,
  googleLogin,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
} from '../controllers/common/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 🟢 PUBLIC ROUTES
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// 🔴 PROTECTED ROUTES (Yêu cầu đăng nhập)
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;