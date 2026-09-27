// src/app.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// 3 Bộ route đã gôm nhóm gọn gàng
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import adminRoutes from './routes/admin.routes';

import { pollResults } from './workers/result.worker';

const app = express();

// 1. Cho phép Frontend React truy cập API
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless"); // Hoặc dùng "require-corp" nếu cần chặt chẽ hơn
  next();
});
app.set('etag', false);
app.use(morgan('dev'));

// 2. Giải mã JSON Body
app.use(express.json());

// 3. LOGGER MIDDLEWARE (Giữ nguyên để theo dõi Request)
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

// 4. MOUNT ROUTER (Đăng ký 3 nhóm route chính)
app.use('/api/auth', authRoutes);   // Đăng ký, Đăng nhập, Quên mật khẩu, Profile Auth
app.use('/api', studentRoutes);      // Bài tập Public, Lộ trình Sinh viên, Nộp bài, Profile User
app.use('/api/admin', adminRoutes);  // Tất cả chức năng Quản trị viên (Dashboard, Bài tập, Lộ trình, Category)

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);

  pollResults();
  console.log(`[Worker] Tiến trình lắng nghe kết quả SQS đã được kích hoạt thành công.`);
});