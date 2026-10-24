import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, X } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../services/api';

type PlaygroundRun = {
  id: string;
  problemTitle: string | null;
  language: string;
  status: string;
  executionTime: number | null;
  memoryUsed: number | null;
  createdAt: string;
  completedAt: string | null;
  sourceCode?: string;
  customInput?: string;
  output?: string | null;
  error?: string | null;
  cpuTime?: number | null;
  compileTime?: number | null;
};

const pageSize = 10;
const pendingStatuses = new Set(['PENDING', 'RUNNING', 'IN_PROGRESS']);

function isPending(status: string) {
  return pendingStatuses.has(status);
}

function statusLabel(status: string, t: (vi: string, en: string) => string) {
  const labels: Record<string, string> = {
    PENDING: t('Đang chờ', 'Pending'),
    RUNNING: t('Đang chạy', 'Running'),
    RUN_SUCCESS: t('Thành công', 'Success'),
    CE: t('Lỗi biên dịch', 'Compile error'),
    RE: t('Lỗi thực thi', 'Runtime error'),
    TLE: t('Quá thời gian', 'Time limit exceeded'),
    MLE: t('Vượt bộ nhớ', 'Memory limit exceeded'),
    SYSTEM_ERROR: t('Lỗi hệ thống', 'System error'),
  };
  return labels[status] || status;
}

function statusClass(status: string) {
  if (status === 'RUN_SUCCESS') return 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50';
  if (isPending(status)) return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50';
  return 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50';
}

export default function PlaygroundHistory() {
  const { t } = useLanguage() as { t: (vi: string, en: string) => string };
  const [items, setItems] = useState<PlaygroundRun[]>([]);
  const [detail, setDetail] = useState<PlaygroundRun | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const base = API_BASE_URL.replace(/\/$/, '');

    async function request<T>(path: string): Promise<T> {
      const response = await apiFetch(`${base}${path}`, { signal: controller.signal });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'Không thể tải dữ liệu');
      return body as T;
    }

    async function load(firstLoad: boolean) {
      if (firstLoad) setLoading(true);
      try {
        const [history, selected] = await Promise.all([
          request<{ data: PlaygroundRun[]; pagination: { totalPages: number } }>(`/submissions/playground-history?page=${page}`),
          selectedId
            ? request<{ data: PlaygroundRun }>(`/submissions/playground-history/${encodeURIComponent(selectedId)}`)
            : Promise.resolve(null),
        ]);
        if (stopped) return;
        setItems(history.data);
        setTotalPages(history.pagination.totalPages);
        setDetail(selected?.data ?? null);
        setError('');
        if (history.data.some(run => isPending(run.status)) || (selected && isPending(selected.data.status))) {
          timer = setTimeout(() => { void load(false); }, 2000);
        }
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : 'Không thể tải lịch sử chạy.');
      } finally {
        if (!stopped) setLoading(false);
      }
    }

    void load(true);
    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [page, selectedId, refreshKey]);

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t('Lịch sử Playground', 'Playground history')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('Các lần chạy với stdin riêng được lưu trong tài khoản của bạn.', 'Runs with custom stdin are saved to your account.')}</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setRefreshKey(value => value + 1)} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('Làm mới', 'Refresh')}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">{t('Đang tải lịch sử...', 'Loading history...')}</p>}
      {!loading && !error && items.length === 0 && <p className="text-sm text-slate-500">{t('Chưa có lượt chạy Playground nào.', 'No Playground runs yet.')}</p>}

      {items.length > 0 && <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-500">
            {[t('Ngữ cảnh', 'Context'), t('Ngôn ngữ', 'Language'), t('Trạng thái', 'Status'), t('Thời gian', 'Runtime'), t('Thời điểm', 'Created'), ''].map((heading, index) => <th key={index} className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">{heading}</th>)}
          </tr></thead>
          <tbody>{items.map(run => <tr key={run.id} className="text-slate-700 dark:text-slate-200">
            <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">{run.problemTitle || t('Trình chạy độc lập', 'Standalone playground')}</td>
            <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">{run.language}</td>
            <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(run.status)}`}>{statusLabel(run.status, t)}</span></td>
            <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">{run.executionTime == null ? '—' : `${run.executionTime} ms`}</td>
            <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">{new Date(run.createdAt).toLocaleString()}</td>
            <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><button type="button" onClick={() => setSelectedId(run.id)} className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><Eye className="h-3.5 w-3.5" />{t('Chi tiết', 'Details')}</button></td>
          </tr>)}</tbody>
        </table>
      </div>}

      <div className="flex items-center gap-3 text-sm">
        <button type="button" aria-label={t('Trang trước', 'Previous page')} disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button>
        <span>{t('Trang', 'Page')} {page}/{totalPages}</span>
        <button type="button" aria-label={t('Trang sau', 'Next page')} disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {detail && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div><h3 className="font-bold text-slate-900 dark:text-white">{detail.problemTitle || t('Lượt chạy Playground', 'Playground run')}</h3><p className="text-xs text-slate-500">{new Date(detail.createdAt).toLocaleString()}</p></div>
            <button type="button" aria-label={t('Đóng', 'Close')} onClick={() => { setSelectedId(null); setDetail(null); }} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(detail.status)}`}>{statusLabel(detail.status, t)}</span>
            <span>{detail.language}</span>
            {detail.executionTime != null && <span>{t('Thời gian', 'Runtime')}: {detail.executionTime} ms</span>}
            {detail.memoryUsed != null && <span>{t('Bộ nhớ', 'Memory')}: {detail.memoryUsed} KiB</span>}
            {detail.cpuTime != null && <span>CPU: {detail.cpuTime} ms</span>}
            {detail.compileTime != null && <span>{t('Biên dịch', 'Compile')}: {detail.compileTime} ms</span>}
          </div>
          {detail.error && <div><h4 className="mb-2 text-sm font-bold">{t('Lỗi', 'Error')}</h4><pre className="whitespace-pre-wrap rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{detail.error}</pre></div>}
          <div><h4 className="mb-2 text-sm font-bold">{t('Mã nguồn', 'Source code')}</h4><pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{detail.sourceCode}</pre></div>
          <div><h4 className="mb-2 text-sm font-bold">stdin</h4><pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{detail.customInput || t('(đầu vào rỗng)', '(empty input)')}</pre></div>
          <div><h4 className="mb-2 text-sm font-bold">{t('Output', 'Output')}</h4><pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{detail.output || t('(không có output)', '(no output)')}</pre></div>
        </div>
      </div>}
    </section>
  );
}
