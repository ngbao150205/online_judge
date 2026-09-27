import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/db';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { sendResetPasswordEmail } from '../utils/emailService';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Đăng ký tài khoản thường
export const registerService = async (data: { name?: string; email?: string; password?: string }) => {
  const { name, email, password } = data;

  if (!name || !email || !password) {
    throw new Error('Vui lòng nhập đầy đủ Name, Email và Password');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email này đã tồn tại trên hệ thống');
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      pwd: hashedPassword,
      role: 'STUDENT',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const token = generateToken({ userId: user.id, role: user.role });

  return { token, user };
};

// 2. Đăng nhập bằng Email/Mật khẩu
export const loginService = async (data: { email?: string; password?: string }) => {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error('Vui lòng điền Email và Mật khẩu');
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    throw new Error('Email hoặc mật khẩu không chính xác');
  }

  // Khắc phục lỗi: Tài khoản Google không có mật khẩu đăng nhập bằng form thường
  if (!user.pwd || user.pwd === '') {
    throw new Error('Tài khoản này được tạo qua Google. Vui lòng chọn "Đăng nhập bằng Google"');
  }

  const isPasswordValid = await comparePassword(password, user.pwd);
  if (!isPasswordValid) {
    throw new Error('Email hoặc mật khẩu không chính xác');
  }

  const token = generateToken({ userId: user.id, role: user.role });
  const { pwd, resetPasswordToken, resetPasswordExpires, ...userWithoutPwd } = user;

  return { token, user: userWithoutPwd };
};

// 3. Đăng nhập bằng Google
export const googleLoginService = async (credential: string) => {
  if (!credential) {
    throw new Error('Không tìm thấy Google Credential Token');
  }

  // Verify Token trực tiếp với Google
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Xác thực Google thất bại hoặc Email không hợp lệ');
  }

  const { email, name } = payload;
  const normalizedEmail = email.trim().toLowerCase();

  // Tìm người dùng trong DB
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Nếu chưa có -> Tự động tạo tài khoản mới
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: name || 'Google User',
        email: normalizedEmail,
        pwd: '', // Để rỗng đánh dấu tài khoản dùng OAuth
        role: 'STUDENT',
      },
    });
  }

  const token = generateToken({ userId: user.id, role: user.role });
  const { pwd, resetPasswordToken, resetPasswordExpires, ...userWithoutPwd } = user;

  return { token, user: userWithoutPwd };
};

// 4. Lấy thông tin tài khoản hiện tại
export const getMeService = async (userId?: string) => {
  if (!userId) {
    throw new Error('Không tìm thấy thông tin xác thực');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new Error('Người dùng không tồn tại');
  }

  return user;
};

// 5. Yêu cầu Quên mật khẩu (Gửi OTP qua email)
export const forgotPasswordService = async (email?: string) => {
  if (!email) {
    throw new Error('Vui lòng nhập Email');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error('Email này không tồn tại trên hệ thống');
  }

  const resetToken = Math.floor(1000 + Math.random() * 9000).toString();
  const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // Hết hạn sau 15 phút

  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordExpires,
    },
  });

  await sendResetPasswordEmail(user.email, resetToken);

  return 'Mã xác nhận 4 số đã được gửi đến Email của bạn. Vui lòng kiểm tra hộp thư!';
};

// 6. Đặt lại mật khẩu bằng mã OTP
export const resetPasswordService = async (data: { token?: string; otp?: string; email?: string; newPassword?: string }) => {
  const { token, otp, email, newPassword } = data;
  const code = otp || token;

  if (!code || !newPassword) {
    throw new Error('Vui lòng cung cấp Mã xác nhận (4 số) và Mật khẩu mới');
  }

  if (newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  const whereCondition: any = {
    resetPasswordToken: String(code),
    resetPasswordExpires: { gt: new Date() },
  };

  if (email) {
    whereCondition.email = email.trim().toLowerCase();
  }

  const user = await prisma.user.findFirst({
    where: whereCondition,
  });

  if (!user) {
    throw new Error('Mã xác thực không chính xác hoặc đã hết hạn');
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pwd: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  return 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.';
};

// 7. Cập nhật tên hiển thị
export const updateProfileService = async (userId: string, name: string) => {
  if (!name || !name.trim()) {
    throw new Error('Họ và tên không được để trống');
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
};

// 8. Đổi mật khẩu
export const changePasswordService = async (
  userId: string,
  data: { currentPassword?: string; oldPassword?: string; newPassword?: string }
) => {
  const currentPassword = data.currentPassword || data.oldPassword;
  const { newPassword } = data;

  if (!currentPassword || !newPassword) {
    throw new Error('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới');
  }

  if (newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Người dùng không tồn tại');

  // Khắc phục lỗi: Tài khoản tạo bằng Google chưa tạo mật khẩu
  if (!user.pwd || user.pwd === '') {
    throw new Error('Tài khoản này đăng nhập bằng Google và chưa có mật khẩu. Vui lòng sử dụng tính năng "Quên mật khẩu" để tạo mật khẩu mới.');
  }

  const isMatch = await comparePassword(currentPassword, user.pwd);
  if (!isMatch) throw new Error('Mật khẩu hiện tại không chính xác');

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { pwd: hashedPassword },
  });

  return 'Đổi mật khẩu thành công';
};