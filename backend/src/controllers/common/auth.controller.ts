import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  registerService,
  loginService,
  googleLoginService, // 👈 Bổ sung Service Google Login
  getMeService,
  forgotPasswordService,
  resetPasswordService,
  updateProfileService,
  changePasswordService
} from '../../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerService(req.body);
    return res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công', data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginService(req.body);
    return res.json({ success: true, message: 'Đăng nhập thành công', data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// 🟢 BỔ SUNG: Xử lý Đăng nhập Google
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Thiếu Google Credential' });
    }

    const result = await googleLoginService(credential);
    return res.json({ success: true, message: 'Đăng nhập Google thành công', data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await getMeService(req.user?.userId);
    return res.json({ success: true, data: user });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const message = await forgotPasswordService(req.body.email);
    return res.json({ success: true, message });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const message = await resetPasswordService(req.body);
    return res.json({ success: true, message });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const updatedUser = await updateProfileService(req.user?.userId!, req.body.name);
    return res.json({ success: true, message: 'Cập nhật thành công', data: updatedUser });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const message = await changePasswordService(req.user?.userId!, req.body);
    return res.json({ success: true, message });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};