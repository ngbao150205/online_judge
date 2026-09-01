import { Router } from 'express';
import { register, login, getMe, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 1. PUBLIC ROUTES (Không gắn bất kỳ middleware nào ở đây)
router.post('/register', register);
router.post('/login', login);

// 2. PROTECTED ROUTE (Chỉ gắn middleware cho route cần bảo vệ)
router.get('/me', authenticate, getMe);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;