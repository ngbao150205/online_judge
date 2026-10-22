# Judge System Monorepo

Hệ thống chấm bài gồm React frontend, Node.js/TypeScript backend, Go sandbox worker, PostgreSQL, Redis và SQS.

Triển khai lần đầu hoặc khi cập nhật migration/queue, chạy từ root:

```sh
sh docker/deploy.sh
```

Những lần khởi động thông thường dùng `docker compose up -d`, rồi truy cập http://localhost:8080. Hệ thống có **5 container thường trực**: frontend, backend (gồm result consumer/maintenance), Go sandbox worker, PostgreSQL và Redis. Hàng đợi sử dụng **AWS SQS**, không chạy ElasticMQ trong Compose chính.

Máy mới cần tạo `.env` bằng `node docker/setup-env.mjs` và cấu hình AWS SQS. Nếu `backend/.env` đã có cấu hình AWS thật, dùng `node docker/configure-aws.mjs --from-backend` để chuyển sang `.env` root. Migration/khởi tạo queue chỉ chạy trong lệnh triển khai riêng; khởi động API chỉ kiểm tra trạng thái.

Xem [DOCKER.md](DOCKER.md) cho cấu hình container, volume/database, backup, kiểm thử Python/C++ và AWS SQS. Xem [backend/README.md](backend/README.md) cho cấu trúc và luồng xử lý backend.

Luồng đăng ký, đăng nhập, OTP, hồ sơ và quản lý user được mô tả trong [ACCOUNT_USER_FLOWS.md](ACCOUNT_USER_FLOWS.md).
