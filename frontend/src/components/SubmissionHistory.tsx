import { API_BASE_URL } from '../config/api';
import { useEffect, useState } from 'react';
import {
  X,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Code2,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../services/api';

type Submission = {
  id: string;
  language: string;
  status: string;
  totalTestcases: number;
  totalTime: number | null;
  createdAt: string;
  completed: number;
  passed: number;
  failed: number;
  problem: {
    id: string;
    title: string;
    slug: string;
  };
};

type TestcaseResult = {
  id: string;
  testcaseId: string;
  number: number;
  isHidden: boolean;
  status: string;
  executionTime: number;
   input: string | null;
  output: string | null;
  errorLog: string | null;
};

type SubmissionDetail = Submission & {
  sourceCode: string;
  results: TestcaseResult[];
};

type Props = {
  apiBaseUrl?: string;

  // Truyền submissionId mới nhất từ response của nút Nộp bài.
  latestSubmissionId?: string;
};

const statusNames = (
  t:any
): Record<string,string> => ({
  PENDING: t('Đang chờ','Pending'),
  IN_PROGRESS: t('Đang chấm','Judging'),

  ACCEPTED: t('Đúng','Accepted'),
  AC: t('Đúng','Accepted'),

  WRONG_ANSWER: t('Sai đáp án','Wrong Answer'),
  WA: t('Sai đáp án','Wrong Answer'),

  TIME_LIMIT_EXCEEDED:
    t('Quá thời gian','Time Limit Exceeded'),

  TLE:
    t('Quá thời gian','Time Limit Exceeded'),

  MEMORY_LIMIT_EXCEEDED:
    t('Quá bộ nhớ','Memory Limit Exceeded'),

  MLE:
    t('Quá bộ nhớ','Memory Limit Exceeded'),

  RUNTIME_ERROR:
    t('Lỗi thực thi','Runtime Error'),

  RE:
    t('Lỗi thực thi','Runtime Error'),

  COMPILE_ERROR:
    t('Lỗi biên dịch','Compile Error'),

  CE:
    t('Lỗi biên dịch','Compile Error'),

  SYSTEM_ERROR:
    t('Lỗi hệ thống','System Error'),
});

function isPending(status: string) {
  return status === 'PENDING' || status === 'IN_PROGRESS';
}

function StatusBadge({
  status,
  t
}:{
  status:string;
  t:any;
}) {


const success =
 status==='AC' ||
 status==='ACCEPTED';


const pending =
 status==='PENDING' ||
 status==='IN_PROGRESS';


return (

<span
className={`
inline-flex items-center
px-2 py-1
rounded-lg
text-[11px]
font-bold
border

${
success
?
'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
:
pending
?
'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
:
'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
}

`}
>

{statusNames(t)[status] || status}

</span>

)

}

const cellStyle = {
  padding: '12px',
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'left' as const,
};

export default function SubmissionHistory({
  apiBaseUrl = API_BASE_URL,
  latestSubmissionId,
}: Props) {
  const [items, setItems] = useState<Submission[]>([]);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage() as any;

  useEffect(() => {
    if (!latestSubmissionId) return;

    setPage(1);
    setDetail(null);
    setSelectedId(latestSubmissionId);
    setRefreshKey((value) => value + 1);
  }, [latestSubmissionId]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const base = apiBaseUrl.replace(/\/$/, '');

    async function request<T>(path: string): Promise<T> {
      const response = await apiFetch(`${base}${path}`, {
        signal: controller.signal,
      });

      const body = await response.json();

      if (!response.ok || !body.success) {
        throw new Error(body.message || 'Không thể tải dữ liệu');
      }

      return body as T;
    }

    async function load(firstLoad: boolean) {
      if (firstLoad) setLoading(true);

      try {
        const [history, detailResponse] = await Promise.all([
          request<{
            data: Submission[];
            pagination: { totalPages: number };
          }>(`/submissions/history?page=${page}`),

          selectedId
            ? request<{ data: SubmissionDetail }>(
                `/submissions/history/${encodeURIComponent(selectedId)}`,
              )
            : Promise.resolve(null),
        ]);

        if (stopped) return;

        setItems(history.data);
        setTotalPages(history.pagination.totalPages);
        setDetail(detailResponse?.data ?? null);
        setError('');

        const waiting =
          history.data.some((item) => isPending(item.status)) ||
          (detailResponse !== null &&
            isPending(detailResponse.data.status));

        // Chỉ hẹn lượt tiếp theo sau khi lượt hiện tại hoàn tất.
        if (waiting) {
          timer = setTimeout(() => {
            void load(false);
          }, 2000);
        }
      } catch (cause) {
        if (!stopped) {
          setError(
            cause instanceof Error ? cause.message : 'Không thể tải dữ liệu',
          );
        }
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
  }, [apiBaseUrl, page, selectedId, refreshKey]);

  return (
    <section
        className="
        bg-white
        dark:bg-slate-900
        border
        border-slate-200
        dark:border-slate-800
        rounded-2xl
        p-5
        space-y-5
        "
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <h2 className="
        text-lg
        font-extrabold
        text-slate-900
        dark:text-white
        ">
        {t(
        'Lịch sử nộp bài',
        'Submission History'
        )}
        </h2>

        <button
            type="button"
            disabled={loading}
            onClick={() => {
                setDetail(null);
                setSelectedId(null);
                setRefreshKey((value) => value + 1);
            }}
            className="
            flex items-center gap-2
            px-3 py-2
            rounded-xl
            bg-slate-100
            dark:bg-slate-800
            text-xs
            font-bold
            hover:bg-slate-200
            dark:hover:bg-slate-700
            disabled:opacity-50
            disabled:cursor-not-allowed
            "
            >
            <RefreshCw 
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />

            {t(
                'Làm mới',
                'Refresh'
            )}
</button>
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading && <p>Đang tải kết quả...</p>}

      {!loading && !error && items.length === 0 && (
        <p>Chưa có bài nộp trong trang này.</p>
      )}

      <div style={{ overflowX: 'auto' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        {[
          t('Bài tập', 'Problem'),
          t('Ngôn ngữ', 'Language'),
          t('Trạng thái', 'Status'),
          t('Testcase', 'Testcases'),
          t('Thời điểm', 'Submitted At'),
          ''
        ].map((title, index) => (
          <th key={index} style={cellStyle}>
            {title}
          </th>
        ))}
      </tr>
    </thead>

          <tbody>
            {items.map((item) => (
  <tr key={item.id}>
    <td style={cellStyle}>
      {item.problem.title}
    </td>

    <td style={cellStyle}>
      {item.language}
    </td>

    <td style={cellStyle}>
      <StatusBadge
        status={item.status}
        t={t}
      />
    </td>

    <td style={cellStyle}>
      {item.totalTestcases > 0
        ? `${item.passed}/${item.totalTestcases} ${t(
            'đúng',
            'passed'
          )} · ${item.completed} ${t(
            'đã chấm',
            'completed'
          )}`
        : t(
            'Dữ liệu lịch sử cũ',
            'Legacy history data'
          )}
    </td>

    <td style={cellStyle}>
      {new Date(item.createdAt).toLocaleString(
        'vi-VN'
      )}
    </td>

    <td style={cellStyle}>
      <button
        onClick={() => {
          setDetail(null);
          setSelectedId(item.id);
        }}
        className="
          flex items-center gap-1
          px-3 py-1.5
          rounded-lg
          bg-blue-50
          dark:bg-blue-950/50
          text-blue-600
          dark:text-blue-400
          text-xs
          font-bold
        "
      >
        <Eye className="w-3.5 h-3.5" />

        {t(
          'Chi tiết',
          'Details'
        )}
      </button>
    </td>
  </tr>
))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
  <button
    type="button"
    disabled={page <= 1 || loading}
    onClick={() => setPage((value) => value - 1)}
  >
    {t(
      'Trang trước',
      'Previous Page'
    )}
  </button>

  <span>
    {t(
      'Trang',
      'Page'
    )}{' '}
    {page}/{totalPages}
  </span>

  <button
    type="button"
    disabled={page >= totalPages || loading}
    onClick={() => setPage((value) => value + 1)}
  >
    {t(
      'Trang sau',
      'Next Page'
    )}
  </button>
</div>

      {detail && (

<div
className="
fixed inset-0
z-50
flex
items-center
justify-center
p-4
bg-slate-900/60
backdrop-blur-sm
"
>

<div
className="
w-full
max-w-4xl
max-h-[90vh]
overflow-y-auto
bg-white
dark:bg-slate-900
rounded-2xl
border
border-slate-200
dark:border-slate-800
shadow-xl
"
>


<div
className="
flex
justify-between
items-center
px-6
py-4
border-b
border-slate-200
dark:border-slate-800
"
>

<h3
className="
font-bold
text-slate-900
dark:text-white
"
>
{detail.problem.title}
</h3>


<button
onClick={()=>{
 setDetail(null);
 setSelectedId(null);
}}
>
<X/>
</button>

</div>


<div className="p-6 space-y-5">


<div className="flex gap-3 items-center">

<StatusBadge
status={detail.status}
t={t}
/>

<span className="text-xs text-slate-500">
{detail.passed}/{detail.totalTestcases}
</span>

</div>

<div className="overflow-x-auto">

<table className="
w-full
text-xs
border-collapse
">

<thead>
<tr
className="
bg-slate-50
dark:bg-slate-950
"
>

<th style={cellStyle}>
{t('Testcase','Testcase')}
</th>

<th style={cellStyle}>
{t('Trạng thái','Status')}
</th>

<th style={cellStyle}>
  Input
</th>

<th style={cellStyle}>
{t('Output','Output')}
</th>

<th style={cellStyle}>
{t('Thông báo','Message')}
</th>

</tr>
</thead>


<tbody>

{detail.results.map((item)=>(

<tr key={item.id}>

<td style={cellStyle}>

#{item.number}

{' '}

{item.isHidden
?
t('(ẩn)','(hidden)')
:
t('(công khai)','(public)')
}

</td>


<td style={cellStyle}>

<StatusBadge
status={item.status}
t={t}
/>

</td>


<td style={cellStyle}>

<pre
className="
whitespace-pre-wrap
font-mono
text-xs
text-slate-700
dark:text-slate-300
"
>
{
item.input
?
item.input
:
'—'
}
</pre>

</td>


<td style={cellStyle}>

<pre
className="
whitespace-pre-wrap
font-mono
text-xs
text-slate-700
dark:text-slate-300
"
>
{
item.output
?
item.output
:
item.isHidden
?
t(
  'Output ẩn',
  'Hidden output'
)
:
'—'
}
</pre>

</td>


<td style={cellStyle}>

{
item.errorLog
?
item.errorLog
:
'—'
}

</td>


</tr>

))}

</tbody>

</table>

</div>


<div>

<h4 className="
font-bold
text-sm
mb-2
">
{t(
'Mã nguồn',
'Source Code'
)}
</h4>


<pre
className="
p-4
rounded-xl
bg-slate-950
text-slate-100
overflow-x-auto
text-xs
"
>
{detail.sourceCode}
</pre>

</div>


</div>


</div>

</div>

)}
    </section>
  );
}
