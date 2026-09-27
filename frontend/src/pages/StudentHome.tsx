import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Code2, 
  Rocket, 
  Map, 
  Terminal, 
  Sparkles, 
  ArrowRight, 
  Compass,
  Zap,
  Layers,
  BookOpen,
  Flame,
  HelpCircle,
  Check
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const StudentHome: React.FC = () => {
  const { t } = useLanguage() as any;

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen p-6 space-y-8 transition-colors duration-200 font-sans">
      
      {/* 1. HERO SECTION */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-12 space-y-6 shadow-2xs transition-colors">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-blue-200 dark:border-blue-900/50 rounded-md bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t('Hệ thống Chấm bài & Lộ trình Học tập Tự động', 'Automated Grading & Learning Roadmap System')}</span>
        </div>

        <div className="max-w-3xl space-y-4">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {t('Nâng Cao Kỹ Năng Lập Trình Với ', 'Enhance Programming Skills With ')}
            <span className="text-blue-600 dark:text-blue-400">Online Judge</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {t(
              'Nền tảng thực hành thuật toán chuyên nghiệp. Biên dịch và thực thi code trực tuyến, nhận kết quả kiểm thử tức thì và chinh phục các thử thách lập trình cùng cộng đồng sinh viên.',
              'Professional algorithm practice platform. Compile and execute code online, receive instant test results, and conquer programming challenges with student community.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to="/problems"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 shadow-2xs"
          >
            <Rocket className="w-4 h-4" />
            <span>{t('Bắt Đầu Làm Bài Ngay', 'Start Practice Now')}</span>
          </Link>

          <Link
            to="/roadmaps"
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('Xem Lộ Trình Học Tập', 'View Learning Roadmaps')}</span>
          </Link>
        </div>
      </section>

      {/* 2. THỐNG KÊ TỔNG QUAN NỀN TẢNG */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('Ngân hàng bài tập', 'Problem Bank')}
            </span>
            <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">500+</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('Phân loại từ cơ bản đến nâng cao', 'Categorized from basic to advanced')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('Lộ trình đào tạo', 'Training Roadmaps')}
            </span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">12+</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('Thiết kế theo chuẩn kỹ sư phần mềm', 'Designed to software engineer standards')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('Trình biên dịch', 'Compilers')}
            </span>
            <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">C++, Python, Java</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('Hỗ trợ các ngôn ngữ phổ biến', 'Supports popular programming languages')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('Thời gian phản hồi', 'Response Time')}
            </span>
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">&lt; 1.0s</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('Chấm tự động tức thì', 'Instant automated evaluation')}
          </p>
        </div>
      </section>

      {/* 3. HIGHLIGHT: BẮT ĐẦU THEO LỘ TRÌNH */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs transition-colors">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded text-[11px] font-bold">
            <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t('Dành cho Người mới bắt đầu', 'For Beginners')}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('Bạn chưa biết nên bắt đầu luyện tập từ đâu?', "Don't know where to start practicing?")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('Hãy tham gia vào ', 'Join our ')}
            <strong className="text-blue-600 dark:text-blue-400 font-semibold">
              {t('Lộ trình Học tập Tuần tự', 'Sequential Learning Roadmaps')}
            </strong>
            {t(
              '. Các bài tập được sắp xếp theo cấp độ tăng dần, tự động mở khóa các thử thách tiếp theo khi bạn hoàn thành bài học trước.',
              '. Exercises are arranged in increasing difficulty, automatically unlocking next challenges as you complete previous ones.'
            )}
          </p>
        </div>

        <Link
          to="/roadmaps"
          className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          <Map className="w-4 h-4" />
          <span>{t('Khám Phá Lộ Trình', 'Explore Roadmaps')}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* 4. BÀI TẬP ĐỀ XUẤT & QUY ĐỊNH NỘP BÀI */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {t('Gợi ý bài tập hôm nay', "Today's Recommended Problems")}
              </h3>
            </div>
            <Link to="/problems" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
              {t('Xem tất cả →', 'View All →')}
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    {t('Tính tổng mảng một chiều', 'Calculate 1D Array Sum')}
                  </span>
                  <span className="px-2 py-0.5 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded text-[10px] font-bold">
                    {t('Dễ', 'Easy')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Mảng & Chuỗi • Giới hạn: 1.0s • 256MB', 'Arrays & Strings • Limit: 1.0s • 256MB')}
                </p>
              </div>
              <Link
                to="/problems"
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-600 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 rounded text-xs font-bold transition-colors"
              >
                {t('Giải bài', 'Solve')}
              </Link>
            </div>

            <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    {t('Tìm kiếm Nhị phân nâng cao', 'Advanced Binary Search')}
                  </span>
                  <span className="px-2 py-0.5 border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold">
                    {t('Trung bình', 'Medium')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Thuật toán Tìm kiếm • Giới hạn: 1.0s • 256MB', 'Search Algorithms • Limit: 1.0s • 256MB')}
                </p>
              </div>
              <Link
                to="/problems"
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-600 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 rounded text-xs font-bold transition-colors"
              >
                {t('Giải bài', 'Solve')}
              </Link>
            </div>

            <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    {t('Quy hoạch động: Bài toán Cái Túi', 'Dynamic Programming: Knapsack')}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-[10px] font-bold">
                    {t('Khó', 'Hard')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Quy hoạch động • Giới hạn: 2.0s • 512MB', 'Dynamic Programming • Limit: 2.0s • 512MB')}
                </p>
              </div>
              <Link
                to="/problems"
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-600 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 rounded text-xs font-bold transition-colors"
              >
                {t('Giải bài', 'Solve')}
              </Link>
            </div>
          </div>
        </div>

        {/* CẨM NANG NỘP BÀI */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xs transition-colors">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('Quy định nộp bài', 'Submission Rules')}
            </h3>
          </div>

          <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                {t('Sử dụng chuẩn đầu vào/đầu ra (', 'Use standard input/output (')}
                <strong className="text-slate-900 dark:text-white">stdin / stdout</strong>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                {t('Không in thừa dòng thông báo như "Nhap n=", "Ket qua là:".', 'Do not print extra prompts like "Enter n=", "Result:".')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                {t('Đảm bảo tối ưu giải thuật tránh lỗi ', 'Optimize algorithms to avoid ')}
                <strong className="text-blue-600 dark:text-blue-400">Time Limit Exceeded</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                {t('Kiểm tra kỹ các trường hợp biên (Edge cases) trước khi gửi.', 'Thoroughly check edge cases before submitting.')}
              </span>
            </li>
          </ul>

          <div className="pt-2">
            <a 
              href="#guide" 
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t('Hướng dẫn xử lý lỗi biên dịch', 'Compilation error handling guide')}</span>
            </a>
          </div>
        </div>
      </section>

      {/* 5. TÍNH NĂNG CỐT LÕI */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('Tính năng hệ thống', 'System Features')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Môi trường rèn luyện thuật toán tối ưu với các tính năng hàng đầu', 'Optimal algorithm training environment with top-notch features')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors space-y-2 shadow-2xs">
            <div className="w-8 h-8 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-xs">
              01
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('Chấm Bài Trực Tuyến', 'Online Evaluation')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('Biên dịch mã nguồn tự động trong môi trường Sandbox an toàn, phản hồi kết quả cực nhanh.', 'Automated source code compilation in a secure Sandbox, with ultra-fast feedback.')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors space-y-2 shadow-2xs">
            <div className="w-8 h-8 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-xs">
              02
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('Mở Khóa Theo Tiến Độ', 'Progress-based Unlocking')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('Bài tập mở khóa tuần tự giúp bạn tiến bộ bền vững từ cơ bản tới nâng cao.', 'Sequential exercise unlocking helps you make steady progress from basic to advanced.')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors space-y-2 shadow-2xs">
            <div className="w-8 h-8 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-xs">
              03
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('Phân Tích Chi Tiết', 'Detailed Analytics')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('Thống kê thời gian thực thi, bộ nhớ và danh sách các Testcase đạt được.', 'Real-time execution stats, memory usage, and passed testcases list.')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors space-y-2 shadow-2xs">
            <div className="w-8 h-8 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-xs">
              04
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('Trình Soạn Thảo Đa Năng', 'Versatile Code Editor')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('Tích hợp Editor hiện đại với tính năng tô màu cú pháp và tự động hoàn thành mã.', 'Modern built-in Editor featuring syntax highlighting and auto-completion.')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors space-y-2 shadow-2xs">
            <div className="w-8 h-8 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-xs">
              05
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('Lịch Sử Nộp Bài', 'Submission History')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('Lưu giữ toàn bộ mã nguồn các lần nộp giúp dễ dàng theo dõi tiến trình làm bài.', 'Keeps full submission history to easily track your learning progress.')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors space-y-2 shadow-2xs">
            <div className="w-8 h-8 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-xs">
              06
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('Bảng Xếp Hạng', 'Leaderboard')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('So sánh thứ hạng, tích lũy điểm số và thi đua cùng các bạn học trong trường.', 'Compare rankings, accumulate scores, and compete with fellow classmates.')}
            </p>
          </div>
        </div>
      </section>

      {/* 6. QUY TRÌNH LÀM BÀI 4 BƯỚC */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xs transition-colors">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {t('Quy trình 4 bước rèn luyện hiệu quả', '4-Step Effective Learning Workflow')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg space-y-1.5">
            <div className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              01. {t('Chọn bài tập', 'Select Problem')}
            </div>
            <div className="font-bold text-slate-900 dark:text-white">
              {t('Lựa chọn chủ đề', 'Choose Topic')}
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {t('Lựa chọn bài tập phù hợp từ danh sách hoặc lộ trình cá nhân.', 'Pick suitable exercises from problem list or personal roadmap.')}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg space-y-1.5">
            <div className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              02. {t('Viết mã nguồn', 'Write Source Code')}
            </div>
            <div className="font-bold text-slate-900 dark:text-white">
              {t('Soạn thảo & Thử nghiệm', 'Edit & Experiment')}
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {t('Đọc kỹ mô tả, Input/Output và viết mã trên trình soạn thảo.', 'Read description, Input/Output carefully and code in the editor.')}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg space-y-1.5">
            <div className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              03. {t('Nộp bài', 'Submit')}
            </div>
            <div className="font-bold text-slate-900 dark:text-white">
              {t('Chấm tự động', 'Automated Grading')}
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {t('Hệ thống biên dịch và chạy thử với tập testcase ẩn.', 'System compiles and executes code against hidden testcases.')}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg space-y-1.5">
            <div className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              04. {t('Tối ưu', 'Optimize')}
            </div>
            <div className="font-bold text-slate-900 dark:text-white">
              {t('Cải thiện mã nguồn', 'Refine Code')}
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {t('Tối ưu bộ nhớ và thời gian thực thi để đạt điểm tối đa.', 'Optimize memory and execution time to achieve maximum score.')}
            </p>
          </div>
        </div>
      </section>

      {/* 7. FOOTER CALL TO ACTION */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4 shadow-2xs transition-colors">
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('Sẵn sàng vượt qua thử thách đầu tiên?', 'Ready to conquer your first challenge?')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Giải bài tập mỗi ngày để củng cố tư duy lập trình và nâng cao điểm số học tập.', 'Solve problems daily to strengthen algorithmic thinking and boost academic performance.')}
          </p>
        </div>
        <div>
          <Link
            to="/problems"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
          >
            <Code2 className="w-4 h-4" />
            <span>{t('Đến Ngân Hàng Bài Tập', 'Go to Problem Bank')}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default StudentHome;