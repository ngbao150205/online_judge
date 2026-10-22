# Tổ chức controller backend

## Quy tắc thống nhất

Controller là lớp chuyển tiếp HTTP: đọc dữ liệu đã được middleware validation kiểm tra, lấy người dùng từ request nếu cần, gọi service và trả response thành công. Controller không truy vấn Prisma, Redis, SQS, gửi email hoặc thực thi mã nguồn; không tự bắt mọi lỗi rồi chuyển thành HTTP 400/500.

Luồng hiện tại: route → xác thực/phân quyền → validation → controller → service → hạ tầng. Service trả dữ liệu thuần hoặc ném AppError. Express 5 tự chuyển promise reject từ async controller đến errorHandler.

Ví dụ:

```ts
export async function getSubmissionDetail(req: ControllerRequest, res: Response): Promise<void> {
  const data = await getSubmissionDetailService(currentUserId(req), req.params.id);
  sendSuccess(res, { data });
}
```

`controller.utils.ts` chỉ hỗ trợ HTTP: `ControllerRequest<Body>` cung cấp kiểu request/body, `currentUserId` lấy danh tính đã xác thực, và `sendSuccess` giữ response `{ success: true, ...payload }`. Validation không bị lặp lại trong controller. Với route riêng tư không cần userId cho service, xác thực vẫn do router thực hiện.

## Phân bổ file

| Controller | Trách nhiệm HTTP | Service được gọi |
| --- | --- | --- |
| `common/auth.controller.ts` | Tài khoản, Google, mật khẩu và profile | `auth.service.ts` |
| `common/category.controller.ts` | Danh mục công khai/quản trị | `category.service.ts` |
| `admin/user.controller.ts` | CRUD tài khoản quản trị | `user.admin.service.ts` |
| `admin/problem.controller.ts` | CRUD bài tập | `problem.admin.service.ts` |
| `admin/roadmap.controller.ts` | CRUD lộ trình | `roadmap.admin.service.ts` |
| `admin/dashboard.controller.ts` | Thống kê và monitoring | `dashboard.service.ts` |
| `student/problem.controller.ts` | Danh sách/chi tiết bài dành cho người học | `problem.student.service.ts` |
| `student/roadmap.controller.ts` | Lộ trình và tiến độ cá nhân | `roadmap.student.service.ts` |
| `student/leaderboard.controller.ts` | Bảng xếp hạng | `leaderboard.service.ts` |
| `student/ai.controller.ts` | Gợi ý giải thích lỗi | `ai.service.ts` |
| `student/execution.controller.ts` | Chạy input tùy ý, chạy testcase public, trạng thái run | `execution/run.service.ts`, `execution/status.service.ts` |
| `student/submission.controller.ts` | Nộp chính thức, lịch sử, chi tiết | `submission/submit.service.ts`, `history.service.ts`, `detail.service.ts` |

Controller submission cũ 851 dòng được thay bằng controller chính thức 22 dòng và execution controller 21 dòng. Các controller nghiệp vụ hiện nằm trong khoảng 9–47 dòng. Mục tiêu là trách nhiệm rõ ràng, không phải giới hạn số dòng cố định.

## Tách nghiệp vụ nộp/chạy mã

- `submission/submit.service.ts`: tạo submission và các kết quả PENDING, gửi từng testcase, chuyển IN_PROGRESS có điều kiện, xử lý lỗi gửi job bằng transaction/row lock. Lỗi gửi bài giữ `submissionId` ở response để client theo dõi.
- `submission/history.service.ts`: truy vấn lịch sử theo userId, phân trang và tính số testcase hoàn thành/đạt/thất bại.
- `submission/detail.service.ts`: kiểm tra bài nộp thuộc người dùng, sắp xếp kết quả và áp chính sách hiển thị testcase hiện tại.
- `execution/run.service.ts`: chọn giới hạn tài nguyên, testcase public và tạo job chạy thử; không tạo lịch sử nộp chính thức.
- `execution/status.service.ts`: đọc kết quả Redis, giữ dạng response polling trước refactor.
- `judge-queue.service.ts`: kiểm tra cấu hình job queue và gửi payload SQS, dùng chung cho chạy thử và nộp chính thức.
- `types/execution.ts`: cấu trúc input nghiệp vụ và payload job, không phụ thuộc Express.

