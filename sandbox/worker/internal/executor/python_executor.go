package executor

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"kltn-worker/internal/model"
)

type PythonExecutor struct {
	Image string
}

// Execute chạy một job Python trong Docker sandbox.
//
// Ba luồng nghiệp vụ:
//
//   - PLAYGROUND:
//     Đọc job.Input và trả output thực tế.
//     Chạy thành công trả RUN_SUCCESS, không gọi checker.
//
//   - PROBLEM_TRIAL:
//     Chạy và so sánh với đáp án của testcase chạy thử.
//     Trả AC / WA hoặc lỗi thực thi.
//
//   - PROBLEM_SUBMIT:
//     Chạy và so sánh với đáp án của testcase chính thức.
//     Trả AC / WA hoặc lỗi thực thi.
//
// Backend chịu trách nhiệm chọn testcase, tổng hợp kết quả
// và lưu lịch sử nộp chính thức.
//
// File này sử dụng các hàm trong checker.go:
// normalizeCheckerType, validateExpected, checkOutput.
func (e PythonExecutor) Execute(job model.Job) Result {
	// =====================================================
	// STEP 1 - Xác định luồng nghiệp vụ
	// =====================================================

	submissionType := strings.ToUpper(
		strings.TrimSpace(job.SubmissionType),
	)

	shouldJudge := false

	switch submissionType {
	case "PLAYGROUND":
		shouldJudge = false

	case "PROBLEM_TRIAL", "PROBLEM_SUBMIT":
		shouldJudge = true

	default:
		return Result{
			Status: model.SYSTEM_ERROR,
			Error: "invalid submissionType: expected PLAYGROUND, " +
				"PROBLEM_TRIAL or PROBLEM_SUBMIT",
		}
	}

	// =====================================================
	// STEP 2 - Kiểm tra checker và đáp án chuẩn
	// =====================================================

	var checkerType string

	if shouldJudge {
		var err error

		checkerType, err = normalizeCheckerType(job.CheckerType)
		if err != nil {
			return Result{
				Status: model.SYSTEM_ERROR,
				Error:  "checker configuration: " + err.Error(),
			}
		}

		if err := validateExpected(
			job.ExpectedOutput,
			checkerType,
		); err != nil {
			return Result{
				Status: model.SYSTEM_ERROR,
				Error:  "invalid expected output: " + err.Error(),
			}
		}
	}

	// =====================================================
	// STEP 3 - Cấu hình time limit
	// =====================================================

	timeoutMs := job.TimeLimit
	if timeoutMs <= 0 {
		timeoutMs = 2000
	}

	execTimeout := time.Duration(timeoutMs) * time.Millisecond

	// =====================================================
	// STEP 4 - Tạo thư mục tạm và ghi source code
	// =====================================================

	workDir, err := os.MkdirTemp("", "sandbox-*")
	if err != nil {
		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  "create temp directory: " + err.Error(),
		}
	}
	defer os.RemoveAll(workDir)

	filePath := filepath.Join(workDir, "main.py")

	if err := os.WriteFile(
		filePath,
		[]byte(job.Code),
		0644,
	); err != nil {
		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  "write Python source: " + err.Error(),
		}
	}

	// =====================================================
	// STEP 5 - Tạo Docker container
	// =====================================================

	runtime := DockerRuntime{
		Image: e.Image,
	}

	// MkdirTemp đã tạo tên riêng cho mỗi job.
	containerName := filepath.Base(workDir)

	_, err = runtime.CreateContainer(
		containerName,
		filePath,
		job.MemoryLimit,
	)
	if err != nil {
		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  "create container: " + err.Error(),
		}
	}
	defer runtime.RemoveContainer(containerName)

	// =====================================================
	// STEP 6 - Start container
	// =====================================================

	if err := runtime.StartContainer(containerName); err != nil {
		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  "start container: " + err.Error(),
		}
	}

	// =====================================================
	// STEP 7 - Chạy Python với stdin
	// =====================================================

	// Time limit bắt đầu tính tại bước thực thi.
	// Không bao gồm thời gian tạo/start container.
	runCtx, cancelRun := context.WithTimeout(
		context.Background(),
		execTimeout,
	)
	defer cancelRun()

	// -u: giảm buffering để giữ được output đã in
	// khi chương trình lỗi hoặc hết thời gian.
	//
	// ExecContext phải trả stdout riêng để dùng cho checker.
	runOutput, runErr := runtime.ExecContext(
		runCtx,
		containerName,
		"python3 -u /code/main.py",
		job.Input,
	)

	actualOutput := string(runOutput)

	// =====================================================
	// STEP 8 - Kiểm tra Time Limit Exceeded
	// =====================================================

	if runCtx.Err() == context.DeadlineExceeded {
		return Result{
			Status: model.TLE,
			Output: actualOutput,
			Error:  "Time Limit Exceeded",
		}
	}

	// =====================================================
	// STEP 9 - Kiểm tra lỗi thực thi
	// =====================================================

	if runErr != nil {
		exitCode := getExitCode(runErr)

		switch exitCode {
		case 137:
			// Giữ cách ánh xạ của runtime hiện tại.
			// Exit code 137 cũng có thể do SIGKILL ngoài OOM;
			// cần runtime xác nhận OOM để phân loại MLE chính xác.
			return Result{
				Status: model.MLE,
				Output: actualOutput,
				Error:  "Process killed (exit code 137; possible memory limit exceeded)",
			}

		case 139:
			return Result{
				Status: model.RE,
				Output: actualOutput,
				Error:  "Segmentation Fault",
			}

		default:
			return Result{
				Status: model.RE,
				Output: actualOutput,
				Error: fmt.Sprintf(
					"Python execution failed: %v",
					runErr,
				),
			}
		}
	}

	// =====================================================
	// STEP 10 - Chạy tự do: trả output thực tế
	// =====================================================

	if !shouldJudge {
		return Result{
			Status: model.RUN_SUCCESS,
			Output: actualOutput,
		}
	}

	// =====================================================
	// STEP 11 - Chấm testcase của problem
	// =====================================================

	// PROBLEM_TRIAL và PROBLEM_SUBMIT dùng cùng checker.
	// ExpectedOutput rỗng vẫn được chấm bình thường.
	accepted, feedback, checkerErr := checkOutput(
		actualOutput,
		job.ExpectedOutput,
		checkerType,
	)

	if checkerErr != nil {
		return Result{
			Status: model.SYSTEM_ERROR,
			Output: actualOutput,
			Error:  "checker: " + checkerErr.Error(),
		}
	}

	if accepted {
		return Result{
			Status: model.AC,
			Output: actualOutput,
		}
	}

	return Result{
		Status: model.WA,
		Output: actualOutput,
		Error:  feedback,
	}
}

// Giữ lại để tương thích nếu executor khác đang gọi hàm này.
// PythonExecutor phía trên đã chuyển sang dùng checker.
func normalizeOutput(output string) string {
	output = strings.ReplaceAll(output, "\r\n", "\n")
	output = strings.ReplaceAll(output, "\r", "\n")

	return strings.TrimSpace(output)
}
