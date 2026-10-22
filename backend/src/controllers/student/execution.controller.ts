import type { Response } from 'express';
import { sendSuccess, currentUserId } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import { runCustomInputService, runProblemService } from '../../services/execution/run.service.js';
import { getRunStatusService } from '../../services/execution/status.service.js';
import type { CustomRunInput, ExecutionInput } from '../../types/execution.js';

export async function runCustomInput(req: ControllerRequest<CustomRunInput>, res: Response): Promise<void> {
  const result = await runCustomInputService(currentUserId(req), req.body);
  sendSuccess(res, { message: 'Đã gửi yêu cầu chạy thử, đang xử lý', ...result });
}

export async function runProblem(req: ControllerRequest<ExecutionInput>, res: Response): Promise<void> {
  const result = await runProblemService(currentUserId(req), req.body);
  sendSuccess(res, { message: 'Đã gửi code để chạy thử', ...result });
}

export async function getRunStatus(req: ControllerRequest, res: Response): Promise<void> {
  const result = await getRunStatusService(currentUserId(req), req.params.runId);
  sendSuccess(res, result);
}
