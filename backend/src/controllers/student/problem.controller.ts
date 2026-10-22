import type { Response } from 'express';
import { sendSuccess, currentUserId } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import { getPublicProblemsService, getPublicProblemDetailService } from '../../services/problem.student.service.js';
import type { GetProblemsParams } from '../../services/problem.student.service.js';

export async function getPublicProblems(req: ControllerRequest, res: Response): Promise<void> {
  const result = await getPublicProblemsService({
    page: Number(req.query.page ?? 1), limit: Number(req.query.limit ?? 10),
    search: req.query.search as string | undefined, categoryId: req.query.categoryId as string | undefined,
    difficulty: req.query.difficulty as GetProblemsParams['difficulty'],
  }, currentUserId(req));
  sendSuccess(res, { data: result.problems, pagination: result.pagination });
}

export async function getPublicProblemDetail(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getPublicProblemDetailService(req.params.slug);
  sendSuccess(res, { data });
}
