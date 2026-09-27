import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Database, Trash2, BookOpen, Map } from 'lucide-react';
import axios from 'axios';

interface CategoryRel {
  category: { id: string; name: string };
}

interface TestcaseRel {
  isHidden: boolean;
}

interface ProblemItem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  isActive: boolean;
  timeLimit: number;
  memoryLimit: number;
  categories: CategoryRel[];
  testcases: TestcaseRel[];
}

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  problems: any[];
}

export const ProblemAdminManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'problems' | 'roadmaps'>('problems');
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/v1/admin/problems', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProblems(res.data?.data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách bài tập:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoadmaps = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/api/v1/admin/roadmaps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoadmaps(res.data?.data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách lộ trình:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'problems') {
      fetchProblems();
    } else {
      fetchRoadmaps();
    }
  }, [activeTab]);

  const handleToggleStatus = async (problem: ProblemItem) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5001/api/v1/admin/problems/${problem.id}`,
        { isActive: !problem.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProblems();
    } catch (error) {
      alert('Không thể cập nhật trạng thái');
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài tập này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/v1/admin/problems/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProblems();
    } catch (error) {
      alert('Lỗi khi xóa bài tập');
    }
  };

  const filteredProblems = problems.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search);
    const matchCategory =
      selectedCategory === 'ALL' ||
      p.categories.some((c) => c.category.id === selectedCategory || c.category.name === selectedCategory);
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 p-4">
      {/* TABS HEADER */}
      <div className="flex items-center space-x-6 border-b border-sky-100 pb-2">
        <button
          onClick={() => setActiveTab('problems')}
          className={`flex items-center space-x-2 text-sm font-bold pb-2 transition-all border-b-2 ${
            activeTab === 'problems'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>📚 Ngân hàng Bài tập ({problems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roadmaps')}
          className={`flex items-center space-x-2 text-sm font-bold pb-2 transition-all border-b-2 ${
            activeTab === 'roadmaps'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>🗺️ Quản lý Lộ trình Học tập ({roadmaps.length} Lộ trình)</span>
        </button>
      </div>

      {activeTab === 'problems' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên bài tập hoặc ID..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              >
                <option value="ALL">Tất cả danh mục</option>
                <option value="Nhập môn">Nhập môn</option>
                <option value="Cơ bản">Cơ bản</option>
                <option value="Quy hoạch động">Quy hoạch động</option>
              </select>
            </div>

            <button className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all">
              <Plus className="w-4 h-4" />
              <span>+ Tạo Bài tập mới</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-sky-50/60 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                    <th className="p-4">MÃ ID</th>
                    <th className="p-4">TÊN BÀI TẬP</th>
                    <th className="p-4">DANH MỤC</th>
                    <th className="p-4">GIỚI HẠN CPU / RAM</th>
                    <th className="p-4">BỘ TESTCASES</th>
                    <th className="p-4">TRẠNG THÁI</th>
                    <th className="p-4 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Đang tải danh sách bài tập...</td></tr>
                  ) : filteredProblems.length > 0 ? (
                    filteredProblems.map((p) => {
                      const samples = p.testcases ? p.testcases.filter((tc) => !tc.isHidden).length : 0;
                      const hiddens = p.testcases ? p.testcases.filter((tc) => tc.isHidden).length : 0;
                      const categoryName = p.categories[0]?.category?.name || 'Chưa phân loại';

                      return (
                        <tr key={p.id} className="hover:bg-sky-50/30 transition-colors">
                          <td className="p-4 font-bold text-slate-800 font-mono">p{p.id.slice(0, 3)}</td>
                          <td className="p-4 font-bold text-slate-800">{p.title}</td>
                          <td className="p-4 text-slate-500">{categoryName}</td>
                          <td className="p-4 font-mono">
                            {(p.timeLimit / 1000).toFixed(1)}s / {p.memoryLimit}MB
                          </td>
                          <td className="p-4">{samples} Mẫu / {hiddens} Ẩn</td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleStatus(p)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                p.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {p.isActive ? 'Hiển thị' : 'Tạm ẩn'}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button className="px-2.5 py-1 bg-sky-100 text-sky-700 font-bold rounded-lg text-[11px] flex items-center gap-1">
                                <Edit2 className="w-3 h-3" /> Sửa
                              </button>
                              <button className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] flex items-center gap-1">
                                <Database className="w-3 h-3" /> Testcases
                              </button>
                              <button
                                onClick={() => handleDeleteProblem(p.id)}
                                className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Không tìm thấy bài tập nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Danh sách Lộ trình Học tập</h3>
            <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Tạo Lộ trình mới</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-sky-50/60 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <th className="p-4">TÊN LỘ TRÌNH</th>
                  <th className="p-4">MÔ TẢ</th>
                  <th className="p-4 text-center">SỐ BÀI TẬP</th>
                  <th className="p-4">TRẠNG THÁI</th>
                  <th className="p-4 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {roadmaps.map((r) => (
                  <tr key={r.id} className="hover:bg-sky-50/30">
                    <td className="p-4 font-bold text-slate-800">{r.title}</td>
                    <td className="p-4 text-slate-500">{r.description || 'Chưa có mô tả'}</td>
                    <td className="p-4 text-center font-bold text-sky-600">{r.problems?.length || 0} bài</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {r.isActive ? 'Đang bật' : 'Tạm ẩn'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="px-2.5 py-1 bg-sky-100 text-sky-700 font-bold rounded-lg text-[11px] mr-2">Sửa</button>
                      <button className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px]">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};