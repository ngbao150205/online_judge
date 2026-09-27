import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  BookOpen, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Layers, 
  AlertCircle, 
  Code2, 
  Search,
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  orderIndex: number;
}

interface Roadmap {
  id: string;
  title: string;
  description: string;
  totalProblems: number;
  problems: Problem[];
}

export const StudentRoadmaps: React.FC = () => {
  const { t } = useLanguage() as any;
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // STATE TÌM KIẾM & PHÂN TRANG
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);

  useEffect(() => {
    const fetchPublicRoadmaps = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get('/roadmaps');
        const data = res.data?.data || res.data || [];
        setRoadmaps(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Lỗi khi tải danh sách lộ trình:', err);
        setError(
          t(
            'Không thể tải danh sách lộ trình. Vui lòng thử lại sau.',
            'Unable to load roadmap list. Please try again later.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPublicRoadmaps();
  }, []);

  // TỰ ĐỘNG RESET VỀ TRANG 1 KHI TÌM KIẾM
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // DỮ LIỆU ĐÃ LỌC
  const filteredRoadmaps = roadmaps.filter((rm) =>
    rm.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rm.description && rm.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // TÍNH TOÁN PHÂN TRANG
  const totalPages = Math.ceil(filteredRoadmaps.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRoadmaps = filteredRoadmaps.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        <span className="text-xs font-medium">
          {t('Đang tải danh sách lộ trình học tập...', 'Loading learning roadmaps...')}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center space-y-3 font-sans">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
        <p className="text-xs font-bold text-rose-800 dark:text-rose-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 py-6 space-y-6 font-sans">
      {/* BANNER HEADER */}
      {/* DANH SÁCH LỘ TRÌNH & THANH TÌM KIẾM */}
      <div className="space-y-6 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>
              {t('Các Lộ Trình Hiện Có', 'Available Roadmaps')} ({filteredRoadmaps.length})
            </span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('Tìm kiếm lộ trình...', 'Search roadmaps...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 shadow-2xs transition-colors"
            />
          </div>
        </div>

        {currentRoadmaps.length > 0 ? (
          <>
            {/* GRID DANH SÁCH CARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {currentRoadmaps.map((roadmap) => (
                <div
                  key={roadmap.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all p-5 sm:p-6 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                        <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{roadmap.totalProblems} {t('Bài tập', 'Problems')}</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {roadmap.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {roadmap.description || t('Chưa có mô tả chi tiết cho lộ trình này.', 'No detailed description available for this roadmap.')}
                      </p>
                    </div>

                    {/* PREVIEW 3 BÀI TẬP ĐẦU TIÊN */}
                    {roadmap.problems && roadmap.problems.length > 0 && (
                      <div className="pt-3 space-y-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          {t('Các bài mở đầu:', 'Introductory problems:')}
                        </span>
                        <div className="space-y-1.5">
                          {roadmap.problems.slice(0, 3).map((p, idx) => (
                            <div key={p.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
                                {idx + 1}
                              </span>
                              <span className="truncate">{p.title}</span>
                            </div>
                          ))}
                          {roadmap.problems.length > 3 && (
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block pl-6">
                              {t('+ và', '+ and')} {roadmap.problems.length - 3} {t('bài tập khác...', 'other problems...')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                    <Link
                      to={`/roadmaps/${roadmap.id}`}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                    >
                      <span>{t('Khám Phá Lộ Trình', 'Explore Roadmap')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* BỘ PHÂN TRANG (PAGINATION) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 shadow-2xs w-full">
              <div className="flex items-center gap-2">
                <span>{t('Hiển thị', 'Show')}</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={18}>18</option>
                </select>
                <span>
                  {t('lộ trình/trang (Tổng ', 'roadmaps/page (Total ')}
                  <strong className="text-slate-800 dark:text-slate-200">{filteredRoadmaps.length}</strong>)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title={t('Trang kế tiếp', 'Next page')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 w-full">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t('Không tìm thấy lộ trình nào', 'No roadmaps found')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t('Thử thay đổi từ khóa tìm kiếm hoặc quay lại sau.', 'Try changing search keywords or come back later.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRoadmaps;