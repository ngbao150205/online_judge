import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, User, Lock, ArrowRight, LayoutDashboard, Home, Loader2, X, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useLanguage } from '../context/LanguageContext';

export const Login: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Trạng thái modal hỏi Admin chọn trang
  const [showAdminChoice, setShowAdminChoice] = useState(false);

  const handleAuthSuccess = (responseData: any) => {
    // 🟢 Thêm log để bạn dễ dàng debug cấu trúc trả về trong Tab Console trình duyệt
    console.log("🔥 Dữ liệu Auth trả về:", responseData);

    // Bóc tách linh hoạt: Đề phòng trường hợp Axios bọc thêm một tầng .data hoặc không
    const actualData = responseData?.data?.data || responseData?.data || responseData;
    
    const token = actualData?.token;
    const user = actualData?.user;
    const role = user?.role || 'STUDENT';

    // 🟢 Kiểm tra nếu không có token thì dừng lại để tránh lưu giá trị "undefined" vào localStorage
    if (!token) {
      console.error("❌ Đăng nhập thành công nhưng không tìm thấy trường 'token' trong phản hồi của Backend!");
      setError(t('Lỗi hệ thống: Không tìm thấy token xác thực.', 'System error: Authentication token not found.'));
      return;
    }

    // Lưu thông tin vào localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);

    // Điều hướng phân quyền
    if (role === 'ADMIN') {
      setShowAdminChoice(true);
    } else {
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5001/api/auth/login', {
        email,
        password,
      });
      handleAuthSuccess(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 
        t('Đăng nhập thất bại. Vui lòng kiểm tra lại!', 'Login failed. Please check your credentials!')
      );
    } finally {
      setLoading(false);
    }
  };

  // Xử lý Google Sign In
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5001/api/auth/google', {
        credential: credentialResponse.credential,
      });
      handleAuthSuccess(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 
        t('Đăng nhập Google thất bại!', 'Google Sign-In failed!')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 transition-colors font-sans">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 sm:p-8 space-y-6 transition-colors">

        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={t('Quay về Trang chủ', 'Back to Home')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('Đăng Nhập', 'Log In')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Hệ thống Luyện tập & Chấm bài Tự động', 'Automated Practice & Grading System')}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* NÚT GOOGLE SIGN IN - Đã fix width="350" */}
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError(t('Đăng nhập Google thất bại!', 'Google Sign-In failed!'))}
            shape="circle"
            size="large"
            width="350"
            text="signin_with"
            useOneTap={false}
          />
        </div>

        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
          <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider absolute">
            {t('Hoặc', 'Or')}
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t('Email *', 'Email *')}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                {t('Mật khẩu *', 'Password *')}
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('Quên mật khẩu?', 'Forgot password?')}
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{t('Đăng nhập', 'Log In')}</span>}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
          {t('Chưa có tài khoản?', "Don't have an account?")}{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1">
            {t('Đăng ký ngay', 'Register now')}
          </Link>
        </p>
      </div>

      {showAdminChoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 transition-all">
          <div className="relative bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 text-center space-y-5">
            <button
              onClick={() => navigate('/')}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('Quay về Trang chủ', 'Back to Home')}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {t('Xin chào Quản trị viên!', 'Welcome Administrator!')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('Bạn muốn truy cập vào khu vực nào?', 'Which section would you like to access?')}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-2xs transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> {t('Bảng Quản Trị (Admin)', 'Admin Dashboard')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-between transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Home className="w-4 h-4" /> {t('Trang Chủ (Học viên)', 'Student Home')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;