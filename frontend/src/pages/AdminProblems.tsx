import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit3, Trash2, BookOpen, Clock, HardDrive, 
  CheckCircle2, XCircle, X, Layers, PlusCircle, Trash, Code2, AlertCircle,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

interface Category {
  id: string;
  name: string;
}

interface TestCaseInput {
  inputData: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isActive: boolean;
  timeLimit: number;
  memoryLimit: number;
  categories: { category: { id: string; name: string } }[];
  testcases?: { isHidden: boolean }[];
  _count?: { testcases?: number; testCases?: number; submissions: number };
}

export const AdminProblems: React.FC = () => {
  const { t } = useLanguage() as any;
  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // STATE PHÂN TRANG (PAGINATION)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [isActive, setIsActive] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [testcases, setTestcases] = useState<TestCaseInput[]>([
    { inputData: '', expectedOutput: '', isHidden: false }
  ]);

  const API_BASE = 'http://localhost:5001/api';
  

  // Hàm tải dữ liệu bài tập & danh mục
  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage(t('Chưa đăng nhập hoặc thiếu Token xác thực. Vui lòng đăng nhập lại.', 'Not logged in or missing auth token. Please log in again.'));
      setLoading(false);
      return;
    }

    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // 1. Tải bài tập
      const problemsRes = await axios.get(`${API_BASE}/admin/problems`, authHeader);
      const rawProblems = problemsRes.data?.data || problemsRes.data;
      setProblems(Array.isArray(rawProblems) ? rawProblems : []);

      // 2. Tải danh mục
      try {
        const categoriesRes = await axios.get(`${API_BASE}/admin/categories`, authHeader);
        const rawCategories = categoriesRes.data?.data || categoriesRes.data;
        setCategories(Array.isArray(rawCategories) ? rawCategories : []);
      } catch (catErr) {
        console.warn('Chưa tải được danh mục (Có thể chưa tạo API categories)');
      }

    } catch (error: any) {
      console.error('Lỗi khi tải danh sách bài tập:', error);
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message;

      if (status === 401) {
        setErrorMessage(t('Phiên đăng nhập hết hạn (401). Vui lòng Đăng xuất và Đăng nhập lại.', 'Session expired (401). Please log out and log in again.'));
      } else if (status === 404) {
        setErrorMessage(t('Không tìm thấy Route API: GET /api/admin/problems (404). Kiểm tra Backend Route.', 'API Route not found: GET /api/admin/problems (404). Check Backend Route.'));
      } else {
        setErrorMessage(`${t('Lỗi máy chủ', 'Server Error')} (${status || 'Network Error'}): ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // RESET VỀ TRANG 1 KHI BỘ LỌC HOẶC TÌM KIẾM THAY ĐỔI
  useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, filterDifficulty, filterCategory]);

  const handleCreateCategory = async () => {
  if (!categoryName.trim()) {
    alert(
      t(
        'Vui lòng nhập tên danh mục',
        'Please enter category name'
      )
    );
    return;
  }

  try {
    setCreatingCategory(true);

    const token = localStorage.getItem('token');

    await axios.post(
      `${API_BASE}/admin/categories`,
      {
        name: categoryName.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );


    alert(
      t(
        'Tạo danh mục thành công!',
        'Category created successfully!'
      )
    );


    setCategoryName('');
    setIsCategoryModalOpen(false);


    // reload category + problem
    fetchData();


  } catch(error:any){

    alert(
      error.response?.data?.message ||
      t(
        'Không thể tạo danh mục',
        'Unable to create category'
      )
    );

  } finally {
    setCreatingCategory(false);
  }
};

  // Mở modal tạo mới
  const handleOpenCreateModal = async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await axios.get(`${API_BASE}/admin/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const rawCategories = res.data?.data || res.data;

      setCategories(Array.isArray(rawCategories) ? rawCategories : []);

      setSelectedCategoryIds(
        rawCategories.length > 0 ? [rawCategories[0].id] : []
      );

    } catch (error) {
      console.error('Không thể tải lại categories:', error);
    }


    setEditingProblemId(null);

    setTitle('');

    setDescription('');

    setDifficulty('MEDIUM');

    setTimeLimit(1000);

    setMemoryLimit(256);

    setIsActive(true);

    setTestcases([
      { inputData: '', expectedOutput: '', isHidden: false }
    ]);

    setIsModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEditModal = async (problemId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/admin/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data.data || res.data;
      setEditingProblemId(data.id);
      setTitle(data.title);
      setDescription(data.description || '');
      setDifficulty(data.difficulty);
      setTimeLimit(data.timeLimit);
      setMemoryLimit(data.memoryLimit);
      setIsActive(data.isActive ?? true);
      setSelectedCategoryIds(data.categories?.map((c: any) => c.category?.id || c.categoryId) || []);

      const tcData = data.testcases || data.testCases;
      if (tcData && tcData.length > 0) {
        setTestcases(tcData.map((tc: any) => ({
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden
        })));
      } else {
        setTestcases([{ inputData: '', expectedOutput: '', isHidden: false }]);
      }

      setIsModalOpen(true);
    } catch (error) {
      alert(t('Không thể tải chi tiết bài tập để sửa!', 'Unable to load problem details for editing!'));
    }
  };

  const handleAddTestcase = () => {
    setTestcases([...testcases, { inputData: '', expectedOutput: '', isHidden: true }]);
  };

  const handleRemoveTestcase = (index: number) => {
    if (testcases.length === 1) return;
    setTestcases(testcases.filter((_, i) => i !== index));
  };

  const handleTestcaseChange = (index: number, field: keyof TestCaseInput, value: any) => {
    const updated = [...testcases];
    updated[index] = { ...updated[index], [field]: value };
    setTestcases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert(t('Vui lòng điền đầy đủ Tiêu đề và Mô tả bài tập', 'Please fill in Title and Description'));
      return;
    }

    if (selectedCategoryIds.length === 0) {
      alert(t('Vui lòng chọn ít nhất 1 danh mục', 'Please select at least 1 category'));
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        title,
        description,
        difficulty,
        timeLimit: Number(timeLimit),
        memoryLimit: Number(memoryLimit),
        isActive,
        categoryIds: selectedCategoryIds,
        testcases
      };

      if (editingProblemId) {
        await axios.put(`${API_BASE}/admin/problems/${editingProblemId}`, payload, authHeader);
        alert(t('Cập nhật bài tập thành công!', 'Problem updated successfully!'));
      } else {
        await axios.post(`${API_BASE}/admin/problems`, payload, authHeader);
        alert(t('Tạo bài tập mới thành công!', 'New problem created successfully!'));
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || t('Có lỗi xảy ra khi lưu bài tập', 'An error occurred while saving the problem'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProblem = async (id: string, problemTitle: string) => {
    if (!window.confirm(`${t('Bạn có chắc chắn muốn xóa bài tập', 'Are you sure you want to delete the problem')} "${problemTitle}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/admin/problems/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(t('Xóa bài tập thành công!', 'Problem deleted successfully!'));
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || t('Lỗi khi xóa bài tập', 'Error deleting problem'));
    }
  };

  // DỮ LIỆU ĐÃ QUA BỘ LỌC
  const filteredProblems = problems.filter((item) => {

  const matchTitle =
    (item.title || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (item.slug || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());


  const matchDifficulty =
    filterDifficulty === 'ALL' ||
    item.difficulty === filterDifficulty;


  const matchCategory =
    filterCategory === 'ALL' ||
    item.categories?.some(
      (c) =>
        c.category.id === filterCategory
    );


  return (
    matchTitle &&
    matchDifficulty &&
    matchCategory
  );

});

  // TÍNH TOÁN PHÂN TRANG
  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProblems = filteredProblems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 transition-colors">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{t('Ngân Hàng Bài Tập', 'Problems Bank')} ({problems.length})</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('Quản lý, tạo mới, cấu hình giới hạn và bộ testcases cho bài tập', 'Manage, create, configure limits and testcase sets for problems')}
          </p>
        </div>

        <div className="flex gap-2">

<button
  onClick={() => setIsCategoryModalOpen(true)}
  className="
  flex items-center justify-center gap-2 
  px-4 py-2 
  bg-emerald-600 hover:bg-emerald-700 
  text-white rounded-xl text-xs 
  font-bold shadow-sm
  "
>
  <Plus className="w-4 h-4"/>
  <span>
    {t(
      'Thêm Danh Mục',
      'Add Category'
    )}
  </span>
</button>


<button
  onClick={handleOpenCreateModal}
  className="
  flex items-center justify-center gap-2 
  px-4 py-2 
  bg-blue-600 hover:bg-blue-700 
  text-white rounded-xl text-xs 
  font-bold shadow-sm
  "
>
  <Plus className="w-4 h-4"/>
  <span>
    {t(
      'Tạo Bài Tập Mới',
      'Create New Problem'
    )}
  </span>
</button>

</div>
      </div>

      {/* THÔNG BÁO LỖI NẾU KHÔNG LOAD ĐƯỢC DỮ LIỆU */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            {t('Thử lại', 'Retry')}
          </button>
        </div>
      )}

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row gap-3 transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t('Tìm kiếm bài tập theo tên hoặc slug...', 'Search problems by title or slug...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="relative flex items-center">
  <Layers className="w-3.5 h-3.5 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" />

  <select
    value={filterCategory}
    onChange={(e) => setFilterCategory(e.target.value)}
    className="
      pl-8 pr-4 py-2 
      bg-slate-50 dark:bg-slate-950 
      border border-slate-200 dark:border-slate-800 
      text-slate-700 dark:text-slate-200 
      rounded-xl text-xs font-semibold 
      focus:outline-none 
      focus:ring-2 
      focus:ring-blue-500/20 
      focus:border-blue-500 
      cursor-pointer
    "
  >

    <option value="ALL">
      {t('Tất cả danh mục', 'All Categories')}
    </option>


    {categories.map((cat)=>(
      <option
        key={cat.id}
        value={cat.id}
      >
        {cat.name}
      </option>
    ))}

  </select>
</div>

        <div className="flex gap-2">
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">{t('Tất cả độ khó', 'All Difficulties')}</option>
              <option value="EASY">{t('Dễ (Easy)', 'Easy')}</option>
              <option value="MEDIUM">{t('Trung bình (Medium)', 'Medium')}</option>
              <option value="HARD">{t('Khó (Hard)', 'Hard')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* BẢNG DANH SÁCH BÀI TẬP */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="p-3.5 pl-5">{t('Tên Bài Tập', 'Problem Title')}</th>
                <th className="p-3.5">{t('Danh Mục', 'Categories')}</th>
                <th className="p-3.5">{t('Độ Khó', 'Difficulty')}</th>
                <th className="p-3.5">{t('Giới Hạn', 'Limits')}</th>
                <th className="p-3.5">{t('Testcases / Lượt Nộp', 'Testcases / Submissions')}</th>
                <th className="p-3.5">{t('Trạng Thái', 'Status')}</th>
                <th className="p-3.5 pr-5 text-right">{t('Thao Tác', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    {t('Đang tải danh sách bài tập từ hệ thống...', 'Loading problems list...')}
                  </td>
                </tr>
              ) : currentProblems.length > 0 ? (
                currentProblems.map((prob) => {
                  const tcCount = prob._count?.testcases ?? prob._count?.testCases ?? prob.testcases?.length ?? 0;
                  const subCount = prob._count?.submissions ?? 0;

                  return (
                    <tr key={prob.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pl-5">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{prob.title}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{prob.slug}</p>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {prob.categories && prob.categories.length > 0 ? (
                            prob.categories.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-semibold border border-slate-200/60 dark:border-slate-700/50">
                                {c.category?.name || 'Category'}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">{t('Chưa phân loại', 'Uncategorized')}</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                          prob.difficulty === 'EASY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' :
                          prob.difficulty === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' : 
                          'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                        }`}>
                          {prob.difficulty}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-500 dark:text-slate-400 space-y-0.5 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{prob.timeLimit} ms</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          <span>{prob.memoryLimit} MB</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        <div className="flex gap-3">
                          <span>TC: <b className="text-slate-900 dark:text-white">{tcCount}</b></span>
                          <span>Submits: <b className="text-slate-900 dark:text-white">{subCount}</b></span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {prob.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t('Hoạt động', 'Active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> {t('Ẩn', 'Hidden')}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(prob.id)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                            title={t('Sửa bài tập', 'Edit problem')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProblem(prob.id, prob.title)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                            title={t('Xóa bài tập', 'Delete problem')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    {t('Chưa có bài tập nào hoặc không khớp bộ lọc.', 'No problems found or matching filter.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* THANH PHÂN TRANG (PAGINATION CONTROLS) */}
        {!loading && filteredProblems.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>{t('Hiển thị', 'Show')}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>
                {t('bài/trang (Tổng', 'items/page (Total')} <strong className="text-slate-900 dark:text-white">{filteredProblems.length}</strong> {t('bài tập)', 'problems)')}
              </span>
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
        )}
      </div>

      {isCategoryModalOpen && (

<div
className="
fixed inset-0 z-50 
flex items-center justify-center 
bg-slate-900/60 backdrop-blur-sm
"
>


<div
className="
bg-white dark:bg-slate-900
w-full max-w-md
rounded-2xl
shadow-xl
border
border-slate-200
dark:border-slate-800
p-6
"
>


<div className="flex justify-between items-center mb-5">

<h3 className="
font-bold
text-sm
text-slate-900
dark:text-white
">
{t(
'Thêm Danh Mục',
'Add Category'
)}
</h3>


<button
onClick={()=>{
 setIsCategoryModalOpen(false)
}}
>
<X className="w-5 h-5"/>
</button>


</div>



<label className="
block
text-xs
font-bold
mb-2
">
{t(
'Tên danh mục',
'Category Name'
)}
</label>


<input
value={categoryName}
onChange={(e)=>
 setCategoryName(e.target.value)
}
placeholder="
Ví dụ: Dynamic Programming
"
className="
w-full
px-3 py-2
rounded-xl
border
bg-slate-50
dark:bg-slate-950
border-slate-200
dark:border-slate-800
text-sm
"
/>



<div className="
flex justify-end
gap-2
mt-5
">


<button
onClick={()=>{
setIsCategoryModalOpen(false)
}}
className="
px-4 py-2
rounded-xl
text-xs
font-bold
border
"
>
{t('Hủy','Cancel')}
</button>



<button
disabled={creatingCategory}
onClick={handleCreateCategory}
className="
px-4 py-2
rounded-xl
bg-emerald-600
text-white
text-xs
font-bold
"
>
{
creatingCategory
?
t('Đang tạo...','Creating...')
:
t('Tạo danh mục','Create')
}
</button>


</div>


</div>


</div>

)}

      {/* MODAL THÊM / SỬA BÀI TẬP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-all">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{editingProblemId ? t('Chỉnh Sửa Bài Tập', 'Edit Problem') : t('Tạo Bài Tập Mới', 'Create New Problem')}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('Tiêu đề bài tập *', 'Problem Title *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('Ví dụ: Hai số có tổng bằng Target (Two Sum)', 'E.g., Two Sum')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('Mô tả chi tiết (Định dạng Markdown) *', 'Detailed Description (Markdown Format) *')}
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={t('Cho một mảng số nguyên nums và một số nguyên target...', 'Given an array of integers nums and an integer target...')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {t('Độ khó', 'Difficulty')}
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="EASY">{t('Dễ (Easy)', 'Easy')}</option>
                    <option value="MEDIUM">{t('Trung bình (Medium)', 'Medium')}</option>
                    <option value="HARD">{t('Khó (Hard)', 'Hard')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {t('Giới hạn thời gian (ms)', 'Time Limit (ms)')}
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {t('Giới hạn bộ nhớ (MB)', 'Memory Limit (MB)')}
                  </label>
                  <input
                    type="number"
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('Danh mục (Chọn ít nhất 1) *', 'Categories (Select at least 1) *')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                          } else {
                            setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  {t('Hiển thị bài tập này cho Học sinh/Sinh viên', 'Show this problem to Students')}
                </label>
              </div>

              {/* QUẢN LÝ TẬP TESTCASES */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-xs">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{t('Bộ Testcases', 'Testcases Set')} ({testcases.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestcase}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{t('Thêm Testcase', 'Add Testcase')}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {testcases.map((tc, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-500 dark:text-slate-400">
                          {t('Testcase #', 'Testcase #')}{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => handleTestcaseChange(idx, 'isHidden', e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                            />
                            <span>{t('Test ẩn', 'Hidden Test')}</span>
                          </label>

                          {testcases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestcase(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title={t('Xóa Testcase', 'Remove Testcase')}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">
                            {t('Dữ liệu đầu vào (Input)', 'Input Data')}
                          </label>
                          <textarea
                            rows={2}
                            value={tc.inputData}
                            onChange={(e) => handleTestcaseChange(idx, 'inputData', e.target.value)}
                            placeholder={t('Dữ liệu Input mẫu...', 'Sample input data...')}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">
                            {t('Kết quả mong đợi (Output)', 'Expected Output')}
                          </label>
                          <textarea
                            rows={2}
                            value={tc.expectedOutput}
                            onChange={(e) => handleTestcaseChange(idx, 'expectedOutput', e.target.value)}
                            placeholder={t('Kết quả Output mong đợi...', 'Expected output data...')}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FOOTER NÚT THAO TÁC MODAL */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('Hủy', 'Cancel')}
                </button>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting 
                    ? t('Đang lưu...', 'Saving...') 
                    : editingProblemId 
                      ? t('Lưu Thay Đổi', 'Save Changes') 
                      : t('Tạo Bài Tập', 'Create Problem')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProblems;