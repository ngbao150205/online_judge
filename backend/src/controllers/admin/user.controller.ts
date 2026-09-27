import { Request, Response } from 'express';
import {
  getAllStudentsAdminService,
  createStudentAdminService,
  updateStudentAdminService,
  deleteStudentAdminService,
} from '../../services/user.admin.service';

// 1. LẤY DANH SÁCH SINH VIÊN
export const getAllStudentsAdminController = async (req: Request, res: Response) => {
  try {
    const students = await getAllStudentsAdminService();

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sinh viên thành công.',
      data: students,
    });
  } catch (error: any) {
    console.error('Lỗi getAllStudentsAdminController:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách sinh viên.',
    });
  }
};

// 2. THÊM SINH VIÊN MỚI
export const createStudentAdminController = async (req: Request, res: Response) => {
  try {
    const { name, email, pwd, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin Họ tên và Email.',
      });
    }

    const newStudent = await createStudentAdminService({
      name,
      email,
      pwd,
      role,
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản sinh viên thành công.',
      data: newStudent,
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(400).json({
        success: false,
        message: 'Email này đã tồn tại trên hệ thống.',
      });
    }

    console.error('Lỗi createStudentAdminController:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo sinh viên mới.',
    });
  }
};

// 3. CẬP NHẬT THÔNG TIN SINH VIÊN
export const updateStudentAdminController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, email, pwd, role } = req.body;

    const updatedStudent = await updateStudentAdminService(id, {
      name,
      email,
      pwd,
      role,
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin sinh viên thành công.',
      data: updatedStudent,
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên cần cập nhật.',
      });
    }

    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(400).json({
        success: false,
        message: 'Email mới đã tồn tại trên hệ thống.',
      });
    }

    console.error('Lỗi updateStudentAdminController:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật sinh viên.',
    });
  }
};

// 4. XÓA SINH VIÊN
export const deleteStudentAdminController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await deleteStudentAdminService(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa tài khoản sinh viên thành công.',
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên cần xóa.',
      });
    }

    console.error('Lỗi deleteStudentAdminController:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa sinh viên.',
    });
  }
};
