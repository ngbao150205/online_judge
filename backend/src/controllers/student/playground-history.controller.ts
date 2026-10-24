import type { Response } from 'express';
import { currentUserId, sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import { getPlaygroundHistoryService, getPlaygroundRunDetailService } from '../../services/execution/history.service.js';

export async function getPlaygroundHistory(req: ControllerRequest, res: Response): Promise<void> {
  const result = await getPlaygroundHistoryService(currentUserId(req), Number(req.query.page ?? 1));
  sendSuccess(res, result);
}

export async function getPlaygroundRunDetail(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getPlaygroundRunDetailService(currentUserId(req), req.params.runId);
  sendSuccess(res, { data });
}
