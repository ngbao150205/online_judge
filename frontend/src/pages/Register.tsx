import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, UserPlus, Loader2, AlertCircle, X } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const Register: React.FC = () => {
  const { t } = useLanguage() as any;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('Mật khẩu nhập lại không khớp!', 'Passwords do not match!'));
      return;
    }

    if (!agreeTerms) {
      setError(t('Bạn cần đồng ý với Điều khoản sử dụng!', 'You must agree to the Terms of Use!'));
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
      });

      if (res.data.success) {
        alert(t('Đăng ký tài khoản thành công! Hãy đăng nhập.', 'Account registered successfully! Please log in.'));
        navigate('/login');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        t('Đăng ký thất bại. Email có thể đã tồn tại!', 'Registration failed. Email may already exist!')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors font-sans">
      {/* CARD ĐĂNG KÝ CHÍNH */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 sm:p-8 space-y-6 transition-colors">
        
        {/* TOP BAR: THOÁT VỀ TRANG CHỦ */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Trang chủ', 'Home')}</span>
          </Link>

          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer sm:hidden"
            title={t('Quay về Trang chủ', 'Back to Home')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{t('Tạo tài khoản mới', 'Create new account')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Vui lòng điền đầy đủ thông tin bên dưới để bắt đầu', 'Please fill in the information below to get started')}
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
              {t('Họ và Tên *', 'Full Name *')}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('Nguyễn Văn A', 'John Doe')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {t('Mật khẩu *', 'Password *')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {t('Xác nhận mật khẩu *', 'Confirm Password *')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 select-none text-xs">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>
                {t('Tôi đồng ý với', 'I agree to the')}{' '}
                <a href="#terms" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  {t('Điều khoản', 'Terms')}
                </a>{' '}
                {t('và', 'and')}{' '}
                <a href="#privacy" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  {t('Bảo mật', 'Privacy Policy')}
                </a>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{t('Đăng ký tài khoản', 'Register Account')}</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
          {t('Đã có tài khoản?', 'Already have an account?')}{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1">
            {t('Đăng nhập ngay', 'Log in now')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;