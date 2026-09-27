package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"kltn-worker/internal/coordinator"
	"kltn-worker/internal/executor"
	"kltn-worker/internal/matcher"
	"kltn-worker/internal/queue"
	"kltn-worker/internal/result"
	"kltn-worker/internal/router"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

func main() {
	// 1. Lắng nghe tín hiệu tắt ứng dụng (Graceful Shutdown)
	ctx, cancel := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer cancel()

	log.Println("==================================================")
	log.Println("[Worker] Khởi chạy dịch vụ Judge Worker...")

	// 2. Kiểm tra và ghi log thông số cấu hình đầu vào
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "ap-southeast-1"
	}

	log.Printf("DEBUG ENV SQS_QUEUE_URL=[%s]", os.Getenv("SQS_QUEUE_URL"))
	
	queueURL := os.Getenv("SQS_QUEUE_URL")
	if queueURL == "" {
		log.Fatal("LỖI NHIÊM TRỌNG: Yêu cầu biến môi trường SQS_QUEUE_URL")
	}

	resultQueueURL := os.Getenv("RESULT_QUEUE_URL")
	if resultQueueURL == "" {
		log.Fatal("LỖI NHIỆM TRỌNG: Yêu cầu biến môi trường RESULT_QUEUE_URL")
	}

	log.Printf("[Config] AWS Region        : %s", region)
	log.Printf("[Config] SQS Job Queue URL : %s", queueURL)
	log.Printf("[Config] SQS Result Queue  : %s", resultQueueURL)

	// 3. Khởi tạo AWS Config và SQS Client
	cfg, err := config.LoadDefaultConfig(
		ctx,
		config.WithRegion(region),
	)
	if err != nil {
		log.Fatalf("LỖI NHIỆM TRỌNG: Không thể tải AWS SDK Config: %v", err)
	}

	sqsClient := sqs.NewFromConfig(cfg)

	// 4. Khởi tạo Publisher và Queue Component
	resultPublisher := result.Publisher{
		Client:   sqsClient,
		QueueURL: resultQueueURL,
	}

	jobQueue := queue.SQSQueue{
		Client:   sqsClient,
		QueueURL: queueURL,
	}

	// 5. Khởi tạo Executors & Router
	cppExecutor := executor.CppExecutor{
		Image: "cpp-sandbox",
	}

	pythonExecutor := executor.PythonExecutor{
		Image: "python-sandbox",
	}

	languageRouter := router.LanguageRouter{
		CppExecutor:    cppExecutor,
		PythonExecutor: pythonExecutor,
	}

	// 6. Khởi tạo Judge Coordinator
	judgeCoordinator := coordinator.Coordinator{
		Queue:           jobQueue,
		Router:          languageRouter,
		Matcher:         matcher.Matcher{},
		ResultPublisher: resultPublisher,
	}

	log.Println("[Worker] Đã đăng ký Sandbox Images: [cpp-sandbox, python-sandbox]")
	log.Println("[Worker] Tiến trình Judge Coordinator đã sẵn sàng nhận bài...")
	log.Println("==================================================")

	// 7. Thực thi Coordinator cho đến khi Context bị hủy (bởi SIGINT / SIGTERM)
	judgeCoordinator.Start(ctx)

	// Log xác nhận hoàn tất giải phóng tài nguyên và tắt ứng dụng
	log.Println("\n==================================================")
	log.Println("[Worker] Đã nhận tín hiệu dừng. Hoàn tất Graceful Shutdown!")
	log.Println("==================================================")
}