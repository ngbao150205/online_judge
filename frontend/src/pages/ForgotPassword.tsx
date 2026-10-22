import { API_BASE_URL } from '../config/api';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

export const ForgotPassword: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Gọi API Backend cổng 5001
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setNotice(response.data?.message || t(
        'Nếu email thuộc tài khoản đang hoạt động, hướng dẫn đặt lại mật khẩu sẽ được gửi nếu dịch vụ email sẵn sàng.',
        'If the email belongs to an active account, reset instructions will be sent when email delivery is available.'
      ));
      setIsSent(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        t('Không thể gửi mã. Vui lòng kiểm tra lại email!', 'Unable to send code. Please check your email!')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors font-sans">
      {/* CARD QUÊN MẬT KHẨU CHÍNH */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 sm:p-8 space-y-6 transition-colors">
        
        {/* TOP BAR: THOÁT / NÚT QUAY LẠI */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Đăng nhập', 'Log in')}</span>
          </Link>

          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t('Quay về Trang chủ', 'Back to Home')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSent ? (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 rounded-2xl flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('Quên Mật Khẩu?', 'Forgot Password?')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {t('Nhập email đã đăng ký để nhận', 'Enter your registered email to receive a')}{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {t('mã OTP 6 chữ số', '6-digit OTP code')}
                </strong>{' '}
                {t('khôi phục mật khẩu.', 'to reset your password.')}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{t('Gửi mã xác minh (OTP)', 'Send verification code (OTP)')}</span>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {t('Đã tiếp nhận yêu cầu', 'Request received')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {notice}
              </p>
            </div>

            <button
              onClick={() => navigate('/reset-password', { state: { email } })}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer mt-2"
            >
              {t('Nhập mã 6 số & Đặt lại mật khẩu', 'Enter 6-digit code & Reset password')}
            </button>
          </div>
        )}

        {/* FOOTER */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
          {t('Chưa nhận được mã?', "Didn't receive the code?")}{' '}
          <button
            onClick={() => setIsSent(false)}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1 cursor-pointer bg-transparent border-0 p-0"
          >
            {t('Thử lại', 'Try again')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
