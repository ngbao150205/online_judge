import type { Response } from 'express';
import { sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import {
  getAllRoadmapsAdminService, createRoadmapAdminService, updateRoadmapAdminService, deleteRoadmapAdminService,
} from '../../services/roadmap.admin.service.js';

export async function getAllRoadmapsForAdmin(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getAllRoadmapsAdminService();
  sendSuccess(res, { data });
}

export async function createRoadmap(req: ControllerRequest<Parameters<typeof createRoadmapAdminService>[0]>, res: Response): Promise<void> {
  const { title, description, problems } = req.body;
  const data = await createRoadmapAdminService({ title, description, problems });
  sendSuccess(res, { data }, 201);
}

export async function updateRoadmap(req: ControllerRequest<Parameters<typeof updateRoadmapAdminService>[1]>, res: Response): Promise<void> {
  const data = await updateRoadmapAdminService(req.params.id, req.body);
  sendSuccess(res, { data });
}

export async function deleteRoadmap(req: ControllerRequest, res: Response): Promise<void> {
  await deleteRoadmapAdminService(req.params.id);
  sendSuccess(res, { message: 'Xóa lộ trình thành công' });
}
