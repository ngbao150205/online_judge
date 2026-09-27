// src/App.tsx
import React from 'react';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import AppLayout from './layouts/appLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { StudentHome } from './pages/StudentHome';
import { StudentProblem } from './pages/StudentProblem'; // 🟢 IMPORT TRANG BÀI TẬP MỚI
import { StudentRoadmaps } from './pages/StudentRoadmaps';
import { StudentRoadmapDetail } from './pages/StudentRoadmapDetail';
import { AdminHome } from './pages/AdminHome';
import { Profile } from './pages/Profile';
import { AdminProblems } from './pages/AdminProblems';
import { AdminRoadmaps } from './pages/AdminRoadmaps';
import  Workspace from './components/workspace/Workspace';
import {AdminUsers} from './pages/AdminUsers';
import {Leaderboard} from './components/Leaderboard';
import SubmissionHistoryPage from './pages/SubmissionHistoryPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 🟡 CÁC TRANG XÁC THỰC (Không dùng Header/Layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/workspace/:slug" element={<Workspace />} />

          {/* 🟢 TẤT CẢ CÁC TRANG SỬ DỤNG APPLAYOUT */}
          <Route element={<AppLayout />}>
            {/* 🔹 TRANG CÁ NHÂN */}

            {/* 🔹 NHÓM SINH VIÊN */}
            <Route path="/" element={<StudentHome />} /> {/* Trang chủ giới thiệu & dẫn hướng */}
            <Route path="/problems" element={<StudentProblem />} /> {/* 🟢 Ngân hàng bài tập tự do */}
            <Route path="/roadmaps" element={<StudentRoadmaps />} />
            <Route path="/roadmaps/:id" element={<StudentRoadmapDetail />} />
            <Route path="history" element={<SubmissionHistoryPage />} />

            {/* 🔹 NHÓM QUẢN TRỊ ADMIN */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminHome />} />
            <Route path="/admin/problems" element={<AdminProblems />} />
            <Route path="/admin/roadmaps" element={<AdminRoadmaps />} />
            <Route
              path="/admin/users"
              element={<AdminUsers />}
            />
            <Route
              path="/admin/settings"
              element={
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  ⚙️ Cấu hình Hệ thống (Đang cập nhật)
                </div>
              }
            />
          </Route>

          <Route path="/" element={<AppLayout />}>
            <Route path="leaderboard" element={<Leaderboard />} />
            {/* Các routes khác */}
          </Route>

          {/* Fallback điều hướng về Trang chủ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;