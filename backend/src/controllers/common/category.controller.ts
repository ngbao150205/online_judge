import type { Response } from 'express';
import { sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import {
  getCategoriesService, createCategoryService, updateCategoryService, deleteCategoryService,
} from '../../services/category.service.js';

export async function getCategories(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getCategoriesService();
  sendSuccess(res, { data });
}

export async function createCategory(req: ControllerRequest<{ name: string }>, res: Response): Promise<void> {
  const data = await createCategoryService(req.body.name);
  sendSuccess(res, { message: 'Tạo danh mục thành công', data }, 201);
}

export async function updateCategory(req: ControllerRequest<{ name: string }>, res: Response): Promise<void> {
  const data = await updateCategoryService(req.params.id, req.body.name);
  sendSuccess(res, { message: 'Cập nhật danh mục thành công', data });
}

export async function deleteCategory(req: ControllerRequest, res: Response): Promise<void> {
  await deleteCategoryService(req.params.id);
  sendSuccess(res, { message: 'Xóa danh mục thành công' });
}
