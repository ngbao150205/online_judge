import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendResetPasswordEmail = async (email: string, code: string) => {
  if (!env.SMTP_USER || !env.SMTP_PASS) throw new AppError(503, 'Email chưa được cấu hình', 'EMAIL_UNAVAILABLE');
  await transporter.sendMail({
    from: `"Online Judge" <${env.SMTP_USER}>`,
    to: email,
    subject: 'Mã xác minh đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Mã xác minh của bạn là: <b style="color: #2563eb; font-size: 24px;">${code}</b></h2>
        <p>Mã này có hiệu lực trong 15 phút. Vui lòng không chia sẻ mã này cho ai khác.</p>
      </div>
    `,
  });
};
