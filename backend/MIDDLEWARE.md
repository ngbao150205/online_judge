# Middleware backend

## Luồng request

Middleware HTTP/log → JSON parser → router → authenticate → authorize (nếu cần) → validation → controller → service.

`notFound` đứng sau toàn bộ router. `errorHandler` đứng cuối cùng để nhận lỗi JSON parser, middleware và lỗi chưa được controller xử lý. Middleware HTTP không in header/body/query, JWT, password hoặc OTP của request.

## Trách nhiệm và vị trí

| File | Công dụng |
| --- | --- |
| `src/middlewares/auth.middleware.ts` | Đọc cookie `HttpOnly` `judge_session`, xác minh JWT và session trong DB, lấy role mới nhất rồi phân quyền. Bearer token không được nhận. |
| `src/middlewares/rate-limit.middleware.ts` | Redis Lua counter/TTL theo IP/email/user; trả 429 + Retry-After, 503 khi Redis lỗi. |
| `src/middlewares/validation.middleware.ts` | Áp schema cho body/query/params trước khi gọi controller. |
| `src/validation/request.schemas.ts` | Quy định kiểu, định dạng, giới hạn và các alias đầu vào của từng endpoint. |
| `src/middlewares/error.middleware.ts` | Response JSON cho AppError, JSON hỏng, payload quá lớn, encoding không hỗ trợ, 404 và lỗi ngoài dự kiến. |
| `src/errors/app-error.ts` | Lỗi có HTTP status, mã và chi tiết an toàn để trả về client. |
| `src/middlewares/request-logger.middleware.ts` | Log method, path, status và thời gian; bỏ query/header/body. |

## Xác thực và phân quyền

- JWT chỉ được xác minh với HS256, phù hợp token do backend hiện tại tạo.
- JWT được gửi trong cookie `judge_session` có HttpOnly, SameSite=Lax, Path=/api; Secure được bật trong production. Frontend gửi cookie bằng Axios credentials hoặc `apiFetch`.
- Payload phải có UUID `userId`, role `STUDENT` hoặc `ADMIN` và `exp` hợp lệ. Token sai/hết hạn trả 401.
- `authorize('ADMIN')` trả 401 khi chưa xác thực, 403 khi không có quyền.
- `authorizeAdmin` được giữ như alias của `authorize('ADMIN')`, không có logic phân quyền riêng.
- `authenticate` xác minh token, đọc `AuthSession` và User từ PostgreSQL, từ chối session revoked/hết hạn, user soft-deleted hoặc tokenVersion cũ; role trong request luôn lấy từ DB. Lỗi service được chuyển tiếp ngoài khối catch JWT.
- Nhóm admin/submission/AI kiểm tra xác thực trước validation; route public áp validation trực tiếp.

Login/Google trả user công khai và đặt JWT bằng Set-Cookie; JWT không được trả về JavaScript hay lưu trong Web Storage. Logout thu hồi session hiện tại; logout-all/đổi/reset password tăng tokenVersion. JWT_SECRET bắt buộc từ config/env.ts, không có fallback.

## Validation

Validation sử dụng Zod. Body đã hợp lệ được thay bằng dữ liệu chuẩn hóa; trường ngoài schema bị loại. Query/params chỉ được kiểm tra, không ghi đè getter `req.query` của Express 5. Controller hiện vẫn đọc query dạng chuỗi và chuyển đổi như trước.

- Email trim và chuyển chữ thường; tên trim. Mã nguồn/input/password không bị trim khi truyền xuống controller.
- UUID được kiểm tra cho các ID tài nguyên, categoryIds, problemId và bài trong roadmap.
- `runId` phải có dạng `run-<UUID>`; slug không rỗng và dài tối đa 250 ký tự.
- Ngôn ngữ thực thi chấp nhận `python` hoặc `cpp`, khớp Go Worker hiện tại.
- Mã nguồn tối đa 64 KiB UTF-8; input/output testcase và errorMessage tối đa 64 KiB mỗi trường.
- JSON request tối đa 1 MiB. Giới hạn tổng request có thể nhỏ hơn tổng các giới hạn từng trường.
- Time limit bài tập là số nguyên 1–60000 ms; memory limit là số nguyên 1–1024 MiB. Middleware kiểm tra cấu hình, không đảm bảo compiler chạy được với mọi giới hạn nhỏ.
- Query page là số nguyên dương tối đa 1000000; limit tối đa 100. Không nhận query số âm, số lẻ hoặc mảng từ tham số lặp.
- Difficulty/role phải thuộc enum. Category IDs và bài trong roadmap không được trùng.
- Tạo problem yêu cầu title, description, categoryIds; tạo roadmap yêu cầu title; cập nhật các tài nguyên phải có ít nhất một trường hợp lệ.
- Password mới tối thiểu 6 ký tự và tối đa 72 byte UTF-8 để tránh cắt ngầm đầu vào bcrypt. Login cho phép mật khẩu cũ dài hơn để giữ khả năng đăng nhập tài khoản hiện có.
- Alias được giữ: reset password dùng `otp`/`token`; đổi mật khẩu dùng `currentPassword`/`oldPassword`; quản trị user dùng `pwd`/`password`. Nếu gửi cả hai alias khác nhau, request bị từ chối. `password` quản trị user được chuẩn hóa thành `pwd` đúng trường controller/service đang đọc. Password quản trị rỗng chỉ được phép khi update để giữ nguyên; create phải có password riêng.

