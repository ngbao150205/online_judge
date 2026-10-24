# Luồng chạy thử và nộp bài

Tài liệu này mô tả ba thao tác trong workspace theo API và mã hiện tại:

1. Chạy chương trình với stdin tự nhập (playground).
2. Chạy thử bài tập trên testcase công khai.
3. Nộp bài chính thức để chấm toàn bộ testcase.

PLAYGROUND tạo bản ghi lịch sử bền vững trong PostgreSQL. PROBLEM_TRIAL chỉ giữ trạng thái và kết quả tạm trong Redis theo TTL. Luồng nộp chính thức tạo submission và kết quả testcase trong PostgreSQL, đồng thời đưa công việc vào transactional outbox.

## 1. Thành phần và công cụ

| Phần | Công cụ / file chính | Vai trò |
| --- | --- | --- |
| Giao diện | React, TypeScript; frontend/src/components/workspace/Workspace.tsx, problem/ProblemWorkspace.tsx, sandbox/SandboxWorkspace.tsx | Lấy code/ngôn ngữ/input; gọi API; hiển thị trạng thái và kết quả. |
| Hook gọi chức năng | frontend/src/components/workspace/hooks/useCodeExecution.ts, useSubmission.ts | Gửi yêu cầu, poll trạng thái và cập nhật UI. |
| HTTP client | frontend/src/services/api.ts, frontend/src/config/api.ts | apiFetch gửi cookie phiên với credentials: include; API mặc định dùng prefix /api. |
| API backend | Express, TypeScript; backend/src/app.ts, routes/student/submission.routes.ts | Mount endpoint, xác thực, giới hạn tần suất và kiểm tra body. |
| Controller/service | backend/src/controllers/student/{execution,submission}.controller.ts; backend/src/services/{execution,submission}/ | Lấy user hiện tại, điều phối nghiệp vụ và định dạng HTTP response. |
| Database | PostgreSQL qua Prisma; backend/prisma/schema.prisma | Lưu PlaygroundRun, submission chính thức, kết quả testcase và outbox. |
| Kết quả tạm | Redis; services/execution/run-store.service.ts | Chỉ lưu quyền sở hữu/trạng thái và kết quả PROBLEM_TRIAL theo TTL, mặc định 3600 giây. |
| Hàng đợi | AWS SQS; services/judge-queue.service.ts, services/outbox.service.ts | Chuyển job sang worker; outbox giúp lưu submission và job một cách nguyên tử. |
| Chấm mã | Go worker trong sandbox/worker/ | Nhận job, chọn Python/C++, chạy và kiểm tra output, gửi kết quả về result queue. |
| Cô lập chương trình | Docker qua sandbox/worker/internal/executor/docker_runtime.go | Mỗi lần chạy tạo sandbox riêng, giới hạn CPU/RAM, tắt network, bỏ Linux capabilities, filesystem chỉ đọc và giới hạn process. |
| Nhận kết quả | Backend result worker; backend/src/workers/result.worker.ts, services/result.service.ts | Đọc result queue; cập nhật PlaygroundRun hoặc submission trong PostgreSQL, còn PROBLEM_TRIAL được tổng hợp trong Redis. |

Cả ba POST endpoint đều yêu cầu đăng nhập bằng session cookie, giới hạn 30 yêu cầu mỗi phút trên mỗi user, và chỉ nhận language là python hoặc cpp. sourceCode tối đa 64 KiB; stdin tối đa 64 KiB. Backend kiểm tra body bằng Zod trước khi gọi service.

## 2. Chạy code với stdin tự nhập

### Request từ trình duyệt

Endpoint:

~~~http
POST /api/submissions/run
Content-Type: application/json
Cookie: session cookie của người dùng
~~~

Body tối thiểu:

~~~json
{
  "language": "python",
  "sourceCode": "n = int(input())\nprint(n * 2)",
  "customInput": "21\n"
}
~~~

problemId là tùy chọn. Khi chạy trong sandbox độc lập, giao diện bỏ trường này. Nếu gửi problemId, backend kiểm tra bài còn hoạt động và lấy time limit/memory limit của bài. Nếu không có bài, mặc định là 2000 ms và 256 MB. customInput có thể là chuỗi rỗng hoặc bỏ qua.

