import type { Response } from 'express';
import { sendSuccess, currentUserId } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import {
  registerService, loginService, googleLoginService, forgotPasswordService, resetPasswordService,
  getMeService, updateProfileService, changePasswordService,
} from '../../services/auth.service.js';
import { clearSessionCookie, setSessionCookie } from '../../utils/session-cookie.js';

export async function register(req: ControllerRequest<Parameters<typeof registerService>[0]>, res: Response): Promise<void> {
  const data = await registerService(req.body);
  sendSuccess(res, { message: 'Đăng ký tài khoản thành công', data }, 201);
}

export async function login(req: ControllerRequest<Parameters<typeof loginService>[0]>, res: Response): Promise<void> {
  const { token, ...data } = await loginService(req.body);
  setSessionCookie(res, token);
  sendSuccess(res, { message: 'Đăng nhập thành công', data });
}

export async function googleLogin(req: ControllerRequest<{ credential: string; acceptedTerms: true }>, res: Response): Promise<void> {
  const { token, ...data } = await googleLoginService(req.body.credential, req.body.acceptedTerms);
  setSessionCookie(res, token);
  sendSuccess(res, { message: 'Đăng nhập Google thành công', data });
}

export async function getMe(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getMeService(currentUserId(req));
  sendSuccess(res, { data });
}

export async function forgotPassword(req: ControllerRequest<{ email: string }>, res: Response): Promise<void> {
  const message = await forgotPasswordService(req.body.email);
  sendSuccess(res, { message });
}

export async function resetPassword(req: ControllerRequest<Parameters<typeof resetPasswordService>[0]>, res: Response): Promise<void> {
  const message = await resetPasswordService(req.body);
  clearSessionCookie(res);
  sendSuccess(res, { message });
}

export async function updateProfile(req: ControllerRequest<{ name: string }>, res: Response): Promise<void> {
  const data = await updateProfileService(currentUserId(req), req.body.name);
  sendSuccess(res, { message: 'Cập nhật thành công', data });
}

export async function changePassword(req: ControllerRequest<Parameters<typeof changePasswordService>[1]>, res: Response): Promise<void> {
  const message = await changePasswordService(currentUserId(req), req.body);
  clearSessionCookie(res);
  sendSuccess(res, { message });
}
