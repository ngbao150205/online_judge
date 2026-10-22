import { API_BASE_URL } from '../config/api';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, Edit3, Trash2, BookOpen, Layers, 
  ArrowUp, ArrowDown, X, Loader2, CheckCircle2, XCircle, Search,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Problem {
  id: string;
  _id?: string;
  title: string;
  difficulty: string;
}

interface SelectedProblem {
  problemId: string;
  title: string;
  difficulty?: string;
  orderIndex: number;
}

interface Roadmap {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  problems: {
    problemId: string;
    orderIndex: number;
    problem?: Problem;
  }[];
  createdAt?: string;
}

export const AdminRoadmaps: React.FC = () => {
  const { t } = useLanguage();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  // STATE TÌM KIẾM & PHÂN TRANG DANH SÁCH LỘ TRÌNH
  const [roadmapSearchQuery, setRoadmapSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>([]);
  const [selectedProblemToAdd, setSelectedProblemToAdd] = useState('');
  
  // State Tìm kiếm bài tập trong Modal
  const [problemSearchQuery, setProblemSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const API_BASE = API_BASE_URL;

  // Tải danh sách lộ trình & tất cả bài tập để chọn
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRoadmaps, resProblems] = await Promise.all([
        axios.get(`${API_BASE}/admin/roadmaps`),
        axios.get(`${API_BASE}/problems`),
      ]);

      setRoadmaps(resRoadmaps.data?.data || []);
      const probData = resProblems.data?.data || resProblems.data?.problems || resProblems.data || [];
      setAvailableProblems(Array.isArray(probData) ? probData : []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // TỰ ĐỘNG RESET VỀ TRANG 1 KHI TÌM KIẾM LỘ TRÌNH
  useEffect(() => {
    setCurrentPage(1);
  }, [roadmapSearchQuery]);

  // LỌC LỘ TRÌNH DỰA TRÊN TỪ KHÓA
  const filteredRoadmaps = roadmaps.filter((r) =>
    r.title.toLowerCase().includes(roadmapSearchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(roadmapSearchQuery.toLowerCase()))
  );

  // TÍNH TOÁN PHÂN TRANG LỘ TRÌNH
  const totalPages = Math.ceil(filteredRoadmaps.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRoadmaps = filteredRoadmaps.slice(startIndex, startIndex + itemsPerPage);

  // Lọc bài tập trong Modal
  const filteredProblems = availableProblems.filter((p) =>
    p.title.toLowerCase().includes(problemSearchQuery.toLowerCase())
  );

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setIsActive(true);
    setSelectedProblems([]);
    setProblemSearchQuery('');
    setSelectedProblemToAdd('');
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (roadmap: Roadmap) => {
    setEditingId(roadmap.id);
    setTitle(roadmap.title);
    setDescription(roadmap.description || '');
    setIsActive(roadmap.isActive);
    setProblemSearchQuery('');
    setSelectedProblemToAdd('');

    const formattedList = roadmap.problems.map((item, idx) => ({
      problemId: item.problemId,
      title: item.problem?.title || `${t('Bài tập ID:', 'Problem ID:')} ${item.problemId}`,
      difficulty: item.problem?.difficulty,
      orderIndex: item.orderIndex ?? idx + 1,
    }));

    setSelectedProblems(formattedList);
    setIsModalOpen(true);
  };

  // Thêm bài tập vào lộ trình hiện tại
  const handleAddProblem = () => {
    if (!selectedProblemToAdd) return;
    const target = availableProblems.find((p) => (p.id || p._id) === selectedProblemToAdd);
    if (!target) return;

    const targetId = target.id || target._id || '';

    if (selectedProblems.some((p) => p.problemId === targetId)) {
      alert(t('Bài tập này đã có trong lộ trình!', 'This problem is already in the roadmap!'));
      return;
    }

    const newList = [
      ...selectedProblems,
      {
        problemId: targetId,
        title: target.title,
        difficulty: target.difficulty,
        orderIndex: selectedProblems.length + 1,
      },
    ];

    setSelectedProblems(newList);
    setSelectedProblemToAdd('');
  };

  // Xóa bài tập khỏi danh sách đã chọn
  const handleRemoveProblem = (problemId: string) => {
    const filtered = selectedProblems.filter((p) => p.problemId !== problemId);
    const reordered = filtered.map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
    setSelectedProblems(reordered);
  };

  // Di chuyển thứ tự bài tập (Lên/Xuống)
  const handleMoveOrder = (index: number, direction: 'UP' | 'DOWN') => {
    const newIndex = direction === 'UP' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedProblems.length) return;

    const list = [...selectedProblems];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    const reordered = list.map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
    setSelectedProblems(reordered);
  };

  // Lưu lộ trình (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert(t('Vui lòng nhập tên lộ trình', 'Please enter roadmap title'));

    try {
      setSaving(true);
      const payload = {
        title,
        description,
        isActive,
        problems: selectedProblems.map((p, idx) => ({
          problemId: p.problemId,
          orderIndex: idx + 1,
        })),
      };

      if (editingId) {
        await axios.put(`${API_BASE}/admin/roadmaps/${editingId}`, payload);
      } else {
        await axios.post(`${API_BASE}/admin/roadmaps`, payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Lỗi khi lưu lộ trình:', error);
      alert(t('Không thể lưu lộ trình. Vui lòng thử lại.', 'Unable to save roadmap. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  // Xóa lộ trình
  const handleDeleteRoadmap = async (id: string) => {
    if (!window.confirm(t('Bạn có chắc chắn muốn xóa lộ trình này?', 'Are you sure you want to delete this roadmap?'))) return;
    try {
      await axios.delete(`${API_BASE}/admin/roadmaps/${id}`);
      fetchData();
    } catch (error) {
      console.error('Lỗi khi xóa lộ trình:', error);
      alert(t('Không thể xóa lộ trình', 'Unable to delete roadmap'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-2" />
        <span className="text-xs font-medium">{t('Đang tải dữ liệu lộ trình...', 'Loading roadmap data...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 transition-colors">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{t('Quản Lý Lộ Trình Học Tập', 'Roadmap Management')} ({roadmaps.length})</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('Tạo và sắp xếp thứ tự bài tập theo từng lộ trình chuẩn hóa cho sinh viên', 'Create and order problems for standardized student learning paths')}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('Tạo Lộ Trình Mới', 'Create New Roadmap')}</span>
        </button>
      </div>

      {/* THANH TÌM KIẾM VÀ BỘ LỌC LỘ TRÌNH */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('Tìm kiếm lộ trình theo tên hoặc mô tả...', 'Search roadmaps by title or description...')}
            value={roadmapSearchQuery}
            onChange={(e) => setRoadmapSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl pl-9 pr-8 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {roadmapSearchQuery && (
            <button
              onClick={() => setRoadmapSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 self-end sm:self-center">
          {t('Tổng cộng:', 'Total:')} <span className="text-blue-600 dark:text-blue-400">{filteredRoadmaps.length}</span> {t('lộ trình', 'roadmaps')}
        </div>
      </div>

      {/* DANH SÁCH LỘ TRÌNH */}
      {currentRoadmaps.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentRoadmaps.map((roadmap) => (
              <div
                key={roadmap.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        roadmap.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {roadmap.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{roadmap.isActive ? t('Đang hiển thị', 'Visible') : t('Đã ẩn', 'Hidden')}</span>
                    </span>

                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                      {roadmap.problems?.length || 0} {t('Bài tập', 'Problems')}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{roadmap.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {roadmap.description || t('Chưa có mô tả.', 'No description available.')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1 mt-4">
                  <button
                    onClick={() => handleOpenEditModal(roadmap)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                    title={t('Chỉnh sửa lộ trình', 'Edit roadmap')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoadmap(roadmap.id)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                    title={t('Xóa lộ trình', 'Delete roadmap')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* BỘ PHÂN TRANG (PAGINATION) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 shadow-2xs transition-colors">
            <div className="flex items-center gap-2">
              <span>{t('Hiển thị', 'Show')}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
              <span>{t('lộ trình/trang', 'roadmaps/page')}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                        className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={t('Trang kế tiếp', 'Next page')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 transition-colors">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('Không tìm thấy lộ trình nào', 'No roadmaps found')}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('Thử thay đổi từ khóa tìm kiếm hoặc tạo thêm lộ trình mới.', 'Try changing the search keyword or create a new roadmap.')}</p>
        </div>
      )}

      {/* MODAL CREATION / EDITING */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{editingId ? t('Cập Nhật Lộ Trình', 'Update Roadmap') : t('Tạo Lộ Trình Mới', 'Create New Roadmap')}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form id="roadmapForm" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">{t('Tên Lộ Trình *', 'Roadmap Title *')}</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('Ví dụ: Lập trình C++ từ Cơ bản đến Nâng cao', 'E.g., C++ Programming from Basic to Advanced')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">{t('Mô Tả', 'Description')}</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Mô tả ngắn gọn về định hướng của lộ trình...', 'Short description about roadmap orientation...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  {t('Kích hoạt hiển thị cho sinh viên', 'Activate visibility for students')}
                </label>
              </div>

              {/* THÊM BÀI TẬP VÀO LỘ TRÌNH (KÈM KHU VỰC TÌM KIẾM) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="block font-bold text-slate-800 dark:text-slate-200">{t('Danh Sách Bài Tập Theo Thứ Tự', 'Ordered Problem List')}</label>

                {/* KHU VỰC TÌM KIẾM VÀ CHỌN BÀI TẬP */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {/* Thanh tìm kiếm bài tập */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={t('Tìm kiếm tên bài tập để thêm nhanh...', 'Search problem title to add quickly...')}
                      value={problemSearchQuery}
                      onChange={(e) => setProblemSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {problemSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setProblemSearchQuery('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown danh sách bài tập đã được lọc */}
                  <div className="flex gap-2">
                    <select
                      value={selectedProblemToAdd}
                      onChange={(e) => setSelectedProblemToAdd(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">
                        -- {t('Chọn bài tập', 'Select problem')} ({filteredProblems.length} {t('kết quả', 'results')}) --
                      </option>
                      {filteredProblems.map((p) => {
                        const problemId = p.id || p._id || '';
                        const isAlreadyAdded = selectedProblems.some((sp) => sp.problemId === problemId);

                        return (
                          <option key={problemId} value={problemId} disabled={isAlreadyAdded}>
                            {p.title} ({p.difficulty || 'MEDIUM'}) {isAlreadyAdded ? `✓ ${t('Đã chọn', 'Selected')}` : ''}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddProblem}
                      disabled={!selectedProblemToAdd}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('Thêm', 'Add')}</span>
                    </button>
                  </div>
                </div>

                {/* DANH SÁCH BÀI TẬP ĐÃ CHỌN + SẮP XẾP */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedProblems.length > 0 ? (
                    selectedProblems.map((prob, idx) => (
                      <div
                        key={prob.problemId}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{prob.title}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, 'UP')}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                            title={t('Di chuyển lên', 'Move up')}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedProblems.length - 1}
                            onClick={() => handleMoveOrder(idx, 'DOWN')}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                            title={t('Di chuyển xuống', 'Move down')}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProblem(prob.problemId)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer"
                            title={t('Bỏ khỏi lộ trình', 'Remove from roadmap')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-slate-400 dark:text-slate-500 italic">{t('Chưa chọn bài tập nào cho lộ trình này.', 'No problems selected for this roadmap yet.')}</p>
                  )}
                </div>
              </div>
            </form>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                {t('Hủy bỏ', 'Cancel')}
              </button>
              <button
                type="submit"
                form="roadmapForm"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingId ? t('Cập Nhật', 'Update') : t('Lưu Lộ Trình', 'Save Roadmap')}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoadmaps;
