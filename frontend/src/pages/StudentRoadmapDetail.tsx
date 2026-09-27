import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import ProblemDetailModal from '../components/ProblemStudentDetail';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  Play, 
  RotateCcw, 
  Trophy, 
  BookOpen, 
  Loader2, 
  AlertCircle, 
  Sparkles 
} from 'lucide-react';

interface Problem {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string;
  orderIndex: number;
  isSolved?: boolean;
}

interface RoadmapDetail {
  id: string;
  title: string;
  description: string;
  problems: Problem[];
}

export const StudentRoadmapDetail: React.FC = () => {
  const { t } = useLanguage() as any;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState<RoadmapDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchRoadmapDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/roadmaps/${id}`);
        const data = res.data?.data || res.data;

        setRoadmap(data);
        console.log("ROADMAP DETAIL RESPONSE:", data);
      } catch (err: any) {
        console.error('Lỗi khi tải chi tiết lộ trình:', err);
        setError(
          t(
            'Không thể tải lộ trình học tập này hoặc bạn chưa đăng nhập.',
            'Unable to load this learning roadmap or you are not logged in.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmapDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        <span className="text-xs font-medium">
          {t('Đang tải dữ liệu lộ trình...', 'Loading roadmap data...')}
        </span>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center space-y-4 font-sans">
        <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
        <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
          {error || t('Không tìm thấy dữ liệu lộ trình.', 'Roadmap data not found.')}
        </p>
        <button
          onClick={() => navigate('/roadmaps')}
          className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          {t('Quay lại danh sách lộ trình', 'Back to roadmap list')}
        </button>
      </div>
    );
  }

  // TÍNH TOÁN TIẾN ĐỘ VÀ TRẠNG THÁI KHÓA/MỞ KHÓA TUẦN TỰ
  const problemsList = (roadmap.problems || []).sort((a, b) => a.orderIndex - b.orderIndex);
  
  let previousCompleted = true; // Bài đầu tiên luôn được mở khóa
  const processedProblems = problemsList.map((problem, index) => {
    const isSolved = Boolean(problem.isSolved);
    // Bài hiện tại unlocked nếu là bài đầu tiên HOẶC bài trước đó đã hoàn thành
    const isUnlocked = index === 0 || previousCompleted;
    previousCompleted = isSolved;

    return {
      ...problem,
      isSolved,
      isUnlocked,
    };
  });

  const completedCount = processedProblems.filter((p) => p.isSolved).length;
  const totalCount = processedProblems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Render Badge độ khó
  const renderDifficultyBadge = (difficulty: string) => {
    const diffUpper = (difficulty || '').toUpperCase();
    if (diffUpper === 'EASY') {
      return (
        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded border border-emerald-200/60 dark:border-emerald-900/50">
          {t('Dễ', 'Easy')}
        </span>
      );
    }
    if (diffUpper === 'HARD') {
      return (
        <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold rounded border border-rose-200/60 dark:border-rose-900/50">
          {t('Khó', 'Hard')}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded border border-amber-200/60 dark:border-amber-900/50">
        {t('Trung bình', 'Medium')}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      {/* NÚT BACK */}
      <Link
        to="/roadmaps"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('Quay lại danh sách Lộ trình', 'Back to Roadmap List')}</span>
      </Link>

      {/* HEADER & THANH TIẾN ĐỘ (PROGRESS CARD) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-200/60 dark:border-blue-900/50">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {t('Lộ trình đang thực hiện', 'In-progress Roadmap')}
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{roadmap.title}</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {roadmap.description || t('Chưa có thông tin mô tả chi tiết cho lộ trình này.', 'No detailed description available for this roadmap.')}
            </p>
          </div>

          {/* KHU VỰC TIẾN ĐỘ HỌC TẬP */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 min-w-[220px] text-center space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>{t('Tiến độ', 'Progress')}</span>
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {completedCount} / {totalCount} {t('Bài', 'Problems')}
              </span>
            </div>

            {/* Thanh Progress */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 text-right">
              {progressPercent}% {t('Hoàn thành', 'Completed')}
            </p>
          </div>
        </div>
      </div>

      {/* DANH SÁCH BÀI TẬP (TIMELINE STEPS) */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>{t('Danh Sách Thử Thách Mở Khóa Tuần Tự', 'Sequential Unlock Challenges')}</span>
        </h2>

        <div className="space-y-3 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:z-0">
          {processedProblems.map((prob, idx) => {
            return (
              <div
                key={prob.id || prob._id || idx}
                className={`relative z-10 rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  prob.isSolved
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                    : prob.isUnlocked
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md'
                    : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 opacity-60 dark:opacity-50'
                }`}
              >
                {/* THÔNG TIN BÀI TẬP */}
                <div className="flex items-start gap-4">
                  {/* ICON TRẠNG THÁI */}
                  <div className="mt-0.5 shrink-0">
                    {prob.isSolved ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : prob.isUnlocked ? (
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                        {idx + 1}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        {t('Bài', 'Problem')} {idx + 1}
                      </span>
                      {renderDifficultyBadge(prob.difficulty)}
                    </div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">{prob.title}</h3>
                  </div>
                </div>

                {/* HÀNH ĐỘNG (ACTION BUTTON) */}
                <div className="shrink-0 flex items-center justify-end">
                {prob.isSolved ? (
                  <button
                    onClick={() =>
                      navigate(
                        `/workspace/${prob.slug || prob.id}`,
                        {
                          state: {
                            fromRoadmap: true,
                            roadmapId: roadmap.id,
                          },
                        }
                      )
                    }
                    className="px-4 py-2 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {t('Làm lại bài', 'Retry Problem')}
                    </span>
                  </button>

                ) : prob.isUnlocked ? (

                    <button
                      onClick={() => {
                        setSelectedSlug(prob.slug);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2"
                    >
                      <BookOpen className="w-3.5 h-3.5" />

                      <span>
                        {t('Xem chi tiết', 'View Details')}
                      </span>

                    </button>

                  ) : (

                  <div className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-not-allowed border border-slate-300/50 dark:border-slate-700">
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {t('Khóa bài này', 'Locked')}
                    </span>
                  </div>

                )}
              </div>
              </div>
            );
          })}
        </div>
      </div>
      <ProblemDetailModal
        isOpen={isDetailModalOpen}
        slug={selectedSlug}
        onClose={() => setIsDetailModalOpen(false)}
        roadmapId={roadmap.id}
      />
    </div>
  );
};

export default StudentRoadmapDetail;