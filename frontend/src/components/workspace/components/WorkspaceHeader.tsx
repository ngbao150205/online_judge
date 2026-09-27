import {
  ArrowLeft,
  BookOpen,
  Play,
  Send,
} from 'lucide-react';

interface WorkspaceHeaderProps {
  isSandbox?: boolean;
  title: string;
  language: string;

  onLanguageChange: (
    language: string
  ) => void;

  onRun: () => void;

  onSubmit?: () => void;

  onOpenProblem?: () => void;

  loading?: boolean;

  onBack: () => void;
}

const LANGUAGES = [
  {
    value: 'cpp',
    label: 'C++',
  },
  {
    value: 'java',
    label: 'Java',
  },
  {
    value: 'python',
    label: 'Python',
  },
  {
    value: 'javascript',
    label: 'JavaScript',
  },
  {
    value: 'typescript',
    label: 'TypeScript',
  },
];

export const WorkspaceHeader = ({
  isSandbox = false,
  title,
  language,
  onLanguageChange,
  onRun,
  onSubmit,
  onOpenProblem,
  loading = false,
  onBack,
}: WorkspaceHeaderProps) => {
  return (
    <header className="h-14 shrink-0 border-b border-gray-200 bg-white px-4 flex items-center justify-between">
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          title="Quay lại"
          className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="h-6 w-px bg-gray-200" />

        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[300px]">
            {title}
          </h1>
        </div>

        {/* View Problem */}
        {onOpenProblem && (
          <button
            type="button"
            onClick={onOpenProblem}
            className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <BookOpen size={15} />

            <span>Xem Đề Bài</span>
          </button>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        {/* Language */}
        <select
          value={language}
          onChange={(event) =>
            onLanguageChange(
              event.target.value
            )
          }
          disabled={loading}
          className="h-9 min-w-[120px] px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none cursor-pointer focus:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {LANGUAGES.map(
            (item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            )
          )}
        </select>

        {/* Run */}
        <button
  type="button"
  onClick={onRun}
  disabled={loading}
  className="h-9 px-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
>
  <Play size={15} />

  <span>
    {loading
      ? 'Đang chạy...'
      : isSandbox
        ? 'Chạy'
        : 'Chạy thử'}
  </span>
</button>

        {/* Submit */}
        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="h-9 px-3 flex items-center gap-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send size={15} />

            <span>
              {loading
                ? 'Đang xử lý...'
                : 'Nộp bài'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};

export default WorkspaceHeader;