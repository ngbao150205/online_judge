import type { Response } from 'express';
import { sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import {
  getAllStudentsAdminService, createStudentAdminService, updateStudentAdminService, deleteStudentAdminService,
} from '../../services/user.admin.service.js';
import type { CreateUserInput, UpdateUserInput } from '../../services/user.admin.service.js';

export async function getAllStudentsAdminController(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getAllStudentsAdminService();
  sendSuccess(res, { message: 'Lấy danh sách sinh viên thành công.', data });
}

export async function createStudentAdminController(req: ControllerRequest<CreateUserInput>, res: Response): Promise<void> {
  const data = await createStudentAdminService(req.body);
  sendSuccess(res, { message: 'Tạo tài khoản sinh viên thành công.', data }, 201);
}

export async function updateStudentAdminController(req: ControllerRequest<UpdateUserInput>, res: Response): Promise<void> {
  const data = await updateStudentAdminService(req.params.id, req.body);
  sendSuccess(res, { message: 'Cập nhật thông tin sinh viên thành công.', data });
}

export async function deleteStudentAdminController(req: ControllerRequest, res: Response): Promise<void> {
  await deleteStudentAdminService(req.params.id);
  sendSuccess(res, { message: 'Xóa tài khoản sinh viên thành công.' });
}
