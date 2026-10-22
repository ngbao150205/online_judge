import { logout } from '../services/session';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  ArrowLeft, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Key,
  LogOut,
  Lock,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Profile: React.FC = () => {
  const { t, language } = useLanguage() as any;
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form chỉnh sửa thông tin cá nhân
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  // Modal & Form Đổi mật khẩu
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Thông báo phản hồi (Thành công / Lỗi)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await api.get('/auth/me');

        const userData = res?.data?.data || res?.data;
        if (userData) {
          setUser(userData);
          setFormData({
            name: userData.name || userData.fullName || '',
            email: userData.email || '',
          });
        }
      } catch (err: any) {
        console.error('Lỗi khi tải thông tin profile:', err);
        if (err?.response?.status === 401) navigate('/login');
        setStatusMsg({
          type: 'error',
          text: 'FETCH_ERROR',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // Xử lý Cập nhật Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await api.put('/auth/me', { name: formData.name });

      const updatedUser = res?.data?.data || res?.data;
      setUser((prev: any) => ({ ...prev, ...updatedUser, name: formData.name }));
      
      setStatusMsg({
        type: 'success',
        text: 'UPDATE_SUCCESS',
      });
    } catch (err: any) {
      console.error('Lỗi cập nhật:', err);
      setStatusMsg({
        type: 'error',
        text: err?.response?.data?.message || 'UPDATE_ERROR',
      });
    } finally {
      setSaving(false);
    }
  };

  // Xử lý Đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setStatusMsg(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setModalError(t('Mật khẩu mới và xác nhận mật khẩu không khớp!', 'New password and confirm password do not match!'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setModalError(t('Mật khẩu mới phải chứa ít nhất 6 ký tự!', 'New password must be at least 6 characters long!'));
      return;
    }

    setChangingPassword(true);
    try {
      await api.put(
        '/auth/change-password',
        {
          oldPassword: passwordData.currentPassword,
          currentPassword: passwordData.currentPassword,
          password: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        },
      );

      navigate('/login');
      setIsPasswordModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Lỗi đổi mật khẩu:', err);
      const serverMessage = 
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        t('Mật khẩu hiện tại không chính xác hoặc dữ liệu không hợp lệ.', 'Incorrect current password or invalid data.');
      setModalError(serverMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  // Xử lý Đăng xuất
  const handleLogout = async () => {
    try { await logout(); } catch { alert('Không thể đăng xuất khỏi máy chủ. Vui lòng thử lại.'); return; }
    navigate('/login');
  };

  // Render text thông báo động theo ngôn ngữ hiện tại
  const renderStatusText = (text: string) => {
    switch (text) {
      case 'FETCH_ERROR':
        return t('Không thể tải thông tin cá nhân. Vui lòng thử lại sau!', 'Failed to load profile. Please try again later!');
      case 'UPDATE_SUCCESS':
        return t('Cập nhật thông tin cá nhân thành công!', 'Profile updated successfully!');
      case 'UPDATE_ERROR':
        return t('Có lỗi xảy ra khi lưu thông tin.', 'An error occurred while saving profile.');
      case 'CHANGE_PWD_SUCCESS':
        return t('Đổi mật khẩu thành công!', 'Password changed successfully!');
      default:
        return text;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-2" />
        <span className="text-xs font-medium">{t('Đang tải thông tin cá nhân...', 'Loading profile...')}</span>
      </div>
    );
  }

  const displayName = user?.name || user?.fullName || user?.username || 'User';
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-12 transition-colors">
      {/* HEADER TRANG PROFILE */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Quay lại trang chủ', 'Back to Home')}</span>
          </Link>

          <span className="font-extrabold text-sm tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('Thông Tin Cá Nhân', 'User Profile')}</span>
          </span>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-3xl mx-auto px-6 mt-8 space-y-6">
        {/* Banner Profile Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-colors">
          <div className="w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-3xl font-extrabold text-white uppercase shadow-md ring-4 ring-blue-100 dark:ring-blue-950 shrink-0">
            {userInitial}
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{displayName}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user?.email || t('Chưa cập nhật email', 'Email not updated')}
            </p>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                <Shield className="w-3 h-3 mr-1" />
                {user?.role || 'STUDENT'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <Calendar className="w-3 h-3 mr-1" />
                {t('Tham gia', 'Joined')}: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN') : t('Mới tham gia', 'Recently joined')}
              </span>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl flex items-center space-x-3 text-xs font-medium border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{renderStatusText(statusMsg.text)}</span>
          </div>
        )}

        {/* Form Chỉnh sửa thông tin */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6 transition-colors">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            {t('Chi Tiết Tài Khoản', 'Account Details')}
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {t('Họ và tên *', 'Full Name *')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('Nhập họ và tên của bạn', 'Enter your full name')}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {t('Địa chỉ Email (Chỉ đọc)', 'Email Address (Read-only)')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? t('Đang lưu...', 'Saving...') : t('Lưu thay đổi', 'Save Changes')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Thiết lập bổ sung & Đăng xuất */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4 transition-colors">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            {t('Bảo Mật & Tài Khoản', 'Security & Account')}
          </h2>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('Mật khẩu', 'Password')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Đổi mật khẩu để bảo vệ tài khoản cá nhân', 'Change password to secure your account')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setModalError(null);
                setIsPasswordModalOpen(true);
              }}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:border-blue-200 dark:hover:border-blue-900/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {t('Đổi mật khẩu', 'Change Password')}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('Đăng xuất khỏi thiết bị', 'Log out from device')}</span>
            </button>
          </div>
        </div>
      </main>

      {/* MODAL ĐỔI MẬT KHẨU */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t('Đổi Mật Khẩu', 'Change Password')}</span>
              </h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4 text-xs">
              {/* Thông báo lỗi trong Modal */}
              {modalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('Mật khẩu hiện tại *', 'Current Password *')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    placeholder={t('Nhập mật khẩu hiện tại', 'Enter current password')}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-3 pr-9 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('Mật khẩu mới *', 'New Password *')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder={t('Nhập mật khẩu mới (tối thiểu 6 ký tự)', 'Enter new password (min 6 characters)')}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-3 pr-9 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  placeholder={t('Nhập lại mật khẩu mới', 'Re-enter new password')}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Footer Modal */}
              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {t('Hủy bỏ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {changingPassword
                      ? t('Đang cập nhật...', 'Updating...')
                      : t('Cập Nhật Mật Khẩu', 'Update Password')}
                  </span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