Validation không kiểm tra tài nguyên có tồn tại, quyền sở hữu, điều kiện mở khóa bài hay trạng thái submission: đây là nghiệp vụ của service. Reset password nay yêu cầu email để gắn OTP đúng tài khoản; service tiêu thụ mã bằng update có điều kiện.

## Response lỗi

```json
{
  "success": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "code": "VALIDATION_ERROR",
  "details": [{ "field": "body.problemId", "message": "Invalid UUID" }]
}
```

Các mã chính: `UNAUTHENTICATED`/`INVALID_TOKEN` (401), `FORBIDDEN` (403), `VALIDATION_ERROR`/`INVALID_JSON` (400), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_ENCODING` (415), `NOT_FOUND` (404), `INTERNAL_ERROR` (500).

Lỗi ngoài dự kiến không trả raw error, stack hay thông tin kết nối cho client. Controller đã được chuẩn hóa thành async handler không tự catch lỗi; Express 5 chuyển promise reject đến errorHandler. Service ném AppError cho lỗi nghiệp vụ. ErrorHandler xử lý lỗi Prisma phổ biến và che raw infrastructure errors. Bài chính thức đã nhận vào outbox không báo lỗi dispatch ngay trong HTTP request. Xem [CONTROLLERS.md](CONTROLLERS.md). Các log riêng của worker chưa được thay bằng request logger mới.

## Kiểm tra

Trong `backend/`:

```sh
npm run typecheck
npm test
```

`npm test` build mã ESM và chạy kiểm tra routes/middleware/controller. Test routes/middleware thay controller bằng stub; test controller dùng controller/service thật và giả lập client infrastructure, không gọi database/SQS/email thật. Integration Redis/PostgreSQL tạm chỉ chạy khi opt-in; xem README.md. Kiểm tra gồm 51 endpoint/153 lượt gọi theo quyền, JWT sai/hết hạn/thuật toán không phù hợp, validation request, thứ tự auth trước validation, chuẩn hóa alias, lỗi JSON/413/404/500 và log không chứa credential trong header/body/query.

Chạy riêng: `npm run test:routes` hoặc `npm run test:middleware`. Các kiểm tra này không thay cho kiểm thử nghiệp vụ hoặc tích hợp infrastructure.

## Giới hạn và thu hồi phiên

Login: 20 request/IP/15 phút và 10 request/email/15 phút; Google login chung budget IP. Register: 10/IP/15 phút. Gửi OTP: 10/IP và 3/email/15 phút. Verify OTP: 5/email/15 phút và budget IP login. Run/trial/submit: 30/user/phút; AI: 10/user/phút. Counter Redis atomic + TTL; email chuẩn hóa và hash trước làm key. Unit test tắt RATE_LIMIT_ENABLED để cô lập tầng routing; production từ chối cấu hình tắt, Docker integration kiểm tra Redis thật.

JWT hợp lệ còn phải có AuthSession chưa revoke/chưa hết hạn, user chưa soft-deleted và tokenVersion khớp DB. Role luôn lấy từ DB; logout-all/đổi/reset mật khẩu tăng version. OTP 6 số được lưu HMAC gắn email, không lưu plaintext. Token/OTP từ phiên bản cũ cần tạo lại.

CORS_ORIGINS chỉ chấp nhận danh sách origin cụ thể; không cấp CORS header cho origin khác. TRUST_PROXY_HOPS=0 chạy trực tiếp, Compose qua Nginx=1. CORS là chính sách browser, không thay thế authentication cho HTTP client khác.
