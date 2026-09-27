import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  createProblemService,
  getAdminProblemsService,
  getAdminProblemDetailService,
  updateProblemService,
  deleteProblemService,
} from '../../services/problem.admin.service';

export const createProblem = async (req: AuthRequest, res: Response) => {
  try {
    const newProblem = await createProblemService(req.body);
    return res.status(201).json({ success: true, message: 'Tạo bài tập thành công', data: newProblem });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Lỗi khi tạo bài tập' });
  }
};

export const getAdminProblems = async (req: AuthRequest, res: Response) => {
  try {
    const problems = await getAdminProblemsService();
    return res.status(200).json({ success: true, data: problems });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi lấy danh sách bài tập' });
  }
};

export const getAdminProblemDetail = async (req: AuthRequest, res: Response) => {
  try {
    const problem = await getAdminProblemDetailService(req.params.id as string);
    return res.status(200).json({ success: true, data: problem });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message || 'Không tìm thấy bài tập' });
  }
};

export const updateProblem = async (req: AuthRequest, res: Response) => {
  try {
    const updatedProblem = await updateProblemService(req.params.id as string, req.body);
    return res.status(200).json({ success: true, message: 'Cập nhật bài tập thành công', data: updatedProblem });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Lỗi khi cập nhật bài tập' });
  }
};

export const deleteProblem = async (req: AuthRequest, res: Response) => {
  try {
    await deleteProblemService(req.params.id as string);
    return res.status(200).json({ success: true, message: 'Xóa bài tập thành công' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Lỗi khi xóa bài tập' });
  }
};