import type { Response } from 'express';
import { sendSuccess, currentUserId } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import { submitCodeService } from '../../services/submission/submit.service.js';
import { getSubmissionHistoryService } from '../../services/submission/history.service.js';
import { getSubmissionDetailService } from '../../services/submission/detail.service.js';
import type { ExecutionInput } from '../../types/execution.js';

export async function submitCode(req: ControllerRequest<ExecutionInput>, res: Response): Promise<void> {
  const result = await submitCodeService(currentUserId(req), req.body);
  sendSuccess(res, { message: 'Đã gửi bài để chấm toàn bộ testcase', ...result }, 201);
}

export async function getMySubmissions(req: ControllerRequest, res: Response): Promise<void> {
  const result = await getSubmissionHistoryService(currentUserId(req), Number(req.query.page ?? 1));
  sendSuccess(res, result);
}

export async function getSubmissionDetail(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getSubmissionDetailService(currentUserId(req), req.params.id);
  sendSuccess(res, { data });
}