### Xử lý từ đầu đến cuối

1. SandboxWorkspace gọi runCustomCode trong useCodeExecution.
2. executionService.runCode gửi POST trên tới backend.
3. submission.routes.ts áp dụng authenticate, executionRateLimit, validateBody(runBody).
4. runCustomInput gọi runCustomInputService. Service tạo ID dạng play-<UUID>, ghi user, problem context nếu có, ngôn ngữ, source code, stdin và trạng thái PENDING vào bảng PlaygroundRun, rồi gửi một job PLAYGROUND vào AWS SQS.
5. Go worker nhận job, biên dịch nếu là C++, tạo sandbox Docker, chạy chương trình với stdin đã gửi. Với PLAYGROUND, worker trả output chương trình, không so sánh với đáp án.
6. Worker gửi result tới result queue. Backend result worker tìm PlaygroundRun theo UUID và ghi trạng thái, output/error, thời gian chạy, bộ nhớ, CPU và thời gian biên dịch vào PostgreSQL. Kết quả trùng/đến muộn không ghi đè run đã kết thúc.
7. Giao diện poll GET /api/submissions/run-status/:runId. API đọc PostgreSQL và chỉ trả run cho đúng user sở hữu. Run được giữ để xem trong lịch sử, không hết hạn theo RUN_TTL_SECONDS; maintenance chuyển run bị treo quá deadline sang SYSTEM_ERROR.

Job gửi vào SQS có dạng:

~~~json
{
  "submissionId": "play-2c46c122-3d01-42d0-bc37-3e0b19d98e4a",
  "problemId": null,
  "testcaseId": "",
  "submissionType": "PLAYGROUND",
  "checkerType": "",
  "language": "python",
  "code": "n = int(input())\nprint(n * 2)",
  "input": "21\n",
  "expectedOutput": "",
  "timeLimit": 2000,
  "memoryLimit": 256,
  "isCustomInput": true
}
~~~

Đây là message nội bộ giữa backend và worker, không phải HTTP body gửi từ trình duyệt.

### HTTP response và poll

POST thành công trả HTTP 200:

~~~json
{
  "success": true,
  "message": "Đã gửi yêu cầu chạy thử, đang xử lý",
  "runId": "play-2c46c122-3d01-42d0-bc37-3e0b19d98e4a"
}
~~~

Trong khi worker chưa trả kết quả, poll trả:

~~~json
{
  "success": true,
  "runId": "play-2c46c122-3d01-42d0-bc37-3e0b19d98e4a",
  "status": "PENDING",
  "message": "Hệ thống đang xử lý mã nguồn..."
}
~~~

Khi hoàn tất, response run đơn có các trường ở top-level:

~~~json
{
  "success": true,
  "runId": "play-2c46c122-3d01-42d0-bc37-3e0b19d98e4a",
  "status": "RUN_SUCCESS",
  "output": "42\n",
  "stdout": "42\n",
  "error": "",
  "stderr": "",
  "executionTime": 18,
  "memoryUsed": 6144,
  "cpuTime": 4,
  "compileTime": null
}
~~~

Các trị số ví dụ minh họa cấu trúc. memoryUsed do worker đo theo KiB; executionTime, cpuTime, compileTime tính bằng millisecond. Các trường đo có thể là null nếu worker không có số đo tương ứng. Trạng thái lỗi có thể gồm CE, RE, TLE, MLE, SYSTEM_ERROR.

### Lịch sử PLAYGROUND

Các endpoint yêu cầu đăng nhập và chỉ truy cập dữ liệu của user hiện tại:

~~~http
GET /api/submissions/playground-history?page=1
GET /api/submissions/playground-history/:runId
~~~

Endpoint danh sách phân trang 10 lượt mới nhất; chi tiết trả lại source code, stdin, output/error và metrics. Trang **Lịch sử → Playground** dùng các endpoint này và tự refresh khi một lượt còn PENDING/RUNNING. Đây là lịch sử riêng với trang bài nộp chính thức.

## 3. Chạy thử bài tập trên testcase công khai

### Request từ trình duyệt

Endpoint:

~~~http
POST /api/submissions/run-problem
Content-Type: application/json
Cookie: session cookie của người dùng
~~~

