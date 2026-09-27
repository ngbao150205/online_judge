import { Router } from 'express';

import {
  getPublicProblems,
  getPublicProblemDetail,
} from '../controllers/student/problem.controller';

import {
  getPublicRoadmaps,
  getStudentRoadmapDetail,
} from '../controllers/student/roadmap.controller';

import {
  runCustomInput,
  submitCode,
  runProblem,
  getMySubmissions,
  getSubmissionDetail,
  getRunStatus,
} from '../controllers/student/submission.controller';

import {
  explainErrorWithAI,
} from '../controllers/student/ai.controller';

import {
  getCategories,
} from '../controllers/common/category.controller';

import {
  getMe as getProfile,
  updateProfile,
  changePassword,
} from '../controllers/common/auth.controller';

import {
  authenticate,
} from '../middlewares/auth.middleware';

import {
 getLeaderboard
}
from '../controllers/student/leaderboard.controller';

const router = Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Danh sách và chi tiết bài tập.
router.get(
  '/problems',
  authenticate,
  getPublicProblems
);
router.get('/problems/:slug', getPublicProblemDetail);

// Danh sách lộ trình.
router.get('/roadmaps', getPublicRoadmaps);

// Danh mục bài tập.
router.get('/categories', getCategories);

// ============================================================
// SUBMISSIONS — YÊU CẦU ĐĂNG NHẬP
// ============================================================

// 1. Chạy code với input tùy ý, không lưu lịch sử chính thức.
router.post(
  '/submissions/run',
  authenticate,
  runCustomInput,
);

// 2. Chạy thử với testcase công khai của problem.
router.post(
  '/submissions/run-problem',
  authenticate,
  runProblem,
);

// 3. Lấy kết quả chạy thử từ Redis.
router.get(
  '/submissions/run-status/:runId',
  authenticate,
  getRunStatus,
);

// 4. Nộp bài chính thức và lưu lịch sử.
router.post(
  '/submissions',
  authenticate,
  submitCode,
);

// 5. Danh sách lịch sử của người đang đăng nhập.
// Phải đặt trước route /submissions/:id.
router.get(
  '/submissions/history',
  authenticate,
  getMySubmissions,
);

// 6. Chi tiết một lần nộp trong trang lịch sử.
router.get(
  '/submissions/history/:id',
  authenticate,
  getSubmissionDetail,
);

// 7. Endpoint lịch sử cũ, giữ để tương thích.
router.get(
  '/submissions/my',
  authenticate,
  getMySubmissions,
);

// 8. Lấy trạng thái và chi tiết bài nộp chính thức.
// Route tham số tổng quát đặt cuối nhóm submissions.
router.get(
  '/submissions/:id',
  authenticate,
  getSubmissionDetail,
);

// ============================================================
// AI — YÊU CẦU ĐĂNG NHẬP
// ============================================================

router.post(
  '/ai/explain',
  authenticate,
  explainErrorWithAI,
);

// ============================================================
// ROADMAP DETAIL — YÊU CẦU ĐĂNG NHẬP
// ============================================================

router.get(
  '/roadmaps/:id',
  authenticate,
  getStudentRoadmapDetail,
);

// ============================================================
// PROFILE — YÊU CẦU ĐĂNG NHẬP
// ============================================================

router.get(
  '/users/profile',
  authenticate,
  getProfile,
);

router.put(
  '/users/profile',
  authenticate,
  updateProfile,
);

router.put(
  '/users/change-password',
  authenticate,
  changePassword,
);

router.get(
 '/leaderboard',
 getLeaderboard
);

export default router;