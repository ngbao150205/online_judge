# Đánh giá mức độ triển khai theo mục tiêu đề tài

**Ngày rà soát:** 22/10/2026  
**Cơ sở đánh giá:** mã nguồn, cấu hình Docker, tests và tài liệu nằm trong repository. Trạng thái môi trường cloud bên ngoài repository không thể xác nhận chỉ từ mã nguồn.

## Kết luận tổng quan

Nền tảng đã hoàn thành phần lớn luồng sản phẩm cốt lõi: người học quản lý tài khoản, chọn bài, viết và chạy Python/C++, nộp bài, nhận kết quả theo testcase, xem lịch sử bài nộp và tiến độ. Backend và Go worker được nối bất đồng bộ qua AWS SQS; chương trình chạy trong container Docker riêng có giới hạn tài nguyên và kiểm soát quyền.

Đề tài **chưa chứng minh đủ các mục tiêu về sản phẩm vận hành trực tuyến và tự động co giãn**. Compose hiện chạy một worker theo cấu hình cố định; chưa thấy policy tự tăng/giảm số worker, hệ thống ghi nhận sự kiện scale hay bộ kiểm thử tải xác nhận khả năng phản ứng. Các tài liệu có ghi nhận smoke test với AWS SQS ngày 17/10/2026, nhưng điều đó tự nó không chứng minh frontend/backend đã được triển khai với URL công khai trên Internet.

## Luồng hiện tại

~~~text
React workspace
  -> Express API: xác thực cookie, rate limit, validate
  -> PostgreSQL + Redis
  -> AWS SQS job queue
  -> Go worker
  -> container Docker tạm cho Python/C++
  -> AWS SQS result queue
  -> Backend result consumer
  -> Redis cho run thử / PostgreSQL cho submission chính thức
  -> Frontend poll và hiển thị kết quả
~~~

Có ba luồng phân biệt trong [SUBMISSION_FLOWS.md](SUBMISSION_FLOWS.md):

- Chạy với stdin tự nhập: một job PLAYGROUND; kết quả tạm trong Redis.
- Chạy thử testcase công khai: job PROBLEM_TRIAL theo testcase công khai; kết quả tạm trong Redis.
- Nộp chính thức: tạo submission, testcase results và outbox trong cùng transaction; worker chấm tất cả testcase chưa xóa, gồm hidden tests.

## Đối chiếu yêu cầu và mức độ hoàn thiện