Body:

~~~json
{
  "problemId": "91bd99b0-c78f-42ea-a0d4-717eedf77098",
  "language": "cpp",
  "sourceCode": "#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; cout << n * 2; }"
}
~~~

problemId bắt buộc. customInput không được gửi trong luồng này: backend tự lấy các testcase chưa bị ẩn (isHidden=false) và chưa bị xóa.

### Xử lý từ đầu đến cuối

1. Trang bài tập đang dùng ProblemWorkspace.handleRun, gọi runProblemCode trong hook useCodeExecution.
2. executionService.runProblem gửi POST tới /api/submissions/run-problem.
3. Route xác thực user, áp rate limit và kiểm tra problemExecutionBody.
4. runProblemService xác thực bài còn hoạt động, lấy time/memory limit, checker và danh sách testcase công khai.
5. Backend tạo runId, ghi trạng thái tổng hợp ban đầu vào Redis, rồi gửi một job PROBLEM_TRIAL cho mỗi testcase công khai.
6. Go worker chạy từng job trong sandbox và so output theo checker của bài (TOKENS hoặc FLOAT).
7. Backend nhận từng result và cập nhật mảng results, completed, passed, failed trong Redis. Đây vẫn là run tạm; không tạo PlaygroundRun hay lịch sử submission trong PostgreSQL.
8. Giao diện poll cùng endpoint /api/submissions/run-status/:runId và hiển thị tiến độ từng testcase.

Message SQS tương ứng cho một testcase:

~~~json
{
  "submissionId": "run-621431e0-02b9-4e9d-8bb1-5cb7aa24f08d",
  "problemId": "91bd99b0-c78f-42ea-a0d4-717eedf77098",
  "testcaseId": "9cf88914-244e-4ae6-923e-08a2200fd2a2",
  "submissionType": "PROBLEM_TRIAL",
  "checkerType": "TOKENS",
  "language": "cpp",
  "code": "#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; cout << n * 2; }",
  "input": "21\n",
  "expectedOutput": "42\n",
  "timeLimit": 2000,
  "memoryLimit": 256
}
~~~

### HTTP response và poll

POST thành công trả HTTP 200:

~~~json
{
  "success": true,
  "message": "Đã gửi code để chạy thử",
  "runId": "run-621431e0-02b9-4e9d-8bb1-5cb7aa24f08d",
  "total": 2
}
~~~

Khi đang xử lý, response poll có tiến độ và những testcase đã trả kết quả:

~~~json
{
  "success": true,
  "runId": "run-621431e0-02b9-4e9d-8bb1-5cb7aa24f08d",
  "status": "RUNNING",
  "total": 2,
  "completed": 1,
  "passed": 1,
  "failed": 0,
  "results": [
    {
      "testcaseId": "9cf88914-244e-4ae6-923e-08a2200fd2a2",
      "status": "AC",
      "output": "42\n",
      "error": "",
      "executionTime": 18,
      "memoryUsed": 6144,
      "cpuTime": 4,
      "compileTime": 110
    }
  ]
}
~~~

Khi toàn bộ testcase công khai hoàn tất, run có status ACCEPTED nếu tất cả đạt; nếu có testcase không đạt thì trạng thái tổng là COMPLETED và xem từng results[].status để biết lỗi. Trạng thái testcase có thể là AC, WA, CE, RE, TLE, MLE hoặc lỗi hệ thống.

Nếu bài không có testcase công khai, service hiện gửi một job PLAYGROUND với input rỗng để run không bị treo; trường hợp này không thực hiện so sánh đáp án.

## 4. Nộp bài chính thức

### Request từ trình duyệt

Endpoint:

~~~http
POST /api/submissions
Content-Type: application/json
Cookie: session cookie của người dùng
~~~

Body:

~~~json
{
  "problemId": "91bd99b0-c78f-42ea-a0d4-717eedf77098",
  "language": "cpp",
  "sourceCode": "#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; cout << n * 2; }"
}
~~~

### Xử lý từ đầu đến cuối

