import { Router } from 'express';
import { getPublicProblems, getPublicProblemDetail } from '../controllers/problem.student.controller';
import { submitCode, getMySubmissions } from '../controllers/submission.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public Routes (Không bắt buộc đăng nhập)
router.get('/problems', getPublicProblems);
router.get('/problems/:slug', getPublicProblemDetail);

// Protected Routes (Yêu cầu Học viên đăng nhập)
router.post('/submissions', authenticate, submitCode);
router.get('/submissions/my', authenticate, getMySubmissions);

export default router;