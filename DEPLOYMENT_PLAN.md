# Kế hoạch triển khai môi trường Internet

**Ngày phân tích:** 22/10/2026  
**Phạm vi:** thiết kế và hạng mục triển khai cho ưu tiên 1; chưa tạo tài nguyên AWS hoặc thay đổi cấu hình runtime.

## Kết luận đề xuất

Dùng kiến trúc AWS tách phần web/API, dữ liệu và sandbox worker:

- **Frontend:** build React thành file tĩnh trong S3 private bucket, phân phối qua CloudFront.
- **API:** backend Node/Express chạy thành ECS service phía sau Application Load Balancer (ALB), trong private subnet.
- **Dữ liệu:** PostgreSQL trên Amazon RDS; Redis trên ElastiCache.
- **Queue:** hai AWS SQS queue hiện có: judge jobs và judge results, mỗi queue có DLQ.
- **Sandbox worker:** EC2 Auto Scaling Group riêng, chạy Go worker trên EC2 có Docker Engine do nhóm quản lý.
- **Điều khiển và quan sát:** IAM roles, Secrets Manager hoặc Systems Manager Parameter Store, CloudWatch Logs/Metrics/Alarms, ECR, Route 53 và ACM TLS.
- **Public endpoint:** một domain qua CloudFront. CloudFront phục vụ React và chuyển /api sang ALB, giúp trình duyệt tiếp tục gọi cùng origin và dùng session cookie hiện tại.

Điểm quyết định là worker. Go worker hiện cần gọi Docker daemon để tạo container Python/C++ cho từng job. Vì vậy đường triển khai ít thay đổi nhất là worker EC2 chuyên dụng, nằm trong private subnet và tách riêng khỏi API/database. ECS Fargate phù hợp cho API, nhưng không nên coi là nơi chạy worker hiện tại mà chưa thiết kế lại việc tạo sandbox.

## Hiện trạng trong repository

| Thành phần | Hiện tại | Điều cần đổi khi lên cloud |
| --- | --- | --- |
| Frontend | Nginx container phục vụ React và proxy /api sang service backend trong Docker Compose. | Build và đẩy static assets lên S3/CloudFront; CloudFront route /api đến ALB. Hoặc giữ Nginx container nếu muốn đơn giản hóa giai đoạn đầu. |
| Backend | Node/Express; API, result consumer và maintenance/outbox chạy chung một tiến trình; hiện có /health kiểm tra PostgreSQL và Redis. | Build image và đẩy lên ECR; deploy ECS service sau ALB; dùng task role thay AWS key; thêm readiness/liveness rõ ràng và kiểm tra queue dependencies. |
| PostgreSQL | Postgres container với named Docker volume; backup script ghi file vào .local/backups trên host. | Chuyển sang RDS private; bật backup/PITR và mã hóa; đưa bản export định kỳ sang S3; thử restore. |
| Redis | Redis container dùng AOF volume, chứa run tạm, rate limit và worker heartbeat. | Chuyển sang ElastiCache private; chọn retention/HA theo nhu cầu. Dữ liệu run có TTL; không coi Redis là nguồn lịch sử bền vững. |
| SQS | Backend/worker đã dùng AWS SQS và có script tạo/check queue/DLQ. | Giữ queue; gán IAM least-privilege, cấu hình alarm và kiểm tra visibility timeout khi triển khai compute mới. |
| Go worker | Docker container mount /var/run/docker.sock; khi boot, build Python/C++ images tại chỗ nếu image/checksum chưa khớp; xử lý job tuần tự trong mỗi process. | Chạy trên nhóm EC2 riêng; nên build image sandbox ở CI, đẩy ECR và pin version/digest; triển khai policy scale từ queue. |
| Health/metrics | API health kiểm tra DB/Redis; worker healthcheck chỉ xác nhận sandbox images đã sẵn sàng. Có heartbeat, CPU/RAM worker và queue/DLQ cho dashboard. | Bổ sung health cho queue/consumer, heartbeat stale alarm, logs tập trung, metrics latency/backlog/scale event và alarm vận hành. |
| Migrations | docker/deploy.sh kiểm tra queue, backup PostgreSQL, chạy prisma migrate deploy rồi chờ healthcheck. | Chuyển thành pipeline/one-shot migration task; tạo snapshot/backup trước migration và rollout có kiểm tra tương thích. |