Không chỉ chuyển toàn bộ controller lớn thành một service lớn: nộp chính thức, lịch sử, chi tiết, gửi job và đọc trạng thái được tách theo nhiệm vụ. Result worker hiện chỉ phụ trách transport; result.service.ts điều phối execution/result.service.ts hoặc submission/result.service.ts. Auth facade được tách tiếp thành account/google/password/profile trong services/auth/.

## Response và lỗi

Các URL, method, status thành công, alias và cấu trúc dữ liệu thành công của API được giữ. Các trường frontend dùng như `data`, `pagination`, `runId`, `submissionId`, `total`, `stdout`, `stderr` vẫn ở vị trí cũ.

Lỗi nghiệp vụ được chuyển sang AppError với status và mã rõ ràng: tài nguyên không tồn tại 404, dữ liệu trùng 409, thông tin đăng nhập sai 401, yêu cầu nghiệp vụ không hợp lệ 400, queue chưa cấu hình 503. ErrorHandler cũng xử lý lỗi Prisma P2002/P2025/P2003 bằng response an toàn. Lỗi hạ tầng không còn bị coi là lỗi người dùng chỉ vì controller bắt mọi lỗi thành 400; mặc định trả 500 và không lộ raw error/stack.


Dashboard lấy dữ liệu thực từ PostgreSQL/heartbeat/SQS; AI gọi provider cấu hình, không trả câu trả lời demo. Chính sách testcase ẩn vẫn giữ; Redis có owner/TTL và Lua nguyên tử. Sửa testcase tạo version mới, giữ ID/nội dung cũ cho lịch sử; DELETE tài nguyên là soft delete. Xem README.md cho luồng cuối cùng.

## Thêm hoặc sửa endpoint

1. Khai báo URL/quyền trong router đúng nhóm.
2. Thêm schema validation cho body/query/params.
3. Viết service nhận dữ liệu thuần, trả dữ liệu hoặc ném AppError; không truyền req/res vào service.
4. Viết controller chỉ chuyển request thành input service và gọi sendSuccess.
5. Thêm kiểm tra nghiệp vụ quan trọng và cập nhật contract API khi thay đổi hành vi.

Không cần thêm async-handler wrapper: backend đang dùng Express 5. Không thêm repository chỉ để bọc từng lệnh Prisma nếu chưa có nhu cầu tái sử dụng hoặc thay đổi tầng lưu trữ.

## Kiểm tra

Trong `backend/`, chạy `npm run typecheck` và `npm test`. Test controller dùng controller/service thật qua HTTP, giả lập ở client Prisma/Redis/SQS, không gửi job hay ghi dữ liệu thật. Các ca kiểm tra gồm chạy thử, nộp chính thức, submission/results/outbox cùng transaction, không gửi bài trực tiếp trong controller, lọc theo chủ sở hữu, chính sách hidden, phân trang, polling Redis và lỗi nghiệp vụ/hạ tầng. Các test routes/middleware tiếp tục kiểm tra 51 endpoint và quyền truy cập.

Bộ test này không thay thế kiểm thử tích hợp PostgreSQL/Redis/AWS/Go Worker; không có migration hoặc thay đổi dữ liệu thật trong bước refactor controller.

`common/session.controller.ts` gọi session service cho logout/logout-all; `admin/testcase.controller.ts` đọc các version testcase. Controller nộp chính thức chỉ trả 201 sau transaction outbox commit; retry và deadline được maintenance worker xử lý.
