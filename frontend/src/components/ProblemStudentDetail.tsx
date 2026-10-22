import { API_BASE_URL } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { 
  X, 
  Clock, 
  HardDrive, 
  Code2, 
  Play, 
  Layers, 
  Tag, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

interface TestCase {
  id: string;
  inputData: string;
  expectedOutput: string;
  orderIndex: number;
}

interface ProblemDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit: number;
  memoryLimit: number;
  categories: { category: { id: string; name: string } }[];
  testcases: TestCase[];
}

interface ProblemDetailModalProps {
  slug: string | null;
  isOpen: boolean;
  onClose: () => void;

  roadmapId?: string;
}

export const ProblemDetailModal: React.FC<ProblemDetailModalProps> = ({
  slug,
  isOpen,
  onClose,
  roadmapId,
}) => {
  const { t } = useLanguage() as any;
  const navigate = useNavigate();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = API_BASE_URL;

  useEffect(() => {
    if (!isOpen || !slug) return;

    const fetchProblemDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_BASE}/problems/${slug}`);
        const data = res.data?.data || res.data;
        setProblem(data);
      } catch (err: any) {
        console.error('Lỗi tải chi tiết bài tập:', err);
        setError(
          err.response?.data?.message || 
          t('Không thể tải thông tin bài tập này.', 'Unable to load details for this problem.')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProblemDetail();
  }, [isOpen, slug]);

  if (!isOpen) return null;

  const handleStartCoding = () => {
  if (!problem) return;

  onClose();

  navigate(
    `/workspace/${problem.slug}`,
    {
      state: {
        fromRoadmap: Boolean(roadmapId),
        roadmapId: roadmapId ?? null,
      },
    }
  );
};

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100 overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER MODAL */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 pr-4">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg line-clamp-1">
              {t('Chi Tiết Bài Tập', 'Problem Details')}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title={t('Đóng', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm leading-relaxed">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-xs font-medium">{t('Đang tải thông tin đề bài...', 'Loading problem details...')}</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          ) : problem ? (
            <>
              {/* Tên bài tập & Độ khó */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{problem.title}</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">Slug: {problem.slug}</p>
                </div>
                <span
                  className={`self-start sm:self-auto px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                    problem.difficulty === 'EASY'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/50'
                      : problem.difficulty === 'MEDIUM'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/50'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/50'
                  }`}
                >
                  {problem.difficulty}
                </span>
              </div>

              {/* Giới hạn Kỹ thuật & Danh mục */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{t('Thời gian', 'Time Limit')}</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{problem.timeLimit} ms</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{t('Bộ nhớ', 'Memory Limit')}</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{problem.memoryLimit} MB</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{t('Danh mục', 'Categories')}</div>
                    <div className="flex items-center gap-1 overflow-hidden mt-0.5">
                      {problem.categories && problem.categories.length > 0 ? (
                        problem.categories.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-800 truncate">
                            {c.category?.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">{t('Chưa phân loại', 'Uncategorized')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mô tả chi tiết đề bài */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('Mô tả đề bài', 'Problem Description')}
                </h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                  {problem.description}
                </div>
              </div>

              {/* Testcase mẫu */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{t('Ví dụ minh họa (Testcase mẫu)', 'Sample Testcases')}</span>
                </h4>

                {problem.testcases && problem.testcases.length > 0 ? (
                  <div className="space-y-3">
                    {problem.testcases.map((tc, idx) => (
                      <div key={tc.id || idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          {t('Ví dụ #', 'Example #')}{idx + 1}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">Input:</span>
                            <pre className="p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-mono overflow-x-auto">
                              {tc.inputData || t('(Trống)', '(Empty)')}
                            </pre>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">Expected Output:</span>
                            <pre className="p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto">
                              {tc.expectedOutput || t('(Trống)', '(Empty)')}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic">
                    {t('Bài tập này chưa cập nhật ví dụ minh họa.', 'No sample testcases available for this problem.')}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* FOOTER MODAL - NÚT THAO TÁC */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors"
          >
            {t('Đóng', 'Close')}
          </button>
          
          <button
            type="button"
            disabled={loading || !problem}
            onClick={handleStartCoding}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('Làm Bài Ngay', 'Start Coding')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProblemDetailModal;