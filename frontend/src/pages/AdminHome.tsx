import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Send, 
  Server, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Route,
  Database,
  CheckCircle2,
  Info
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

interface SystemStats {
  totalStudents: number;
  totalProblems: number;
  totalRoadmaps: number;
  submissionsToday: number;
  activeWorkers: number;
  totalWorkers: number;
}

interface SubmissionFeed {
  id: string;
  user: string;
  problem: string;
  lang: string;
  result: string;
  cpu: string;
  time: string;
}

interface WorkerNode {
  id: string;
  name: string;
  status: 'IDLE' | 'BUSY' | 'OFFLINE';
  cpuUsage: number | null;
  ramUsage: string;
}

interface SystemAlert {
  id: string;
  type: 'WARNING' | 'INFO' | 'DANGER';
  title: string;
  message: string;
}

export const AdminHome: React.FC = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    totalProblems: 0,
    totalRoadmaps: 0,
    submissionsToday: 0,
    activeWorkers: 0,
    totalWorkers: 0,
  });

  const [liveFeed, setLiveFeed] = useState<SubmissionFeed[]>([]);
  const [workers, setWorkers] = useState<WorkerNode[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [resultBreakdown, setResultBreakdown] = useState({
    acPercent: 0, acCount: 0,
    waPercent: 0, waCount: 0,
    tlePercent: 0, tleCount: 0,
    cePercent: 0, ceCount: 0,
    otherPercent: 0, otherCount: 0,
    storageUsedGb: 0,
    storageTotalGb: null as number | null,
  });

  // Tải dữ liệu từ Database
  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const API_BASE = `${API_BASE_URL}/admin`;

      const [statsRes, feedRes, workersRes, alertsRes, analyticsRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/stats`),
        axios.get(`${API_BASE}/submissions/live`),
        axios.get(`${API_BASE}/workers`),
        axios.get(`${API_BASE}/alerts`),
        axios.get(`${API_BASE}/analytics`),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        const data = statsRes.value.data.data || statsRes.value.data;
        setStats({
          totalStudents: data.totalStudents || 0,
          totalProblems: data.totalProblems || 0,
          totalRoadmaps: data.totalRoadmaps || 0,
          submissionsToday: data.submissionsToday || 0,
          activeWorkers: data.activeWorkers || 0,
          totalWorkers: data.totalWorkers || 0,
        });
      }

      if (feedRes.status === 'fulfilled' && feedRes.value.data) {
        setLiveFeed(feedRes.value.data.data || feedRes.value.data);
      }
      if (workersRes.status === 'fulfilled' && workersRes.value.data) {
        setWorkers(workersRes.value.data.data || workersRes.value.data);
      }
      if (alertsRes.status === 'fulfilled' && alertsRes.value.data) {
        setAlerts(alertsRes.value.data.data || alertsRes.value.data);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data) {
        setResultBreakdown(analyticsRes.value.data.data || analyticsRes.value.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu từ Database:', error);
    } finally {
      setLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 transition-colors">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('Bảng Giám Sát Vận Hành Hệ Thống', 'System Monitoring Dashboard')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(
              'Tổng quan về số lượng học viên, bài tập, lộ trình và trạng thái hạ tầng chấm bài',
              'Overview of students, problems, roadmaps, and grading infrastructure status'
            )}
          </p>
        </div>
        <div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            title={t('Làm mới dữ liệu', 'Refresh data')}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
            <span>{t('Làm mới', 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* 5 STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Học viên */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex justify-between items-start transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('Học sinh / Sinh viên', 'Students')}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {loading ? '...' : stats.totalStudents.toLocaleString()}
            </h3>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Ngân hàng Bài tập */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex justify-between items-start transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('Ngân hàng Bài tập', 'Problems Bank')}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {loading ? '...' : stats.totalProblems.toLocaleString()}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Lộ trình Học tập */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex justify-between items-start transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('Lộ trình Học tập', 'Learning Roadmaps')}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {loading ? '...' : stats.totalRoadmaps.toLocaleString()}
            </h3>
          </div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100 dark:border-purple-900/40">
            <Route className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Lượt nộp hôm nay */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex justify-between items-start transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('Lượt nộp hôm nay', 'Submissions Today')}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {loading ? '...' : stats.submissionsToday.toLocaleString()}
            </h3>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/40">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Worker Nodes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex justify-between items-start transition-colors">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('Cụm Workers', 'Worker Cluster')}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {loading ? '...' : `${stats.activeWorkers} / ${stats.totalWorkers}`}{' '}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Nodes</span>
            </h3>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <Server className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FEED & ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lượt Nộp Bài Mới Nhất */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 transition-colors">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('Lượt Nộp Bài Mới Nhất', 'Live Submissions Feed')}</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-2.5 rounded-l-lg">{t('ID Nộp', 'Sub ID')}</th>
                  <th className="p-2.5">{t('Thực hiện bởi', 'User')}</th>
                  <th className="p-2.5">{t('Mã bài', 'Problem')}</th>
                  <th className="p-2.5">{t('Ngôn ngữ', 'Language')}</th>
                  <th className="p-2.5">{t('Kết quả', 'Result')}</th>
                  <th className="p-2.5">{t('Thời gian chạy', 'Wall time')}</th>
                  <th className="p-2.5 rounded-r-lg">{t('Thời gian', 'Time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {liveFeed.length > 0 ? (
                  liveFeed.map((sub, i) => (
                    <tr key={sub.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 text-slate-400 dark:text-slate-500 font-mono text-[11px]">{sub.id}</td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{sub.user}</td>
                      <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{sub.problem}</td>
                      <td className="p-2.5 text-slate-500 dark:text-slate-400">{sub.lang}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-block ${
                          sub.result === 'ACCEPTED' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50' :
                          sub.result === 'WRONG_ANSWER' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50' :
                          sub.result === 'TIME_LIMIT_EXCEEDED' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {sub.result}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">{sub.cpu}</td>
                      <td className="p-2.5 text-slate-400 dark:text-slate-500 font-mono text-[11px]">{sub.time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 dark:text-slate-500">
                      {loading ? t('Đang tải dữ liệu...', 'Loading data...') : t('Chưa có lượt nộp bài mới.', 'No new submissions.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phân Bổ Kết Quả Chấm Bài */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('Phân Bổ Kết Quả Chấm Bài', 'Grading Result Distribution')}</span>
          </h2>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-emerald-600 dark:text-emerald-400">Accepted (AC)</span>
                <span className="text-slate-700 dark:text-slate-300">{resultBreakdown.acPercent}% ({resultBreakdown.acCount})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${resultBreakdown.acPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-rose-600 dark:text-rose-400">Wrong Answer (WA)</span>
                <span className="text-slate-700 dark:text-slate-300">{resultBreakdown.waPercent}% ({resultBreakdown.waCount})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${resultBreakdown.waPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-amber-600 dark:text-amber-400">Time Limit Exceeded (TLE)</span>
                <span className="text-slate-700 dark:text-slate-300">{resultBreakdown.tlePercent}% ({resultBreakdown.tleCount})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${resultBreakdown.tlePercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500 dark:text-slate-400">Compile Error (CE)</span>
                <span className="text-slate-700 dark:text-slate-300">{resultBreakdown.cePercent}% ({resultBreakdown.ceCount})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-400 dark:bg-slate-500 h-full rounded-full transition-all duration-500" style={{ width: `${resultBreakdown.cePercent}%` }}></div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>{t('Lỗi khác (RE / MLE / hệ thống)', 'Other results (RE / MLE / system)')}</span>
              <span>{resultBreakdown.otherPercent}% ({resultBreakdown.otherCount})</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-violet-500 h-full" style={{ width: `${resultBreakdown.otherPercent}%` }} />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" /> {t('Dung lượng Database:', 'Database Storage:')}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {resultBreakdown.storageUsedGb.toFixed(3)} GiB{resultBreakdown.storageTotalGb !== null ? ` / ${resultBreakdown.storageTotalGb} GiB` : ''}
            </span>
          </div>
        </div>

      </div>

      {/* WORKERS & ALERTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Workers Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 transition-colors">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t('Trạng Thái Sandbox Worker Nodes', 'Sandbox Worker Nodes Status')}</span>
            </h2>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/50">
              {workers.filter(w => w.status !== 'OFFLINE').length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workers.map((node) => (
              <div key={node.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-2 transition-colors">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-900 dark:text-slate-100">{node.name}</span>
                  <span className={`text-[11px] flex items-center gap-1 font-semibold ${
                    node.status === 'IDLE' ? 'text-emerald-600 dark:text-emerald-400' : 
                    node.status === 'BUSY' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    <span className="text-xs">●</span> {node.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between font-mono pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                  <span>{t('Tải CPU', 'CPU Load')}: {node.cpuUsage === null ? t('Chưa đo', 'Unavailable') : `${node.cpuUsage}%`}</span>
                  <span>RAM: {node.ramUsage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Alerts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>{t('Cảnh Báo Vận Hành Hệ Thống', 'System Operational Alerts')}</span>
          </h2>

          <div className="space-y-2.5 text-xs">
            {alerts.length > 0 ? (
              alerts.map((item) => {
                const isWarning = item.type === 'WARNING';
                const isDanger = item.type === 'DANGER';

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl flex items-start gap-2.5 border transition-colors ${
                      isDanger
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                        : isWarning
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {isDanger || isWarning ? (
                      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">{item.title}:</span> {item.message}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 dark:text-slate-500 text-center py-6">
                {t('Không có cảnh báo vận hành nào.', 'No operational alerts.')}
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminHome;
