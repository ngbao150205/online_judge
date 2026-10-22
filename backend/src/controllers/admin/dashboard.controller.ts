import type { Response } from 'express';
import { sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import {
  getAdminStatsService, getLiveSubmissionsService, getWorkersService, getAlertsService, getAnalyticsService,
} from '../../services/dashboard.service.js';

export async function getAdminStats(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getAdminStatsService();
  sendSuccess(res, { data });
}

export async function getLiveSubmissions(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getLiveSubmissionsService();
  sendSuccess(res, { data });
}

export async function getWorkers(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getWorkersService();
  sendSuccess(res, { data });
}

export async function getAlerts(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getAlertsService();
  sendSuccess(res, { data });
}

export async function getAnalytics(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getAnalyticsService();
  sendSuccess(res, { data });
}
