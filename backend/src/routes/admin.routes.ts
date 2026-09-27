import { Router } from 'express';
import {
  getAdminStats,
  getLiveSubmissions,
  getWorkers,
  getAlerts,
  getAnalytics,
  //getAllStudentsAdminController,
  //createStudentAdminController,
  //updateStudentAdminController,
  //deleteStudentAdminController,
} from '../controllers/admin/dashboard.controller';
import {
  getAllStudentsAdminController,
  createStudentAdminController,
  updateStudentAdminController,
  deleteStudentAdminController,
} from '../controllers/admin/user.controller';
import {
  createProblem,
  getAdminProblems,
  getAdminProblemDetail,
  updateProblem,
  deleteProblem,
} from '../controllers/admin/problem.controller';
import {
  getAllRoadmapsForAdmin,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
} from '../controllers/admin/roadmap.controller';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
} from '../controllers/common/category.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';

const router = Router();

// 🔴 BẢO VỆ TẤT CẢ ROUTE ADMIN BẰNG MIDDLEWARE
router.use(authenticate, authorizeAdmin);

// 🔹 1. DASHBOARD & MONITORING
router.get('/stats', getAdminStats);
router.get('/submissions/live', getLiveSubmissions);
router.get('/workers', getWorkers);
router.get('/alerts', getAlerts);
router.get('/analytics', getAnalytics);

// 🔹 2. QUẢN LÝ SINH VIÊN (USERS)
router.get('/users', getAllStudentsAdminController);
router.post('/users', createStudentAdminController);
router.put('/users/:id', updateStudentAdminController);
router.delete('/users/:id', deleteStudentAdminController);

// 🔹 3. QUẢN LÝ BÀI TẬP (PROBLEMS)
router.get('/problems', getAdminProblems);
router.get('/problems/:id', getAdminProblemDetail);
router.post('/problems', createProblem);
router.put('/problems/:id', updateProblem);
router.delete('/problems/:id', deleteProblem);

// 🔹 4. QUẢN LÝ LỘ TRÌNH (ROADMAPS)
router.get('/roadmaps', getAllRoadmapsForAdmin);
router.post('/roadmaps', createRoadmap);
router.put('/roadmaps/:id', updateRoadmap);
router.delete('/roadmaps/:id', deleteRoadmap);

// 🔹 5. QUẢN LÝ DANH MỤC (CATEGORIES)
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;