Cấu hình local hiện giữ SQS queue URL và credential fields trong environment. Không được chuyển các AWS access key từ file .env lên image/task definition. Tại AWS, ưu tiên task role/instance profile. Các biến như JWT_SECRET, SMTP_PASS, AI_API_KEY phải đưa vào secret store.

## Sơ đồ mục tiêu

~~~mermaid
flowchart TB
    User[Người học] --> DNS[Route 53 / domain]
    DNS --> CF[CloudFront + ACM TLS]
    CF -->|static assets| S3[(Private S3 frontend)]
    CF -->|/api/*| ALB[Application Load Balancer]
    ALB --> API[ECS service: Node API + result consumer + maintenance]
    API --> RDS[(RDS PostgreSQL)]
    API --> Redis[(ElastiCache Redis)]
    API --> Jobs[SQS judge jobs]
    Results[SQS judge results] --> API
    Jobs --> ASG[EC2 Auto Scaling Group: Go workers]
    ASG --> Docker[Docker Engine on dedicated EC2]
    Docker --> Py[Ephemeral Python sandbox]
    Docker --> Cpp[Ephemeral C++ sandbox]
    ASG --> Results
    API --> Secrets[Secrets Manager / SSM]
    ASG --> Secrets
    API --> CW[CloudWatch logs, metrics, alarms]
    ASG --> CW
    RDS --> Backup[S3 encrypted backup / restore tests]
~~~

API service hiện chạy result consumer và maintenance trong cùng process. Nhiều ECS task có thể cùng nhận result queue và claim outbox jobs; database row locks, SQS và outbox leases đã hỗ trợ concurrency ở tầng ứng dụng. Tuy vậy cần đo tải database/queue trước khi tăng replica và đặt giới hạn ECS max capacity.

## Vì sao worker nên dùng EC2 riêng

Worker có quyền điều khiển Docker daemon. Mount Docker socket vào container tương đương trao quyền quản lý host Docker cho tiến trình worker. Đó là ranh giới tin cậy quan trọng hơn việc bản thân user program chạy trong container con.

Với EC2 Auto Scaling Group chuyên dụng:

1. Mỗi instance chỉ chạy worker và daemon Docker; không chạy API, database hoặc dịch vụ dùng chung.
2. Instance nằm trong private subnet, không mở inbound từ Internet; quản trị qua Systems Manager Session Manager.
3. Instance profile chỉ cấp quyền nhận/xóa message từ job queue, gửi result queue, lấy sandbox images từ ECR và ghi log/metrics.
4. Sandbox con vẫn phải giữ giới hạn hiện tại: no network, memory/swap/CPU/PID limit, cap-drop, read-only filesystem và no-new-privileges.
5. Pipeline build hai sandbox images thành versioned ECR images. Worker boot pull đúng version, thay vì build compiler/runtime image mỗi lần instance khởi động.
6. ASG thay instance lỗi và điều chỉnh số instance dựa vào backlog. Mỗi worker hiện xử lý một job tại một thời điểm; một testcase là một job.

Để tăng cách ly hơn nữa, có thể đánh giá gVisor/Kata/Firecracker hoặc chuyển execution sang dịch vụ batch chuyên biệt. Đó là nhánh cần sửa executor, build, metrics và kiểm thử tương thích; không phải thay cấu hình Docker Compose đơn thuần. Không đưa workload người học chạy trực tiếp trên host.

## Autoscaling worker cần có

Autoscaling là một phần trong mục tiêu đề tài và phải triển khai riêng; SQS cùng dashboard hiện tại chưa tự scale worker.

- **Tín hiệu:** số message khả dụng và tuổi message lâu nhất trên job queue. Queue depth cho biết số việc; oldest-message age thể hiện độ trễ chờ.
- **Capacity:** số instance đang phục vụ trong ASG. Theo dõi cả pending, launching, in-service, draining và failed instances.
- **Policy:** target backlog trên mỗi worker hoặc step scaling theo backlog/queue age. Đặt min/max, cooldown, scale-out nhanh hơn scale-in. Min 1 giảm thời gian khởi động; min 0 tiết kiệm khi không tải nhưng có cold start dài.
- **Scale-in an toàn:** dừng nhận job mới, cho job hiện tại hoàn tất hoặc hết grace period; nếu instance bị terminate giữa lúc xử lý thì SQS visibility timeout/retry phải khôi phục job. Kiểm tra giới hạn runtime tối đa của testcase/C++ compile so với visibility timeout hiện tại.
- **Scale event:** ghi timestamp, desired/current capacity, backlog, queue age, policy/reason và kết quả scale để dashboard và báo cáo chứng minh hệ thống đã phản ứng.
- **Kiểm chứng:** giả lập burst job, theo dõi thời gian queue chờ giảm, rồi giảm tải và xác nhận worker thu hẹp mà không mất job hoặc tạo kết quả trùng gây sai trạng thái.

Không scale theo ApproximateNumberOfMessagesVisible một cách đơn lẻ rồi tuyên bố đạt yêu cầu; phải có kịch bản, số liệu và kết quả scale-in/scale-out.

## DNS, HTTPS và luồng session

Đề xuất dùng domain của nhóm, ví dụ app.<domain>:

1. Route 53 trỏ domain đến CloudFront.
2. ACM cấp TLS certificate cho domain; certificate CloudFront cần ở region us-east-1. Nếu terminate TLS ở ALB, cấp certificate phù hợp ở region của ALB.
3. CloudFront behavior mặc định phục vụ SPA từ private S3 origin qua Origin Access Control; behavior /api/* chuyển ALB.
4. Behavior /api/* phải tắt cache, forward cookie/query/header cần thiết tới backend và giữ Set-Cookie từ response. Không cache response đăng nhập, hồ sơ hay submission theo URL chung.
5. React tiếp tục cấu hình API prefix /api để giữ same-origin. Điều này phù hợp hơn tách api.<domain> vì session cookie hiện sameSite=lax và frontend gọi credentials include.
6. Backend cookie production cần Secure=true, HttpOnly, Path=/api như code hiện tại; xác minh domain, proxy headers và TRUST_PROXY_HOPS trong đường đi CloudFront/ALB/API. Không đoán hop count; thử log IP/scheme trong staging.
7. CORS allowlist phải chỉ gồm origin thật. Nếu dùng cùng domain, không cần mở wildcard.
8. Security groups: Internet chỉ tới CloudFront/ALB; API chỉ nhận từ ALB; RDS/Redis chỉ nhận từ API và các thành phần được phép; worker không có đường truy cập DB/Redis.

Health check ALB nên dùng endpoint readiness của API. /health hiện tại chỉ xác nhận DB và Redis; endpoint này không xác nhận SQS queue hoặc result consumer. Thêm /live để tiến trình còn phản hồi và /ready để xác nhận dependency cần cho nhận traffic. Worker health nên được xác định từ heartbeat mới trong Redis/CloudWatch, không chỉ từ file marker cho biết images đã build.

## Secret, IAM và cấu hình

- Dùng ECS task role cho backend và EC2 instance profile cho worker. Không cấp cùng một role cho hai tầng.
- Backend cần quyền SQS tối thiểu để send job, receive/delete result, đọc attributes; migration/provision queue dùng role pipeline riêng có quyền hẹp, không dùng runtime role.
- Worker chỉ nhận job, xóa job sau khi publish result thành công, gửi result, pull image và ghi telemetry.
- JWT_SECRET, database credentials, SMTP_PASS, AI_API_KEY đặt trong Secrets Manager/SSM SecureString; truyền vào task lúc khởi chạy, rotate theo quy trình.
- Frontend không được chứa secret. VITE_GOOGLE_CLIENT_ID là client ID công khai, không phải credential bảo mật; vẫn cần đúng OAuth origin/redirect configuration.
- Giữ CORS_ORIGINS, AI timeout, SMTP, Google client ID, run TTL và submission timeout trong cấu hình môi trường theo deployment. Tách dev/staging/prod.
- Bật mã hóa dữ liệu at-rest cho RDS, ElastiCache, S3 backup và EBS; mã hóa in-transit tới DB/Redis nếu cấu hình ứng dụng/driver hỗ trợ.

## Backup, migration và phục hồi

Hiện docker/backup.sh chỉ tạo pg_dump trong thư mục local .local/backups. Khi app chạy cloud, file trên máy developer không phải backup phục hồi được của database cloud.

Cần có:

1. RDS automated backups/PITR với retention phù hợp yêu cầu đề tài.
2. Snapshot trước migration rủi ro và export logic mã hóa sang S3 ở tài khoản/role phù hợp; lifecycle/retention không giữ vô hạn.
3. Phân quyền restore tách khỏi runtime API.
4. Quy trình phục hồi vào DB mới, chạy migrate status, kiểm tra bảng/row và API trước khi chuyển traffic.
5. Bài diễn tập restore có ghi thời gian phục hồi, dữ liệu mất tối đa có thể chấp nhận (RPO) và thời gian khôi phục (RTO).
6. Prisma migration chạy một lần bằng pipeline task sau backup/snapshot; không chạy migrate deploy đồng thời trên mọi backend replica.
7. Rollout app theo chiến lược tương thích schema: expand migration, deploy app, xác nhận, rồi mới bỏ cột cũ ở release sau. Rollback app image không tự rollback schema.

Redis chủ yếu chứa state tạm và rate limit; xác định rõ có cần persistence hay không. Không dùng Redis backup để thay thế PostgreSQL backup.

## Logs, metrics và alerts

Hiện dashboard đã đọc worker heartbeat, worker CPU/RAM nếu được gửi, queue pending/processing/DLQ, outbox retry và system errors. Tại cloud, đưa stdout/stderr của API và worker vào CloudWatch Logs với retention rõ ràng.

Không log source code, OTP, cookie/JWT, password, AI key hoặc SMTP credentials. Thêm requestId/submissionId/testcaseId/workerId để truy vết một lần nộp xuyên API → queue → worker → result.

Tối thiểu cần dashboard/alarm cho:

- Job queue: visible messages, oldest message age, in-flight count, DLQ count.
- Worker: desired/current/in-service capacity, heartbeat stale, worker error, CPU/RAM, thời gian xử lý một testcase.
- API: request rate, p50/p95/p99 latency, 4xx/5xx, task restarts, health/readiness.
- RDS: CPU, storage, connections, free memory, backup/migration state.
- Redis: memory, connections, evictions, availability.
- Scale: mọi event thay đổi desired capacity và thời gian từ alarm đến worker ready.
- Chi phí: budget alert theo tháng và alert khi compute/NAT/log ingestion vượt ngưỡng.

## Chi phí cần ước tính

Không chốt số tiền trước khi chọn region, giờ chạy, loại instance và retention. Ước tính bằng AWS Pricing Calculator theo ít nhất hai cấu hình:

- **Cấu hình demo tiết kiệm:** 1 API task, RDS nhỏ, Redis nhỏ hoặc tạm thời cùng host cho demo, worker ASG min 0/1 và max thấp, static frontend S3/CloudFront, SQS, logs retention ngắn. Đây là single/low redundancy, có cold start và downtime khi một instance/database lỗi.
- **Cấu hình có dự phòng:** API tối thiểu 2 task qua ALB, RDS HA/Multi-AZ, Redis HA nếu cần, worker min 1 và scale-out, backup/monitoring đủ retention. Chi phí cao hơn nhưng hợp với demo ổn định hơn.

Các mục cần tính riêng:

| Nhóm chi phí | Driver chính |
| --- | --- |
| EC2 sandbox workers | Số giờ instance, cỡ CPU/RAM, EBS, min/max capacity và thời gian idle. |
| ECS/ALB/backend | Số task/CPU/RAM, giờ ALB và lưu lượng. |
| RDS PostgreSQL | Loại instance, storage, IOPS, Multi-AZ, backup retention. |
| ElastiCache Redis | Node/HA, memory và giờ chạy. |
| CloudFront/S3 | Requests, data transfer, storage và log. |
| SQS | Số API requests, long polling, retry và DLQ retention. |
| NAT/VPC endpoints | Lưu lượng outbound và endpoint/interface hours; NAT Gateway có thể thành chi phí đáng kể. |
| CloudWatch/ECR/backup | Log ingestion/retention, metrics/alarms, image storage, S3 backup. |
| DNS/TLS | DNS query/hosted zone; ACM certificate thường không tính riêng khi dùng tích hợp AWS phù hợp. |

Ghi lại giả định, giá theo region ap-southeast-1 và ngày tra cứu trong báo cáo; không chỉ ghi tổng mà không nêu min/max worker và thời lượng chạy.

## Các giai đoạn thực hiện

### Giai đoạn A — thiết kế và quyết định

- Chốt domain, AWS account/region, RPO/RTO, ngân sách tháng và mức HA mong muốn.
- Chọn CloudFront + S3 cho frontend; ECS/ALB cho API; RDS/ElastiCache/SQS; EC2 ASG riêng cho worker.
- Vẽ trust boundaries, subnet/security groups, IAM matrix và luồng secret.
- Chốt worker image supply chain và queue scaling policy.

### Giai đoạn B — nền tảng và bảo mật

- Viết IaC cho VPC/subnets/security groups/roles, S3/CloudFront/ALB, ECS, RDS, Redis, queues/DLQ, ECR, alarms/secrets.
- Tạo build pipeline cho frontend/API/worker/sandbox images; pin tag/digest; quét dependency/image.
- Bỏ AWS static keys; xác minh cookie HTTPS/proxy/CORS.
- Hoàn thiện readiness/liveness, log redaction và database TLS nếu yêu cầu.

### Giai đoạn C — deploy và dữ liệu

- Tạo backup/snapshot; provision queue; deploy migration một lần; deploy API rồi frontend.
- Deploy worker EC2; xác minh image pulls, heartbeat, nhận job và gửi result.
- Thử backup/restore trên DB tách biệt; ghi endpoint, access method, runbook và chi phí.
- Smoke test từ Internet bằng HTTPS, đăng nhập, chạy Python/C++, submit bài và đọc history.

### Giai đoạn D — autoscale, resilience và nghiệm thu

- Tạo backlog metric/policy, ASG lifecycle/draining, CloudWatch alarms và ghi scale events.
- Chạy burst, steady-state, giảm tải và worker termination giữa job.
- Kiểm tra DLQ, retry, timeout/reconciliation, duplicate result, RDS failover/restore và API rollout.
- Lưu dữ liệu benchmark và ảnh/log minh chứng đã loại bỏ secret.

## Tiêu chí hoàn thành ưu tiên 1

- Người dùng bên ngoài truy cập được domain HTTPS; frontend, cookie session và /api cùng hoạt động.
- PostgreSQL và Redis không public; worker không truy cập Internet inbound và không có quyền DB.
- Python/C++ compile/run/submit hoàn chỉnh qua AWS queues; hidden results không bị lộ ngoài chính sách đã chọn.
- Worker tự scale lên khi backlog/queue age tăng và giảm an toàn khi tải hạ; scale events có số liệu.
- Migration/deploy/rollback/backup/restore có runbook và đã thực hành.
- CloudWatch hiển thị API, DB, Redis, queues, workers và scale; alerts được kiểm tra.
- Chi phí tháng được ước tính theo giả định công khai và có budget alert.


