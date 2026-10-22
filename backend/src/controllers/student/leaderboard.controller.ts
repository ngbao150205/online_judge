import type { Response } from 'express';
import { sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import { getLeaderboardService } from '../../services/leaderboard.service.js';

export async function getLeaderboard(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getLeaderboardService(Number(req.query.limit) || 100, Number(req.query.page) || 1);
  sendSuccess(res, { data });
}
