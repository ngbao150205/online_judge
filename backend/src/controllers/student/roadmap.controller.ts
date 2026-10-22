import type { Response } from 'express';
import { sendSuccess, currentUserId } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import { getPublicRoadmapsService, getStudentRoadmapDetailService } from '../../services/roadmap.student.service.js';

export async function getPublicRoadmaps(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getPublicRoadmapsService();
  sendSuccess(res, { data });
}

export async function getStudentRoadmapDetail(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getStudentRoadmapDetailService(req.params.id, currentUserId(req));
  sendSuccess(res, { data });
}