1. ProblemWorkspace.handleSubmit gọi hook useSubmission, gửi request qua submissionService.submitCode.
2. Route xác thực user, áp rate limit và validate body.
3. submitCodeService mở transaction Prisma, khóa bài ở mức chia sẻ để đồng bộ với thay đổi testcase, kiểm tra bài hoạt động và có testcase.
4. Trong cùng transaction, backend tạo Submission ở trạng thái PENDING, lưu user/problem/ngôn ngữ/source code, số testcase, version testcase và deadline. Đồng thời tạo SubmissionResult đang chờ cho mỗi testcase và OutboxJob cho mỗi testcase. Luồng chính thức lấy toàn bộ testcase chưa xóa, gồm cả testcase ẩn.
5. Transaction commit xong thì API trả về ID. Maintenance worker trong tiến trình backend đọc outbox, lease job rồi gửi từng job PROBLEM_SUBMIT lên AWS SQS. Nếu gửi SQS lỗi, job được retry theo backoff; nếu quá số lần retry, submission được kết thúc bằng SYSTEM_ERROR.
6. Go worker chạy từng testcase, compile C++ nếu cần, thực thi trong Docker sandbox và so output với đáp án.
7. Worker publish kết quả từng testcase vào result queue. Backend result worker cập nhật hàng SubmissionResult; khi đủ kết quả, tổng hợp trạng thái submission, tổng thời gian, peak memory và compile diagnostics. Khi submission kết thúc, backend cũng cập nhật tiến độ roadmap có liên quan.
8. Giao diện poll GET /api/submissions/:submissionId. Submission và testcase results được lưu bền trong PostgreSQL; người dùng có thể xem lại bằng history.

Job outbox được gửi cho một testcase có dạng:

~~~json
{
  "submissionId": "2e333117-5e69-4ce1-9f0a-d9654bc91701",
  "problemId": "91bd99b0-c78f-42ea-a0d4-717eedf77098",
  "testcaseId": "9cf88914-244e-4ae6-923e-08a2200fd2a2",
  "submissionType": "PROBLEM_SUBMIT",
  "checkerType": "TOKENS",
  "language": "cpp",
  "code": "#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; cout << n * 2; }",
  "input": "21\n",
  "expectedOutput": "42\n",
  "timeLimit": 2000,
  "memoryLimit": 256,
  "isCustomInput": false
}
~~~

Worker gửi result message về backend, ví dụ:

~~~json
{
  "submissionId": "2e333117-5e69-4ce1-9f0a-d9654bc91701",
  "testcaseId": "9cf88914-244e-4ae6-923e-08a2200fd2a2",
  "status": "AC",
  "output": "42\n",
  "error": "",
  "executionTime": 18,
  "memoryUsed": 6144,
  "cpuTime": 4,
  "compileTime": 110
}
~~~

Đây là message nội bộ trên result queue. Backend xác thực cấu trúc trước khi xử lý. `play-<UUID>` định danh PLAYGROUND và cập nhật PostgreSQL; `run-<UUID>` dành cho PROBLEM_TRIAL và được tổng hợp trong Redis. UUID thuần của submission chính thức được ghi PostgreSQL theo bảng submission/result.

### HTTP response và đọc kết quả

POST thành công trả HTTP 201. Response thật có submissionId, total, và data là bản ghi submission vừa tạo; ví dụ rút gọn:

~~~json
{
  "success": true,
  "message": "Đã gửi bài để chấm toàn bộ testcase",
  "submissionId": "2e333117-5e69-4ce1-9f0a-d9654bc91701",
  "total": 2,
  "data": {
    "id": "2e333117-5e69-4ce1-9f0a-d9654bc91701",
    "userId": "c20b31e8-7232-47da-8b60-e8bf391b6621",
    "problemId": "91bd99b0-c78f-42ea-a0d4-717eedf77098",
    "language": "cpp",
    "sourceCode": "#include <iostream> ...",
    "status": "PENDING",
    "totalTestcases": 2,
    "testcaseVersion": 3,
    "createdAt": "2026-10-19T00:00:00.000Z",
    "deadlineAt": "2026-10-19T00:30:00.000Z"
  }
}
~~~

Các cột scalar khác như totalTime, maxMemory, compileLog có thể là null; timestamp thực tế do server sinh. POST response không chứa quan hệ kết quả testcase; frontend dùng submissionId để poll.

GET /api/submissions/:submissionId trả chi tiết ở bên trong data:

