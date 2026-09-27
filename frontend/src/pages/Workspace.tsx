import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  ChevronLeft, 
  FileText, 
  Play, 
  Send, 
  Sparkles, 
  X, 
  Loader2, 
  Terminal, 
  Code2, 
  CheckCircle2 
} from 'lucide-react';
import axios from 'axios';

interface Testcase {
  id?: string;
  inputData: string;
  expectedOutput: string;
  orderIndex?: number;
  explanation?: string;
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  timeLimit: number;
  memoryLimit: number;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  testcases?: Testcase[];
  sampleTestcases?: Testcase[] | string;
  codeTemplates?: Record<string, string> | string;
}

interface RunResult {
  status: string;

  stdout?: string;
  output?: string;
  stderr?: string;
  error?: string;

  executionTime?: string;
  memoryUsed?: string;
}

export const Workspace: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const isSandbox = !slug || slug === 'sandbox';

  // State quản lý bài tập & editor
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<string>('cpp');
  const [code, setCode] = useState<string>('');

  // State Modal Đề bài
  const [showProblemDrawer, setShowProblemDrawer] = useState<boolean>(false);

  // State tab & thao tác console
  const [activeTab, setActiveTab] = useState<'input' | 'result' | 'ai'>('input');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingProblem, setFetchingProblem] = useState<boolean>(true);

  // Ref lưu ID của Interval polling để dọn dẹp khi unmount
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE = 'http://localhost:5001/api';

  // Dọn dẹp interval khi component unmount
  useEffect(() => {
    if (isSandbox) {
      setProblem(null);
      setFetchingProblem(false);
      return;
    }

    const fetchProblem = async () => {
      try {
        setFetchingProblem(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`\({API_BASE}/problems/\){slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setProblem(res.data?.data || res.data);
      } catch (err: any) {
        console.error('Lỗi tải bài tập:', err);
      } finally {
        setFetchingProblem(false);
      }
    };

    fetchProblem();
  }, [slug, isSandbox]);

  // Hàm ép kiểu an toàn cho dữ liệu JSON từ Prisma
  const parseJSON = (data: any, fallback: any) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  };

  // 1. TẢI DỮ LIỆU BÀI TẬP & NẠP TEMPLATE CODE
  useEffect(() => {
    if (!slug) return;

    const fetchProblem = async () => {
      setFetchingProblem(true);
      try {
        const res = await fetch(`${API_BASE}/problems/${slug}`);
        if (!res.ok) throw new Error('Không thể tải bài tập');
        const result = await res.json();

        const problemData: Problem = result.data || result;
        if (problemData && problemData.id) {
          setProblem(problemData);

          // Cập nhật template code cho editor
          const templates = parseJSON(problemData.codeTemplates, {});
          setCode(templates[language] || templates['cpp'] || '// Viết mã nguồn tại đây...');
        }
      } catch (err) {
        console.error('Lỗi tải bài tập:', err);
      } finally {
        setFetchingProblem(false);
      }
    };

    fetchProblem();
  }, [slug]);

  // 2. LẤY DANH SÁCH TESTCASES
  const testcaseList: Testcase[] = useMemo(() => {
    if (!problem) return [];
    if (Array.isArray(problem.testcases) && problem.testcases.length > 0) {
      return problem.testcases;
    }
    return parseJSON(problem.sampleTestcases, []);
  }, [problem]);

  useEffect(() => {
    if (testcaseList.length > 0 && !customInput) {
      const firstTc = testcaseList[0];
      setCustomInput(firstTc.inputData || (firstTc as any).input || '');
    }
  }, [testcaseList]);

  // 3. ĐỔI NGÔN NGỮ & CẬP NHẬT TEMPLATE
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (problem) {
      const templates = parseJSON(problem.codeTemplates, {});
      setCode(templates[newLang] || '// Viết mã nguồn tại đây...');
    }
  };

  // 4. CHẠY THỬ NGHIỆM (RUN CUSTOM INPUT)

  // 4. CHẠY THỬ NGHIỆM (GỬI YÊU CẦU & POLLING KẾT QUẢ TỪ REDIS)
  const handleRunCustomInput = async () => {
    const token = localStorage.getItem('token');

    // Xóa interval polling cũ nếu có
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setLoading(true);
    setActiveTab('result');
    setRunResult({ status: 'EXECUTING', stdout: 'Mã nguồn đã gửi. Đang chờ hệ thống chạy thử...' });

    try {
      // Step 1: Gọi API gửi request chạy thử
      const res = await fetch(`${API_BASE}/submissions/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          problemId: problem?.id,
          language, 
          sourceCode: code, 
          customInput: customInput 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setRunResult({ status: 'ERROR', stdout: errorData.message || `Lỗi máy chủ (${res.status})` });
        setLoading(false);
        return;
      }

      const data = await res.json();
      const runId = data.runId || data.data?.runId;

      if (!runId) {
        setRunResult({ status: 'ERROR', stdout: 'Không tìm thấy mã runId từ phản hồi máy chủ.' });
        setLoading(false);
        return;
      }

      // Step 2: Polling route /submissions/run-status/:runId để đọc kết quả từ Redis
      let pollCount = 0;
      const maxPolls = 20; // Tối đa 20 lượt (~20 giây)

      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        if (pollCount > maxPolls) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setRunResult({ status: 'TIMEOUT', stdout: 'Hết thời gian chờ kết quả chạy thử.' });
          setLoading(false);
          return;
        }

        try {
          const pollRes = await fetch(`\({API_BASE}/submissions/run-status/\){runId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!pollRes.ok) return;

          const pollData = await pollRes.json();

          // Khi Redis trả về kết quả đã hoàn tất (status = COMPLETED)
          if (pollData.status === 'COMPLETED' && pollData.data) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            const resultDetail = pollData.data;
            const stdoutContent =
              resultDetail.stdout ??
              resultDetail.output ??
              resultDetail.stderr ??
              resultDetail.error ??
              '(Không có output)';

            setRunResult({
              status: resultDetail.status || 'SUCCESS',
              stdout:
                resultDetail.stdout ??
                resultDetail.output ??
                '',
              stderr:
                resultDetail.stderr ??
                resultDetail.error ??
                '',
              executionTime: resultDetail.executionTime
                ? `${resultDetail.executionTime}ms`
                : undefined,
            });

            setLoading(false);
          }
        } catch (pollErr) {
          console.error('Lỗi khi polling kết quả chạy thử:', pollErr);
        }
      }, 1000); // Polling mỗi 1 giây

    } catch (err) {
      console.error('Lỗi kết nối Server khi chạy thử:', err);
      setRunResult({ status: 'ERROR', stdout: 'Không thể kết nối đến máy chủ.' });
      setLoading(false);
    }
  };


  // 5. NỘP BÀI CHÍNH THỨC
  const handleSubmitCode = async () => {
    if (!problem) return;
    const token = localStorage.getItem('token');
    
    // Xóa interval cũ nếu đang chạy
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setLoading(true);
    setActiveTab('result');
    setRunResult({ 
      status: 'PENDING', 
      stdout: 'Mã nguồn đã được gửi. Đang xếp hàng đợi Sandbox chấm điểm...' 
    });

    try {
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          problemId: problem.id, 
          language, 
          sourceCode: code 
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setRunResult({ status: 'ERROR', stdout: errData.message || 'Không thể nộp bài.' });
        setLoading(false);
        return;
      }

      const data = await res.json();
      
      // Bắt ID bài nộp từ các dạng response khác nhau
      const subId = data.submissionId || data.data?.id || data.id;

      if (!subId) {
        setRunResult({ status: 'ERROR', stdout: 'Không tìm thấy ID bài nộp từ phản hồi server.' });
        setLoading(false);
        return;
      }

      let pollCount = 0;
      const maxPolls = 25; // Giới hạn polling trong 37.5 giây

      // Polling kiểm tra trạng thái bài nộp định kỳ
      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        if (pollCount > maxPolls) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setRunResult({ status: 'TIMEOUT', stdout: 'Hết thời gian chờ kết quả chấm bài.' });
          setLoading(false);
          return;
        }

        try {
          const pollRes = await fetch(`${API_BASE}/submissions/${subId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          // Nếu chưa tìm thấy record hoặc lỗi server, bỏ qua lượt này để thử lại
          if (!pollRes.ok) {
            console.warn(`[Polling] Chưa tìm thấy bài nộp hoặc server phản hồi status ${pollRes.status}`);
            return;
          }

          const pollData = await pollRes.json();
          const subData = pollData.data || pollData;

          if (subData && subData.status) {
            const currentStatus = subData.status;

            if (currentStatus !== 'PENDING' && currentStatus !== 'IN_PROGRESS') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              
              setRunResult({
                status: currentStatus,
                stdout: currentStatus === 'COMPILE_ERROR' 
                  ? (subData.compileLog || 'Lỗi biên dịch.') 
                  : `Chấm điểm hoàn tất. Trạng thái: ${currentStatus}`,
                executionTime: subData.totalTime ? `${subData.totalTime}ms` : undefined,
                memoryUsed: subData.maxMemory ? `${subData.maxMemory}KB` : undefined,
              });
              
              setLoading(false);
            }
          }
        } catch (pollErr) {
          console.error('Lỗi khi kiểm tra trạng thái bài nộp:', pollErr);
        }
      }, 1500);

    } catch (err) {
      console.error('Lỗi kết nối Server:', err);
      setRunResult({ status: 'ERROR', stdout: 'Không thể kết nối đến máy chủ.' });
      setLoading(false);
    }
  };

  // 6. TRỢ GIẢNG AI
  const handleAIDebug = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setActiveTab('ai');
    try {
      const res = await fetch(`${API_BASE}/ai/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceCode: code,
          language,
          errorMessage: runResult?.stdout || 'Không có thông tin lỗi execution',
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiSuggestion(data.data?.suggestion || data.suggestion || 'AI chưa thể đưa ra gợi ý.');
    } catch {
      setAiSuggestion('Không thể kết nối với dịch vụ AI.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProblem) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium space-y-2 flex-col">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        <span className="text-xs font-semibold">Đang tải không gian làm việc...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* HEADER TOP BAR */}
      <header className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/problems', { state: { openDetailSlug: slug } })}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chi tiết bài tập</span>
          </button>
          
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

          <button
            onClick={() => setShowProblemDrawer(true)}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Xem Đề Bài</span>
          </button>

          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md">
            {problem ? problem.title : 'Không tìm thấy bài tập'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="cpp">C++ (GCC 11.2)</option>
            <option value="python">Python (3.10)</option>
            <option value="java">Java (JDK 17)</option>
          </select>

          <button
            onClick={handleRunCustomInput}
            disabled={loading}
            className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Chạy thử</span>
          </button>

          <button
            onClick={handleSubmitCode}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp bài</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-10 flex-1 overflow-hidden p-3 gap-3">
        {/* CỘT TRÁI: EDITOR CODE */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden transition-colors">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Trình Soạn Thảo Code</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Theme: VS-Dark</span>
          </div>
          <div className="flex-1 overflow-hidden pt-2">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === 'cpp' ? 'cpp' : language}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        </div>

        {/* CỘT PHẢI: TERMINAL / OUTPUT CONSOLE */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden transition-colors">
          {/* TABS CONSOLE */}
          <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-4 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'input'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Custom Input</span>
            </button>

            <button
              onClick={() => setActiveTab('result')}
              className={`px-4 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'result'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Kết Quả Thực Thi</span>
            </button>

            <button
              onClick={handleAIDebug}
              className={`px-4 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ai'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Trợ Giảng AI</span>
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs bg-slate-50/50 dark:bg-slate-950/50">
            {activeTab === 'input' && (
              <div className="h-full flex flex-col space-y-2">
                <label className="text-slate-500 dark:text-slate-400 font-sans font-medium text-xs">
                  Nhập dữ liệu kiểm thử thủ công (Standard Input):
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Nhập input tại đây..."
                  className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none transition-colors"
                />
              </div>
            )}

            {activeTab === 'result' && (
              <div className="h-full flex flex-col">
                {loading && (!runResult || runResult.status === 'EXECUTING') ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-sans py-4">
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    <span>Đang thực thi mã nguồn...</span>
                  </div>
                ) : runResult ? (
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                        <Terminal className="w-4 h-4 text-slate-400" />
                        <span className="font-bold">Trạng thái:</span>
                        
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          runResult.status === 'PENDING' || runResult.status === 'EXECUTING' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                          runResult.status === 'ACCEPTED' || runResult.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          {runResult.status}
                        </span>

                        {(runResult.status === 'PENDING' || runResult.status === 'EXECUTING') && (
                          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        )}
                      </div>
                      
                      <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider block mb-1 font-sans">
                        Standard Output / Console Log:
                      </span>
                      <pre className="whitespace-pre-wrap text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800 min-h-[100px]">
                        {
                          runResult.stdout ||
                          runResult.output ||
                          runResult.stderr ||
                          runResult.error ||
                          '(Không có output)'
                        }
                      </pre>
                    </div>

                    {(runResult.executionTime || runResult.memoryUsed) && (
                      <div className="mt-4 pt-2 border-t border-slate-800 flex gap-4 text-xs text-slate-400">
                        {runResult.executionTime && <div>Thời gian: <span className="text-slate-200">{runResult.executionTime}</span></div>}
                        {runResult.memoryUsed && <div>Bộ nhớ: <span className="text-slate-200">{runResult.memoryUsed}</span></div>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 dark:text-slate-500 font-sans text-center py-12">
                    Nhấn <strong>"Chạy thử"</strong> hoặc <strong>"Nộp bài"</strong> để xem kết quả đầu ra.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="h-full flex flex-col font-sans">
                <span className="text-purple-600 dark:text-purple-400 font-bold mb-2 flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4" /> Gợi ý sửa lỗi từ AI:
                </span>
                {loading ? (
                  <div className="flex items-center gap-2 text-slate-500 py-4">
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                    <span>AI đang phân tích mã nguồn...</span>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto">
                    {aiSuggestion || 'Chưa có phân tích từ AI.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL SLIDE-OVER ĐỀ BÀI */}
      {showProblemDrawer && (
        <div className="fixed inset-0 z-50 flex justify-start bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Chi Tiết Đề Bài</h3>
              </div>
              <button
                onClick={() => setShowProblemDrawer(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-slate-700 dark:text-slate-300 text-xs leading-relaxed flex-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{problem?.title}</h2>

              <div className="flex gap-2 text-[11px] flex-wrap">
                <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 font-bold rounded-md border border-emerald-200/60 dark:border-emerald-900/50">
                  Độ khó: {problem?.difficulty || 'EASY'}
                </span>
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-md border border-slate-200 dark:border-slate-700">
                  Thời gian: {problem?.timeLimit || 1.0}s
                </span>
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-md border border-slate-200 dark:border-slate-700">
                  Bộ nhớ: {problem?.memoryLimit || 256}MB
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 whitespace-pre-wrap text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                {problem?.description}
              </div>

              {problem?.inputFormat && (
                <div className="space-y-1 pt-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Mô tả Đầu vào (Input):</h4>
                  <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {problem.inputFormat}
                  </p>
                </div>
              )}

              {problem?.outputFormat && (
                <div className="space-y-1 pt-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Mô tả Đầu ra (Output):</h4>
                  <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {problem.outputFormat}
                  </p>
                </div>
              )}

              {testcaseList.length > 0 && (
                <div className="pt-2 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Ví dụ minh họa:</h4>
                  {testcaseList.map((test, index) => {
                    const inputVal = test.inputData || (test as any).input || '';
                    const outputVal = test.expectedOutput || (test as any).output || '';

                    return (
                      <div key={test.id || index} className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Ví dụ #{index + 1}
                        </span>

                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Input:</span>
                          <pre className="font-mono text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 mt-0.5 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                            {inputVal}
                          </pre>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Output:</span>
                          <pre className="font-mono text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 mt-0.5 whitespace-pre-wrap text-emerald-600 dark:text-emerald-400">
                            {outputVal}
                          </pre>
                        </div>

                        {test.explanation && (
                          <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                            Giải thích: {test.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;