import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, KeyRound, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const ResetPassword: React.FC = () => {
  const { t } = useLanguage() as any;
  const navigate = useNavigate();
  const location = useLocation();

  // Tự động lấy email từ trang trước (nếu có)
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 4) {
      setError(t('Mã OTP phải gồm đúng 4 chữ số!', 'OTP code must be exactly 4 digits!'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('Mật khẩu xác nhận không trùng khớp!', 'Confirm password does not match!'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Gửi request chứa email, mã OTP 4 số và mật khẩu mới
      await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
      });

      alert(t('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.', 'Password changed successfully! Please log in again.'));
      navigate('/login');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        t('Mã OTP không đúng hoặc đã hết hạn.', 'Invalid or expired OTP code.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors font-sans">
      {/* CARD ĐẶT LẠI MẬT KHẨU */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 sm:p-8 space-y-6 transition-colors">
        
        {/* TOP BAR: QUAY LẠI QUÊN MẬT KHẨU */}
        <div className="flex items-center justify-between">
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Gửi lại mã', 'Resend code')}</span>
          </Link>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{t('Đặt lại mật khẩu', 'Reset Password')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Nhập mã OTP 4 số đã nhận và mật khẩu mới', 'Enter the 4-digit OTP code received and your new password')}
          </p>
        </div>

        {/* THÔNG BÁO LỖI */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t('Địa chỉ Email *', 'Email Address *')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              />
            </div>
          </div>

          {/* Ô nhập mã OTP 4 chữ số */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-center">
              {t('Mã xác minh OTP (4 chữ số) *', 'OTP Verification Code (4 digits) *')}
            </label>
            <input
              type="text"
              required
              maxLength={4}
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Chỉ cho phép nhập số
              placeholder="••••"
              className="w-full py-3 bg-slate-50 dark:bg-slate-950 border-2 border-blue-500 dark:border-blue-500 text-slate-900 dark:text-slate-100 rounded-xl text-center text-3xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t('Mật khẩu mới *', 'New Password *')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('Nhập mật khẩu mới (tối thiểu 6 ký tự)', 'Enter new password (min 6 characters)')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-9 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t('Xác nhận mật khẩu mới *', 'Confirm New Password *')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('Nhập lại mật khẩu mới', 'Re-enter new password')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-9 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{t('Cập nhật mật khẩu', 'Update Password')}</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
          {t('Nhớ ra mật khẩu?', 'Remember your password?')}{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1">
            {t('Đăng nhập ngay', 'Log in now')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;