| Yêu cầu trong đề cương | Trạng thái | Đánh giá theo repository |
| --- | --- | --- |
| Quản lý tài khoản và thông tin người dùng | **Đã triển khai** | Đăng ký/đăng nhập, Google tùy cấu hình, OTP/email, đổi và quên mật khẩu, hồ sơ, session, phân quyền, admin quản lý user. |
| Ngân hàng bài tập theo chủ đề/mức độ | **Đã triển khai** | Bài tập, category, difficulty, tìm/lọc, testcase, active/soft-delete; admin quản lý bài và testcase. |
| Viết và chạy code trực tuyến cho ít nhất hai ngôn ngữ | **Đã triển khai** | Workspace hỗ trợ Python và C++; có sandbox stdin và workspace theo bài. Thêm ngôn ngữ vẫn cần executor, image/checker và test mới. |
| Trạng thái biên dịch, thực thi, testcase | **Đã triển khai** | Có CE, RE, WA, TLE, MLE, AC, SYSTEM_ERROR; chi tiết từng testcase, output và metrics được trả theo chính sách API. |
| Public và hidden testcases | **Đã triển khai** | Chạy thử bài lấy testcase công khai; nộp chính thức lấy toàn bộ testcase chưa xóa. |
| Lịch sử bài nộp và tiến độ học tập | **Đã triển khai một phần** | Submission chính thức, kết quả và roadmap progress lưu PostgreSQL. Các lần chạy playground/trial chỉ lưu Redis theo TTL, không có lịch sử chạy bền vững. |
| Thực thi mã không tin cậy và giới hạn tài nguyên | **Đã triển khai một phần** | Docker sandbox riêng; CPU 1 core, memory/swap limit, PID limit 64, network none, cap-drop ALL, read-only rootfs, no-new-privileges và tmpfs. Có TLE/MLE, stdout/stderr được giới hạn 64 KiB mỗi luồng. |
| Cô lập syscall bằng seccomp | **Một phần / cần minh chứng** | Không thấy cấu hình seccomp profile riêng trong lệnh tạo container; hiện dựa vào Docker default seccomp profile cùng các giới hạn khác. Nếu báo cáo yêu cầu chứng minh seccomp, cần xác minh profile thực tế trên host và lưu minh chứng. |
| Xử lý output quá lớn | **Một phần** | Bộ đệm stdout/stderr được chặn ở 64 KiB và tiếp tục drain để tránh phình RAM; hiện lỗi vượt ngưỡng được gom thành lỗi thực thi, chưa có trạng thái/output-limit riêng để giải thích rõ cho người học. |
| Hàng đợi phân tán và xử lý nhiều job | **Đã triển khai một phần** | AWS SQS, transactional outbox, retry/backoff, DLQ, worker heartbeat và deadline reconciliation đã có. Worker Go xử lý đồng bộ từng job trong một tiến trình; có thể chạy nhiều replica thủ công nhưng chưa có autoscaler. |
| Tự tăng/giảm số đơn vị xử lý theo tải | **Chưa triển khai** | Compose định nghĩa một sandbox-worker cố định; không có ECS/ASG/Kubernetes autoscaling policy hay logic scale dựa trên queue depth/age. Worker heartbeat và SQS queue depth là dữ liệu giám sát, chưa điều khiển scale. |
| Theo dõi tải, trạng thái tác vụ và scale events | **Một phần** | Admin dashboard có submission status, heartbeat worker, worker CPU/RAM nếu có, queue pending/processing/DLQ, retry outbox và lỗi hệ thống. Chưa có lịch sử sự kiện scale, target/desired capacity hay biểu đồ tải theo thời gian. |
| Gợi ý gỡ lỗi bằng mô hình ngôn ngữ lớn | **Đã triển khai một phần** | Có provider HTTP tương thích Chat Completions, timeout, giới hạn request và prompt an toàn. Input hiện gồm language, sourceCode và errorMessage; chưa gửi ngữ cảnh bài tập có cấu trúc hoặc đầy đủ kết quả testcase/metrics. Chất lượng chưa được đánh giá trên benchmark lỗi. |
| Truy cập sản phẩm qua Internet | **Chưa có bằng chứng trong repository** | Có Compose phù hợp chạy stack trên máy/container host và tài liệu AWS SQS. Chưa thấy IaC/manifest cho hosting app, load balancer, TLS, DNS hoặc endpoint public. Cần xác nhận nếu nhóm đã triển khai thủ công ngoài repository. |
| Kiểm thử chức năng | **Đã triển khai một phần tốt** | Backend có tests cho routes, middleware, controllers, services, auth, health và một số integration opt-in; docker/test.sh chạy stack kiểm thử riêng và luồng chấm. README ghi nhận 17 nhóm integration và 26 test backend pass. |
| Đánh giá tải và autoscaling | **Chưa triển khai** | Không thấy bộ k6/Locust/Artillery hoặc kịch bản đo queue age, latency, throughput, error rate, tài nguyên và phản ứng scale khi tăng/giảm tải. |
| Đánh giá chất lượng phản hồi AI | **Chưa triển khai** | Chưa thấy bộ mẫu lỗi có đáp án chuẩn, rubric chấm chẩn đoán/gợi ý hay tổng hợp định lượng. |
| Đánh giá với người học | **Chưa triển khai / tùy điều kiện** | Chưa thấy kịch bản usability, phiếu khảo sát hoặc báo cáo kết quả người dùng. |
| Tài liệu và khả năng cài đặt lại | **Đã triển khai một phần** | Có README, Docker guide, account flow, submission flow, migration/backup/deploy scripts và integration scripts. Cần bổ sung hướng dẫn cloud public và quy trình scale sau khi chọn hạ tầng thật. |

### Giới hạn an toàn sandbox cần thể hiện trung thực

Cấu hình hiện có các giới hạn mạnh ở cấp Docker/cgroup và syscall mặc định của Docker, nhưng không đồng nghĩa với một sandbox đa tầng đã được pentest. Worker được mount Docker socket để tạo container; đây là quyền quản trị daemon ở phía worker host, nên worker host cần được cô lập khỏi API/database và không được chia sẻ với workload người dùng. Khi báo cáo, phân biệt rõ các biện pháp đang có, profile seccomp thực tế và những kiểm thử đã chạy.

Mã worker giới hạn output thu thập ở 64 KiB cho stdout và stderr. Đây là giới hạn bộ nhớ lưu output, không phải trạng thái OLE riêng. Cần bổ sung hành vi kết thúc workload hoặc phân loại riêng nếu yêu cầu đề tài bắt buộc xử lý quá nhiều output.

## Những phần đã có thể trình bày/demo

1. Đăng ký/đăng nhập và quản lý tài khoản; quản trị user.
2. Tìm bài theo category/difficulty và quản trị bài/testcase.
3. Chạy code Python/C++ trong sandbox với stdin.
4. Chạy testcase public và nộp chính thức qua hàng đợi.
5. Phân biệt lỗi biên dịch, runtime, output sai, TLE và MLE.
6. Submission history, testcase results, roadmap progress.
7. Dashboard worker/queue/DLQ và cơ chế retry/reconciliation.
8. Tích hợp provider AI khi có cấu hình.
9. Local Docker deployment và integration test có database/queue riêng.

