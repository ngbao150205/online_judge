import Redis from 'ioredis';

// Lấy URI kết nối từ biến môi trường (.env) hoặc dùng mặc định localhost
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Khởi tạo client kết nối Redis
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay; // Thử lại sau mỗi khoảng thời gian tăng dần nếu mất kết nối
  },
});

// Bắt sự kiện kết nối thành công
redisClient.on('connect', () => {
  console.log('✅ Kết nối Redis thành công!');
});

// Bắt sự kiện lỗi kết nối
redisClient.on('error', (err) => {
  console.error('❌ Lỗi kết nối Redis:', err.message);
});