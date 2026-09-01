import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

// 1. Interface mở rộng từ Request
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// 2. Middleware xác thực Token (Authentication)
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để thực hiện thao tác này' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token) as { userId: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token hết hạn hoặc không hợp lệ' });
  }
};

// 3. Middleware phân quyền linh hoạt theo Roles (Authorization)
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tài nguyên này' });
    }
    next();
  };
};

// 4. Middleware dành riêng cho Admin (Đã đổi req: Request -> req: AuthRequest)
export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Truy cập bị từ chối. Bạn không có quyền Admin/Giảng viên',
    });
  }
  next();
};