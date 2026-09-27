import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const explainErrorWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const { sourceCode, language, errorMessage } = req.body;

    if (!sourceCode) {
      return res.status(400).json({ success: false, message: 'Thiếu mã nguồn cần phân tích' });
    }

    return res.status(200).json({
      success: true,
      data: {
        suggestion: 'Mã nguồn của bạn gặp lỗi logic ở câu lệnh điều kiện. Lỗi xảy ra do chưa xử lý số nguyên âm khi chia lấy dư (%).',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi kết nối Trợ giảng AI', error });
  }
};