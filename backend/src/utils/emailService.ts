import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true cho port 465, false cho 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendResetPasswordEmail = async (email: string, code: string) => {
  await transporter.sendMail({
    from: `"Online Judge" <${process.env.SMTP_USER || 'no-reply@onlinejudge.com'}>`,
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