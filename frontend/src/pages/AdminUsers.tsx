import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  UserPlus,
  Search,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  X,
  Code2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface StudentItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count?: {
    submissions: number;
  };
}

// Cấu hình đường dẫn kết nối Backend Express
const API_BASE = 'http://localhost:5001/api/admin';

export const AdminUsers: React.FC = () => {
  const { t } = useLanguage();

  // State dữ liệu & API status
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pwd: '',
  });

  // 1. TẢI DANH SÁCH SINH VIÊN TỪ BACKEND
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('Không thể tải danh sách sinh viên.', 'Unable to load student list.'));
      }

      setStudents(result.data || []);
    } catch (err: any) {
      setError(err.message || t('Đã xảy ra lỗi khi kết nối với máy chủ.', 'Error connecting to server.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset về trang 1 khi gõ tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 2. THỐNG KÊ TỔNG QUAN
  const stats = useMemo(() => {
    const total = students.length;
    const totalSubmissions = students.reduce(
      (sum, s) => sum + (s._count?.submissions || 0),
      0
    );

    return { total, totalSubmissions };
  }, [students]);

  // 3. LỌC DỮ LIỆU LOCAL
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [students, searchTerm]);

  // Phân trang
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // 4. MỞ MODAL THÊM / SỬA
  const handleOpenModal = (student: StudentItem | null = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        email: student.email,
        pwd: '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        email: '',
        pwd: '',
      });
    }
    setIsModalOpen(true);
  };

  // 5. THÊM HOẶC CẬP NHẬT SINH VIÊN (GỌI API)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingStudent
        ? `${API_BASE}/users/${editingStudent.id}`
        : `${API_BASE}/users`;
      const method = editingStudent ? 'PUT' : 'POST';

      const payload: Record<string, string> = {
        name: formData.name,
        email: formData.email,
      };

      if (formData.pwd.trim()) {
        payload.password = formData.pwd;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('Thao tác thất bại.', 'Operation failed.'));
      }

      await fetchStudents();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || t('Lỗi khi gửi dữ liệu.', 'Error submitting data.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. XÓA SINH VIÊN (GỌI API)
  const handleDeleteStudent = async (id: string, email: string) => {
    if (
      !window.confirm(
        t(
          `CẢNH BÁO: Bạn có chắc muốn xóa vĩnh viễn sinh viên "${email}"?`,
          `WARNING: Are you sure you want to permanently delete student "${email}"?`
        )
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('Xóa sinh viên thất bại.', 'Failed to delete student.'));
      }

      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || t('Lỗi khi xóa sinh viên.', 'Error deleting student.'));
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 transition-colors">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{t('Quản Lý Sinh Viên', 'Student Management')} ({students.length})</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(
              'Quản lý danh sách tài khoản sinh viên và quá trình nộp bài trên hệ thống',
              'Manage student accounts and submission progress on the system'
            )}
          </p>
        </div>

        <button
          onClick={() => handleOpenModal(null)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('Thêm Sinh Viên Mới', 'Add New Student')}</span>
        </button>
      </div>

      {/* THỐNG KÊ TỔNG QUAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('Tổng số sinh viên', 'Total Students')}</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('Tổng lượt nộp bài', 'Total Submissions')}</span>
            <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">{stats.totalSubmissions}</div>
          </div>
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center border border-purple-100 dark:border-purple-900/50">
            <Code2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TÌM KIẾM */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('Tìm kiếm sinh viên theo Họ tên hoặc Email...', 'Search students by name or email...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl pl-9 pr-8 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 self-end sm:self-center">
          {t('Tìm thấy:', 'Found:')} <span className="text-blue-600 dark:text-blue-400">{filteredStudents.length}</span> {t('kết quả', 'results')}
        </div>
      </div>

      {/* THÔNG BÁO LỖI */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* BẢNG SINH VIÊN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">{t('Đang tải danh sách sinh viên...', 'Loading student list...')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">{t('Sinh viên', 'Student')}</th>
                  <th className="py-3 px-4">{t('Lượt nộp bài', 'Submissions')}</th>
                  <th className="py-3 px-4">{t('Ngày tham gia', 'Joined Date')}</th>
                  <th className="py-3 px-4 text-right">{t('Thao tác', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
                {currentStudents.length > 0 ? (
                  currentStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center border border-blue-100 dark:border-blue-900/50 text-xs shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{student.name}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{student.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                          <Code2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{student._count?.submissions ?? 0}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>{new Date(student.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(student)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                            title={t('Chỉnh sửa thông tin', 'Edit info')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteStudent(student.id, student.email)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                            title={t('Xóa tài khoản', 'Delete account')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 dark:text-slate-500 font-normal">
                      {t('Không tìm thấy sinh viên nào.', 'No students found.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PHÂN TRANG */}
        {!loading && filteredStudents.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 transition-colors">
            <div className="flex items-center gap-2">
              <span>{t('Hiển thị', 'Show')}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span>{t('sinh viên / trang', 'students / page')} ({t('Tổng', 'Total')} <strong>{filteredStudents.length}</strong>)</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={t('Trang trước', 'Previous page')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, array) => {
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-slate-400 dark:text-slate-600">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={t('Trang kế tiếp', 'Next page')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM / CHỈNH SỬA SINH VIÊN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{editingStudent ? t('Chỉnh Sửa Sinh Viên', 'Edit Student') : t('Thêm Sinh Viên Mới', 'Add New Student')}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">{t('Họ và tên *', 'Full Name *')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('Nguyễn Văn A', 'John Doe')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">{t('Địa chỉ Email *', 'Email Address *')}</label>
                <input
                  type="email"
                  required
                  placeholder={t('nguyenvana@student.edu.vn', 'student@example.com')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {editingStudent
                    ? t('Mật khẩu mới (Để trống nếu giữ nguyên)', 'New password (Leave blank to keep unchanged)')
                    : t('Mật khẩu *', 'Password *')}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required={!editingStudent}
                  value={formData.pwd}
                  onChange={(e) => setFormData({ ...formData, pwd: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              {/* Footer Modal */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  {t('Hủy bỏ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStudent ? t('Lưu Cập Nhật', 'Save Changes') : t('Tạo Mới', 'Create New')}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;