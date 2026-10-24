import { logout } from '../services/session';
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Code2, User, LogOut, LogIn, LayoutDashboard, Shield, Home, 
  Menu, X, BookOpen, Route, History, Trophy, Users, Settings,
  Sun, Moon, Globe, Terminal
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext'; // Import Language Context

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Hook Theme & Ngôn ngữ
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();

  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
  let isMounted = true;

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');

      const userData = res?.data?.data || res?.data;

      // 🟢 Chỉ cập nhật state nếu component vẫn còn mounted
      if (userData && isMounted) {
        setUser(userData);
      }
    } catch {
      if (isMounted) setUser(null);
    }
  };

  fetchCurrentUser();

  // 🟢 Hàm cleanup ngắt trạng thái khi component bị tháo gỡ (unmount)
  return () => {
    isMounted = false;
  };
}, []);

  const handleLogout = async () => {
    try { await logout(); } catch { alert('Không thể đăng xuất khỏi máy chủ. Vui lòng thử lại.'); return; }
    setUser(null);
    setIsProfileOpen(false);
    navigate('/');
  };

  const isAdmin = user?.role === 'ADMIN';
  const displayName = user ? user.name || user.fullName || user.username || user.email || 'User' : '';
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  const studentNavItems = [
    { path: '/', label: t('Trang chủ', 'Home'), icon: Home },
    { path: '/problems', label: t('Bài tập', 'Problems'), icon: BookOpen },
    { path: '/roadmaps', label: t('Lộ trình', 'Roadmaps'), icon: Route },
    { path: '/history', label: t('Lịch sử', 'History'), icon: History },
    { path: '/leaderboard', label: t('Bảng xếp hạng', 'Leaderboard'), icon: Trophy },
    { path: '/workspace/sandbox', label: t('Trình soạn thảo', 'Workspace'), icon: Terminal },
  ];

  const adminNavItems = [
    { path: '/admin/dashboard', label: t('Bảng Giám Sát', 'Dashboard'), icon: LayoutDashboard },
    { path: '/admin/problems', label: t('Ngân hàng Bài tập', 'Problems Bank'), icon: BookOpen },
    { path: '/admin/roadmaps', label: t('Quản lý Lộ trình', 'Roadmaps'), icon: Route },
    { path: '/admin/users', label: t('Người dùng', 'Users'), icon: Users },
    { path: '/admin/settings', label: t('Cấu hình', 'Settings'), icon: Settings },
  ];

  const currentNavItems = isAdminRoute ? adminNavItems : studentNavItems;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to={isAdminRoute ? '/admin/dashboard' : '/'} className="flex items-center space-x-2 font-bold text-lg text-slate-900 dark:text-white">
              <Code2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="font-extrabold tracking-wider uppercase">ONLINE JUDGE</span>
              {isAdminRoute && (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider ml-1">
                  Admin
                </span>
              )}
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 relative">
            {isAdmin && (
              isAdminRoute ? (
                <Link to="/" className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-all border border-slate-200 dark:border-slate-700">
                  <Home className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>{t('Sinh viên', 'Student UI')}</span>
                </Link>
              ) : (
                <Link to="/admin/dashboard" className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{t('Quản Trị', 'Admin UI')}</span>
                </Link>
              )
            )}

            {/* NÚT ĐỔI NGÔN NGỮ */}
            <button
              onClick={toggleLang}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="uppercase text-[11px] font-extrabold tracking-wider">{lang}</span>
            </button>

            {/* NÚT ĐỔI THEME */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* USER DROPDOWN */}
            {user ? (
              <>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-full transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase">
                    {userInitial}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                    {displayName}
                  </span>
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-3 z-50">
                      <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800 p-2 rounded-lg">
                        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                          {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                      </Link>

                      <div className="py-2 space-y-0.5">
                        <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{t('Trang cá nhân', 'Profile')}</span>
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer">
                          <LogOut className="w-4 h-4" />
                          <span>{t('Đăng xuất', 'Sign out')}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link to="/login" className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs">
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('Đăng nhập', 'Login')}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* BODY SIDEBAR + CONTENT */}
      <div className="flex-1 flex relative">
        <aside className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 flex flex-col z-30 shrink-0 ${isSidebarOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 overflow-hidden border-r-0'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {isAdminRoute ? t('Menu Quản Trị', 'Admin Menu') : t('Danh Mục Chính', 'Main Menu')}
            </span>
          </div>

          <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/70 dark:bg-blue-950/40'
                      : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