~~~json
{
  "success": true,
  "data": {
    "id": "2e333117-5e69-4ce1-9f0a-d9654bc91701",
    "language": "cpp",
    "sourceCode": "#include <iostream> ...",
    "status": "ACCEPTED",
    "totalTestcases": 2,
    "totalTime": 36,
    "maxMemory": 6144,
    "testcaseVersion": 3,
    "createdAt": "2026-10-19T00:00:00.000Z",
    "problem": {
      "id": "91bd99b0-c78f-42ea-a0d4-717eedf77098",
      "title": "Nhân đôi số",
      "slug": "nhan-doi-so"
    },
    "completed": 2,
    "passed": 2,
    "failed": 0,
    "results": [
      {
        "id": "1a4d03c4-c283-4e2d-a111-7e70eb4ff11e",
        "testcaseId": "9cf88914-244e-4ae6-923e-08a2200fd2a2",
        "status": "AC",
        "executionTime": 18,
        "memoryUsed": 6144,
        "cpuTime": 4,
        "compileTime": 110,
        "number": 1,
        "isHidden": false,
        "input": "21\n",
        "output": "42\n",
        "errorLog": null
      }
    ]
  }
}
~~~

results có một phần tử cho mỗi testcase. Với testcase ẩn, endpoint ẩn input, output, errorLog trước khi tất cả testcase đạt; trạng thái và số liệu testcase vẫn có thể được trả về. Khi toàn bộ testcase đều đạt, implementation hiện tại trả cả chi tiết của testcase ẩn. expectedOutput không được trả trong detail API.

Trạng thái tổng chính thức: PENDING, IN_PROGRESS, ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, RUNTIME_ERROR, COMPILE_ERROR, SYSTEM_ERROR. Trạng thái riêng của testcase: PENDING, AC, WA, TLE, MLE, RE, CE, SYSTEM_ERROR.

Lịch sử đọc bằng GET /api/submissions/history?page=1; mặc định 10 submission mỗi trang. Lịch sử chỉ gồm các lần nộp chính thức, không có hai luồng chạy thử.

## 5. Lỗi HTTP thường gặp

Lỗi API có envelope:

~~~json
{
  "success": false,
  "message": "Mô tả lỗi",
  "code": "ERROR_CODE"
}
~~~

Các trường hợp chính:

| HTTP | Nguyên nhân thường gặp |
| --- | --- |
| 400 | Body sai schema; bài chưa có testcase chính thức; bài không hoạt động khi chạy thử. |
| 401 | Thiếu session cookie hoặc phiên không hợp lệ. |
| 404 | Bài không tồn tại/đã đóng; run không tồn tại, hết TTL hoặc thuộc user khác; submission không thuộc user hiện tại. |
| 429 | Vượt 30 yêu cầu chạy/nộp trong 60 giây trên mỗi user. |
| 503 | SQS chưa cấu hình, Redis không kiểm tra được rate limit, hoặc không gửi được yêu cầu chạy thử. |

Việc nộp chính thức có thể trả PENDING ngay cả khi worker chưa bắt đầu. Đây là trạng thái bình thường: outbox sẽ gửi lại job khi SQS tạm lỗi. Nếu frontend hết thời gian poll, submission vẫn tiếp tục xử lý ở backend; có thể mở lịch sử để xem lại.

## 6. Ghi chú khi đọc mã hiện tại

- API response không dùng một envelope thống nhất cho mọi endpoint: POST run trả runId ở top-level; run status cũng trả các trường ở top-level; submission detail và history đặt dữ liệu trong data. Các helper frontend hiện hỗ trợ các dạng này.
- Trang chạy bài đang dùng route trong frontend/src/components/workspace/Workspace.tsx. File frontend/src/pages/Workspace.tsx là implementation cũ, không được import vào route hiện tại; không dùng file đó làm mô tả luồng UI đang chạy.
- Chạy thử bài chỉ dùng testcase công khai. Nộp chính thức mới đi qua PostgreSQL/outbox và chấm toàn bộ testcase chưa xóa.
- Khi thêm migration/đổi contract SQS hoặc kết quả worker, cần cập nhật tài liệu này cùng backend/frontend/Go worker để request, response và message nội bộ không bị nhầm lẫn.