Phần chấm chính thức cần AWS SQS hợp lệ hoặc stack integration local; AI cần provider credentials; email/Google cần cấu hình riêng. Không dùng ảnh/output fixture để khẳng định cloud hoặc provider thật đã được kiểm thử.

## Lộ trình hoàn thiện đề xuất

### Ưu tiên 1: Chốt và triển khai môi trường Internet

Phân tích kiến trúc đề xuất, luồng DNS/TLS, worker Docker, autoscaling, secrets, backup/restore, logging, chi phí và tiêu chí nghiệm thu xem tại [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md).

- Chọn kiến trúc cloud và ghi rõ các thành phần: web/API, PostgreSQL, Redis, SQS, Go worker, logs/metrics, backup.
- Giải quyết yêu cầu Docker của sandbox worker. Worker hiện gọi Docker daemon qua socket; chọn compute có Docker daemon do nhóm quản lý, hoặc đổi executor sang dịch vụ batch/isolation phù hợp.
- Cấu hình DNS/TLS, secret management, health checks, backup/restore và rollout.
- Ghi lại endpoint public, sơ đồ deployment, chi phí cơ bản và quy trình cài đặt/khôi phục.

### Ưu tiên 2: Thiết kế autoscaling worker

- Dùng queue depth và đặc biệt ApproximateAgeOfOldestMessage làm tín hiệu nhu cầu; đặt min/max capacity, cooldown và ngưỡng scale-in/out.
- Triển khai worker trên nền tảng hỗ trợ Docker daemon an toàn. Có thể đánh giá EC2 Auto Scaling/ECS EC2 capacity provider cho worker; cần kiểm thử tương thích sandbox trước khi chọn.
- Phát telemetry theo worker ID, queue age/depth, thời gian xử lý, lỗi, CPU/RAM và replica count.
- Ghi sự kiện scale, desired/current capacity và nguyên nhân để dashboard/báo cáo đánh giá được.
- Giữ API/database tách khỏi quyền Docker socket của worker.

### Ưu tiên 3: Khép các thiếu hụt chức năng

- Nếu yêu cầu “lịch sử chạy” áp dụng cho cả run thử, lưu run metadata/kết quả lâu bền theo user; có retention/cleanup phù hợp thay cho Redis TTL đơn thuần.
- Bổ sung structured judge context cho AI: problem statement, trạng thái testcase, compile/runtime error, giới hạn và metrics cần thiết; không gửi hidden expected output hoặc dữ liệu nhạy cảm không cần thiết.
- Lập benchmark AI với lỗi đã biết, rubric và review thủ công.
- Quyết định chính sách hidden tests sau khi chấm; hiện detail endpoint trả chi tiết hidden testcase sau khi toàn bộ testcase đạt.
- Xác định UX khi output vượt ngưỡng; trả mã lỗi riêng và chấm dứt tiến trình đúng cách.
- Xác minh seccomp profile đang áp dụng; nếu cần, đóng gói profile rõ ràng và tạo test thử hành vi syscall bị từ chối.

### Ưu tiên 4: Đo kiểm và hoàn thiện báo cáo

- Tạo kịch bản tải tăng/giảm và burst; đo p50/p95 latency, queue wait, throughput, failure rate, thời gian scale-out/scale-in, CPU/RAM và chi phí.
- Kiểm tra TLE/MLE, fork bomb/PID limit, output flood, network access, filesystem và syscall restrictions; ghi lại môi trường/kernel/runtime.
- Thực hiện usability study nhỏ nếu có người học tham gia.
- Tổng hợp kết quả thật, cấu hình thử nghiệm, số lần chạy và giới hạn; tách test local, AWS SQS smoke và production public deployment.

## Nguồn đã đối chiếu trong repository

- backend/README.md — kiến trúc, chức năng backend, scripts và các kiểm thử được ghi nhận.
- DOCKER.md — Compose, AWS SQS, deploy, backup, integration smoke và giới hạn vận hành.
- SUBMISSION_FLOWS.md — request/response và ba luồng chạy/nộp.
- backend/src/services/ai.service.ts — nội dung gửi tới AI provider.
- backend/src/services/dashboard.service.ts và worker-monitor.service.ts — dữ liệu dashboard/heartbeat.
- backend/src/services/outbox.service.ts — retry, lease và deadline reconciliation.
- sandbox/worker/internal/executor/docker_runtime.go — cấu hình sandbox, metrics cgroup và output limit.
- docker-compose.yml — số lượng service chính và cách khởi động worker hiện tại.

