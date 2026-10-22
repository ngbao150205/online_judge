import type { Response } from 'express';
import type { ControllerRequest } from '../controller.utils.js';
import { sendSuccess } from '../controller.utils.js';
import { getTestcaseVersionsService } from '../../services/problem.admin.service.js';

export async function getTestcaseVersions(req: ControllerRequest, res: Response) {
  sendSuccess(res, { data: await getTestcaseVersionsService(req.params.id) });
}
