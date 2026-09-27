import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Lock, Play, ArrowLeft, Loader2, Map, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const RoadmapDetail: React.FC = () => {
  const { t } = useLanguage() as any;
  const { id } = useParams<{ id: string }>();
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const res = await api.get(`/roadmaps/${id}`);
        if (res.data?.success) {
          setRoadmap(res.data.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu lộ trình:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRoadmap();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 transition-colors">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-2" />
        <span className="text-xs font-medium">{t('Đang tải tiến độ lộ trình...', 'Loading roadmap progress...')}</span>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 p-4 transition-colors font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-md shadow-2xl space-y-4">
          <Map className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto stroke-[1.5]" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('Lộ trình không tồn tại hoặc chưa được kích hoạt.', 'Roadmap does not exist or is not active.')}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Quay về Trang chủ', 'Back to Home')}</span>
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((roadmap.completedCount / roadmap.totalProblems) * 100) || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-12 transition-colors">
      {/* HEADER NAVIGATION */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Quay về Trang chủ', 'Back to Home')}</span>
          </Link>

          <span className="font-extrabold text-sm tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
            <Map className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('Lộ Trình Học Tập', 'Learning Roadmap')}</span>
          </span>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        
        {/* CARD TỔNG QUAN LỘ TRÌNH */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>{roadmap.title}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {roadmap.description}
            </p>
          </div>
          
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {t('Tiến độ hoàn thành', 'Completion Progress')}
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {roadmap.completedCount || 0} / {roadmap.totalProblems || 0} {t('Bài', 'Problems')} ({progressPercent}%)
              </span>
            </div>
            
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-xs" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* CÂY BÀI TẬP TUẦN TỰ */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            {t('Cây bài tập tuần tự', 'Sequential Problem Tree')}
          </h2>

          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
            {roadmap.problems?.map((problem: any, index: number) => {
              const isSolved = problem.status === 'COMPLETED';
              const isUnlocked = problem.status === 'UNLOCKED';
              const isLocked = problem.status === 'LOCKED';

              return (
                <div 
                  key={problem.id} 
                  className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* NODE PHÂN TRẠNG TRÊN ĐƯỜNG NỐI */}
                  <div className={`absolute -left-[37px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-xs ${
                    isSolved 
                      ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60' 
                      : isUnlocked 
                      ? 'bg-blue-600 dark:bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-950' 
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isSolved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isUnlocked ? (
                      index + 1
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {problem.title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold border ${
                        problem.difficulty === 'EASY' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' :
                        problem.difficulty === 'MEDIUM' 
                          ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' 
                          : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {isSolved && t('Đã hoàn thành', 'Completed')}
                      {isUnlocked && t('Sẵn sàng làm bài', 'Ready to solve')}
                      {isLocked && t('Cần hoàn thành bài trước để mở khóa', 'Complete previous problem to unlock')}
                    </p>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {isUnlocked || isSolved ? (
                      <Link 
                        to={`/problems/${problem.slug || problem.id}`} 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                      >
                        <span>{t('Làm bài', 'Solve')}</span>
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </Link>
                    ) : (
                      <button 
                        disabled 
                        className="px-3.5 py-2 bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed flex items-center space-x-1.5 border border-slate-200 dark:border-slate-800"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{t('Bị khóa', 'Locked')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoadmapDetail;