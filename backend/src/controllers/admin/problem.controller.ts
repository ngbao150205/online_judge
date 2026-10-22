import type { Response } from 'express';
import { sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import {
  getAdminProblemsService, getAdminProblemDetailService, createProblemService, updateProblemService, deleteProblemService,
} from '../../services/problem.admin.service.js';
import type { CreateProblemInput, UpdateProblemInput } from '../../services/problem.admin.service.js';

export async function getAdminProblems(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getAdminProblemsService();
  sendSuccess(res, { data });
}

export async function getAdminProblemDetail(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getAdminProblemDetailService(req.params.id);
  sendSuccess(res, { data });
}

export async function createProblem(req: ControllerRequest<CreateProblemInput>, res: Response): Promise<void> {
  const data = await createProblemService(req.body);
  sendSuccess(res, { message: 'Tạo bài tập thành công', data }, 201);
}

export async function updateProblem(req: ControllerRequest<UpdateProblemInput>, res: Response): Promise<void> {
  const data = await updateProblemService(req.params.id, req.body);
  sendSuccess(res, { message: 'Cập nhật bài tập thành công', data });
}

export async function deleteProblem(req: ControllerRequest, res: Response): Promise<void> {
  await deleteProblemService(req.params.id);
  sendSuccess(res, { message: 'Xóa bài tập thành công' });
}
