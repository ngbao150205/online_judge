import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  FileCode2, 
  Loader2, 
  Search, 
  Code2, 
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {useLocation } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// Modal xem chi tiết đề bài
import { ProblemDetailModal } from '../components/ProblemStudentDetail';

interface StudentProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  isSolved: boolean;

  categories: {
    category: {
      id: string;
      name: string;
    } | null;
  }[];
}

export const StudentProblem: React.FC = () => {
  const { t } = useLanguage() as any;
  const location = useLocation();
  const [problems, setProblems] = useState<StudentProblem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({ solvedCount: 0, totalProblems: 0, totalSubmissions: 0 });
  const [loading, setLoading] = useState(true);

  // Bộ lọc bài tập
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  // STATE PHÂN TRANG (PAGINATION)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // State điều khiển Modal chi tiết bài tập
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [resCat, resProblems] = await Promise.all([
          api.get('/categories').catch(() => null),
          api.get('/problems?limit=100').catch(() => null),
        ]);

        if (resCat?.data) {
          const rawCategories = resCat.data.data || resCat.data.categories || resCat.data;
          setCategories(Array.isArray(rawCategories) ? rawCategories : []);
        }

        if (resProblems?.data) {
          const payload = resProblems.data.data || resProblems.data;
          const probList = Array.isArray(payload) ? payload : payload.problems || [];
          setProblems(probList);
          
          const solved =
          probList.filter(
            (p: StudentProblem) => p.isSolved
          ).length;
          setStats({
            solvedCount: solved,
            totalProblems: probList.length,
            totalSubmissions: 0,
          });
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách bài tập:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // TỰ ĐỘNG RESET VỀ TRANG 1 KHI THAY ĐỔI BỘ LỌC HOẶC TÌM KIẾM
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedDifficulty]);

  // Hàm mở Modal xem chi tiết
  const handleOpenDetailModal = (slug: string) => {
    setSelectedSlug(slug);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    const state = location.state as { openDetailSlug?: string };
    if (state?.openDetailSlug) {
      handleOpenDetailModal(state.openDetailSlug);
      
      // Xóa state trong lịch sử duyệt để tránh lặp lại popup khi F5
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // DỮ LIỆU ĐÃ QUA BỘ LỌC
  const filteredProblems = problems.filter((p) => {
    const matchSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryNames =
    p.categories
      ?.map(item => item.category?.name)
      .filter(Boolean) || [];

    const matchCategory = selectedCategory === 'ALL' || categoryNames.includes(selectedCategory);
    const matchDifficulty = selectedDifficulty === 'ALL' || p.difficulty === selectedDifficulty;

    return matchSearch && matchCategory && matchDifficulty;
  });

  // TÍNH TOÁN PHÂN TRANG
  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProblems = filteredProblems.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-2" />
        <span className="text-xs font-medium">{t('Đang tải danh sách bài tập...', 'Loading problem list...')}</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen p-4 sm:p-6 space-y-6 transition-colors duration-200 font-sans">
      {/* 1. THỐNG KÊ TỔNG QUAN */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center space-x-4 shadow-2xs transition-colors">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.solvedCount} / {stats.totalProblems || problems.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('Bài tập đã giải thành công', 'Successfully solved problems')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center space-x-4 shadow-2xs transition-colors">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <FileCode2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{problems.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('Bài tập khả dụng', 'Available problems')}
            </div>
          </div>
        </div>
      </section>

      {/* 2. BÀI TẬP TỰ DO */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{t('Ngân hàng bài tập tự do', 'Problem Bank')}</span>
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('Tìm bài tập...', 'Search problems...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            >
              <option value="ALL">{t('Tất cả danh mục', 'All Categories')}</option>
              {categories.map((cat: any) => (
                <option key={cat.id || cat.name} value={cat.name || cat}>
                  {cat.name || cat}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            >
              <option value="ALL">{t('Mọi độ khó', 'All Difficulties')}</option>
              <option value="EASY">{t('Dễ (EASY)', 'Easy (EASY)')}</option>
              <option value="MEDIUM">{t('Trung bình (MEDIUM)', 'Medium (MEDIUM)')}</option>
              <option value="HARD">{t('Khó (HARD)', 'Hard (HARD)')}</option>
            </select>
          </div>
        </div>

        {/* BẢNG BÀI TẬP */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden w-full transition-colors">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 w-28">{t('Trạng thái', 'Status')}</th>
                <th className="py-3 px-4">{t('Tên bài tập', 'Problem Title')}</th>
                <th className="py-3 px-4">{t('Danh mục', 'Categories')}</th>
                <th className="py-3 px-4">{t('Độ khó', 'Difficulty')}</th>
                <th className="py-3 px-4 text-right">{t('Thao tác', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {currentProblems.length > 0 ? (
                currentProblems.map((problem) => {
                  const targetSlug = problem.slug || problem.id;

                  return (
                    <tr key={problem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        {problem.isSolved ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {t('Đã giải', 'Solved')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-normal">
                          --
                        </span>
                      )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <button
                          onClick={() => handleOpenDetailModal(targetSlug)}
                          className="hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors"
                        >
                          {problem.title}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {(() => {
                          if (Array.isArray(problem.categories) && problem.categories.length > 0) {
                            const names = problem.categories
                              .map((item: any) => item.category?.name || item.name)
                              .filter(Boolean);
                            if (names.length > 0) return names.join(', ');
                          }
                          return (
                            <span className="text-slate-400 dark:text-slate-500 italic">
                              {t('Chưa phân loại', 'Uncategorized')}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          problem.difficulty === 'EASY' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/50' :
                          problem.difficulty === 'MEDIUM' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/50' : 
                          'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/50'
                        }`}>
                          {problem.difficulty}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetailModal(targetSlug)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                            title={t('Xem chi tiết đề bài trong Popup', 'View details in modal')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('Chi tiết', 'Details')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500">
                    {t('Chưa có dữ liệu bài tập trong Database hoặc không khớp bộ lọc.', 'No problem data available or matching filters.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* KHU VỰC PHÂN TRANG (PAGINATION CONTROLS) */}
          {filteredProblems.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>{t('Hiển thị', 'Show')}</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  {t('bài/trang (Tổng ', 'per page (Total ')}
                  <strong className="text-slate-900 dark:text-white">{filteredProblems.length}</strong>
                  {t(' bài tập)', ' problems)')}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                          className={`px-3 py-1 rounded-lg font-bold border transition-colors ${
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={t('Trang kế tiếp', 'Next page')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MODAL CHI TIẾT BÀI TẬP */}
     <ProblemDetailModal
        isOpen={isDetailModalOpen}
        slug={selectedSlug}
        onClose={() => setIsDetailModalOpen(false)}
      /> 
    </div>
  );
};

export default StudentProblem;