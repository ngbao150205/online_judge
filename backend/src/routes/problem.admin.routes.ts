import { Router } from 'express';
import {
  createProblem,
  getAdminProblems,
  getAdminProblemDetail,
  updateProblem,
  deleteProblem,
} from '../controllers/problem.admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Yêu cầu Đăng nhập + Quyền ADMIN cho toàn bộ route phía dưới
router.use(authenticate, authorizeAdmin);

router.post('/', createProblem);
router.get('/', getAdminProblems);
router.get('/:id', getAdminProblemDetail);
router.put('/:id', updateProblem);
router.delete('/:id', deleteProblem);

export default router;