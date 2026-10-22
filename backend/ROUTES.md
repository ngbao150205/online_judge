# Tổ chức routes và hợp đồng API

`src/routes/index.ts` là nơi gắn các nhóm vào `/api`. `app.ts` chỉ mount router này, không quản lý từng nhóm nghiệp vụ.

- `auth.routes.ts`: đăng nhập/đăng ký và tài khoản hiện tại.
- `admin.routes.ts`: áp xác thực và quyền ADMIN cho toàn nhóm; router con trong `admin/` quản lý dashboard, user, problem, roadmap, category.
- `student.routes.ts`: ghép API công khai và API của người đăng nhập; không giới hạn vai trò STUDENT vì ADMIN vẫn cần dùng các chức năng học/chạy mã.
- `student/problem.routes.ts`, `roadmap.routes.ts`: tách quyền giữa danh sách và chi tiết theo hành vi hiện có.
- `student/submission.routes.ts`, `ai.routes.ts`: áp xác thực cho toàn nhóm.
- `student/profile.routes.ts`: giữ alias profile của frontend hiện tại.

Giữ 48 endpoint cũ, thêm logout, logout-all và lịch sử phiên bản testcase: tổng 51 endpoint. `/problems` vẫn yêu cầu đăng nhập để trả trạng thái đã giải; `/problems/:slug` vẫn công khai. Bảng này mô tả trạng thái hiện tại, không tuyên bố mọi endpoint đều đã hoàn thiện nghiệp vụ.

## Endpoint

| Method | URL | Quyền |
| --- | --- | --- |
| POST | `/api/auth/register` | Công khai |
| POST | `/api/auth/login` | Công khai |
| POST | `/api/auth/google` | Công khai |
| POST | `/api/auth/forgot-password` | Công khai |
| POST | `/api/auth/reset-password` | Công khai |
| GET | `/api/auth/me` | Đăng nhập (STUDENT hoặc ADMIN) |
| PUT | `/api/auth/me` | Đăng nhập (STUDENT hoặc ADMIN) |
| PUT | `/api/auth/change-password` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/admin/stats` | Đăng nhập + ADMIN |
| GET | `/api/admin/submissions/live` | Đăng nhập + ADMIN |
| GET | `/api/admin/workers` | Đăng nhập + ADMIN |
| GET | `/api/admin/alerts` | Đăng nhập + ADMIN |
| GET | `/api/admin/analytics` | Đăng nhập + ADMIN |
| GET | `/api/admin/users` | Đăng nhập + ADMIN |
| POST | `/api/admin/users` | Đăng nhập + ADMIN |
| PUT | `/api/admin/users/:id` | Đăng nhập + ADMIN |
| DELETE | `/api/admin/users/:id` | Đăng nhập + ADMIN |
| GET | `/api/admin/problems` | Đăng nhập + ADMIN |
| GET | `/api/admin/problems/:id` | Đăng nhập + ADMIN |
| POST | `/api/admin/problems` | Đăng nhập + ADMIN |
| PUT | `/api/admin/problems/:id` | Đăng nhập + ADMIN |
| DELETE | `/api/admin/problems/:id` | Đăng nhập + ADMIN |
| GET | `/api/admin/roadmaps` | Đăng nhập + ADMIN |
| POST | `/api/admin/roadmaps` | Đăng nhập + ADMIN |
| PUT | `/api/admin/roadmaps/:id` | Đăng nhập + ADMIN |
| DELETE | `/api/admin/roadmaps/:id` | Đăng nhập + ADMIN |
| GET | `/api/admin/categories` | Đăng nhập + ADMIN |
| POST | `/api/admin/categories` | Đăng nhập + ADMIN |
| PUT | `/api/admin/categories/:id` | Đăng nhập + ADMIN |
| DELETE | `/api/admin/categories/:id` | Đăng nhập + ADMIN |
| GET | `/api/problems` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/problems/:slug` | Công khai |
| GET | `/api/roadmaps` | Công khai |
| GET | `/api/categories` | Công khai |
| POST | `/api/submissions/run` | Đăng nhập (STUDENT hoặc ADMIN) |
| POST | `/api/submissions/run-problem` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/submissions/run-status/:runId` | Đăng nhập (STUDENT hoặc ADMIN) |
| POST | `/api/submissions` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/submissions/history` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/submissions/history/:id` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/submissions/my` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/submissions/:id` | Đăng nhập (STUDENT hoặc ADMIN) |
| POST | `/api/ai/explain` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/roadmaps/:id` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/users/profile` | Đăng nhập (STUDENT hoặc ADMIN) |
| PUT | `/api/users/profile` | Đăng nhập (STUDENT hoặc ADMIN) |
| PUT | `/api/users/change-password` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/leaderboard` | Công khai |
| POST | `/api/auth/logout` | Công khai; thu hồi phiên từ cookie hợp lệ nếu có và luôn xóa cookie trên client |
| POST | `/api/auth/logout-all` | Đăng nhập (STUDENT hoặc ADMIN) |
| GET | `/api/admin/problems/:id/testcases/versions` | Đăng nhập + ADMIN |

`GET /health` nằm ngoài /api, kiểm tra PostgreSQL/Redis và không yêu cầu JWT. `/leaderboard` hỗ trợ page/limit; DELETE tài nguyên là soft delete. Các request riêng tư đọc session/role từ DB; login/OTP/chạy mã/AI có rate limit.

## Quy tắc khi bổ sung route

1. Thêm endpoint vào router chức năng tương ứng; không thêm tất cả vào router tổng.
2. Với nhóm hoàn toàn riêng tư, đặt xác thực ở router cha/nhóm để endpoint mới không bỏ sót bảo vệ. Route hỗn hợp công khai/riêng tư phải gắn xác thực rõ ràng trên endpoint.
3. Route có tên cố định như `/history`, `/my` phải đứng trước `/:id`.
4. Router admin con kế thừa bảo vệ từ `admin.routes.ts`; không mount trực tiếp vào router tổng.
5. Không xóa alias khi frontend/client còn dùng. `/users/profile` và `/users/change-password` tương ứng `/auth/me` và `/auth/change-password`; `/submissions/my` là alias danh sách lịch sử. `/submissions/:id` còn dùng cho polling nên vẫn là endpoint đang hoạt động.
6. Middleware validation và xử lý lỗi chung đã được gắn vào routes; xem [MIDDLEWARE.md](MIDDLEWARE.md). Controller đã gọi service và chuyển lỗi nghiệp vụ qua errorHandler; xem [CONTROLLERS.md](CONTROLLERS.md). Run Redis đã có owner/TTL trong service; xem README.md.

Router hoàn toàn riêng tư áp middleware trước khi khớp endpoint, nên URL chưa tồn tại dưới `/admin`, `/submissions`, `/ai` cũng có thể trả 401 cho người chưa đăng nhập. Khi đã đăng nhập đúng quyền, URL không khớp trả 404. Các URL sai ngoài nhóm riêng tư vẫn trả 404.

## Kiểm tra hồi quy

Trong `backend/`, chạy `npm run test:routes`. Bộ kiểm tra dùng HTTP thật trên cổng tạm, JWT kiểm tra và thay controller bằng handler đánh dấu; không gọi database/SQS hay ghi dữ liệu. Nó đối chiếu 51 endpoint (48 cũ + 3 mới), tổng 153 request theo quyền, kiểm tra controller được chọn, tham số, quyền công khai/đăng nhập/ADMIN, token sai và route không tồn tại. Đây là kiểm tra tầng routing, không kiểm chứng nghiệp vụ của controller/service.
