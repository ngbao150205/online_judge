// src/app.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import problemAdminRoutes from './routes/problem.admin.routes';
import categoryRoutes from './routes/category.routes';
import studentRoutes from './routes/student.routes';
import userRoutes from './routes/user.routes';

const app = express();

// 1. Cho phép Frontend React truy cập API
app.use(cors());

// 2. Giải mã JSON Body
app.use(express.json());

// 3. LOGGER MIDDLEWARE (Phải đặt TRƯỚC router để bắt mọi request đi vào)
app.use((req, res, next) => {
  console.log(`\n--------------------------------------------------`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`Headers:`, req.headers);
  console.log(`Body:`, req.body);
  
  res.on('finish', () => {
    console.log(`Response Status: ${res.statusCode}`);
  });
  
  next();
});

// 4. Mount Router (Đặt SAU middleware logger)
app.use('/api/v1/auth', authRoutes);

// API Quản lý Bài tập dành riêng cho Admin/Giảng viên
app.use('/api/v1/admin/problems', problemAdminRoutes);

//categories:
app.use('/api/v1/categories', categoryRoutes);

//student route:
app.use('/api/v1', studentRoutes);

//profile:
app.use('/api/v1/users', userRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});