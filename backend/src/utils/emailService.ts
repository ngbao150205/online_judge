import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendResetPasswordEmail = async (toEmail: string, resetToken: string) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"Judge System Support" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: '[Judge System] Xác thực yêu cầu đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Yêu cầu thay đổi mật khẩu</h2>
        <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu cho tài khoản ${toEmail}.</p>
        <p>Vui lòng nhấn vào nút bên dưới để tiến hành xác thực và đổi mật khẩu (Mã có hiệu lực trong 15 phút):</p>
        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Đặt lại mật khẩu</a>
        <p style="margin-top: 20px; color: #666;">Nếu bạn không yêu cầu điều này, xin vui lòng bỏ qua email.</p>
      </div>
    `,
  });
};