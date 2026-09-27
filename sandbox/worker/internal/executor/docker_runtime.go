package executor

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"path/filepath"
	"strings"
)

// DockerRuntime quản lý vòng đời của sandbox container.
type DockerRuntime struct {
	Image string
}

// CreateContainer tạo một container riêng cho submission.
//
// memoryLimitMB:
// - <= 0: mặc định 256MB
// - > 0: dùng đúng giới hạn được truyền vào
func (d DockerRuntime) CreateContainer(
	name string,
	filePath string,
	memoryLimitMB int,
) (string, error) {

	// =====================================================
	// MEMORY LIMIT
	// =====================================================

	if memoryLimitMB <= 0 {
		memoryLimitMB = 256
	}

	memFlag := fmt.Sprintf("%dm", memoryLimitMB)

	// =====================================================
	// CREATE CONTAINER
	// =====================================================

	cmd := exec.Command(
		"docker",
		"create",

		"--name",
		name,

		// =================================================
		// CPU LIMIT
		// =================================================
		"--cpus",
		"1",

		// =================================================
		// MEMORY LIMIT
		// =================================================
		"--memory",
		memFlag,

		// =================================================
		// DISABLE SWAP
		// =================================================
		"--memory-swap",
		memFlag,

		// =================================================
		// NETWORK ISOLATION
		// =================================================
		"--network",
		"none",

		// =================================================
		// DROP ALL LINUX CAPABILITIES
		// =================================================
		"--cap-drop",
		"ALL",

		// =================================================
		// READ ONLY ROOT FILESYSTEM
		// =================================================
		"--read-only",

		// =================================================
		// PROCESS LIMIT
		// =================================================
		"--pids-limit",
		"64",

		// =================================================
		// PREVENT PRIVILEGE ESCALATION
		// =================================================
		"--security-opt",
		"no-new-privileges",

		// =================================================
		// TEMP STORAGE
		// =================================================
		"--tmpfs",
		"/workspace:rw,exec,uid=1000,gid=1000,mode=1777",

		"--tmpfs",
		"/tmp:rw,exec,uid=1000,gid=1000,mode=1777",

		// =================================================
		// SOURCE CODE
		// =================================================
		"-v",
		filepath.Dir(filePath)+":/code:ro",

		// =================================================
		// IMAGE
		// =================================================
		d.Image,

		// Container phải tiếp tục Running để docker exec
		"sleep",
		"300",
	)

	output, err := cmd.Output()

	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(output)), nil
}

// StartContainer chuyển container từ Created → Running.
func (d DockerRuntime) StartContainer(
	name string,
) error {

	cmd := exec.Command(
		"docker",
		"start",
		name,
	)

	return cmd.Run()
}

// ExecContext thực thi command bên trong container.
//
// stdin được truyền trực tiếp vào STDIN của process.
//
// Ví dụ:
//
//	input := "bao\n"
//
//	command:
//
//	python3 /code/main.py
//
// Python:
//
//	name = input()
//
// sẽ nhận:
//
//	name == "bao"
//
// Context tự động hủy docker exec khi vượt TimeLimit.
func (d DockerRuntime) ExecContext(
	ctx context.Context,
	name string,
	command string,
	stdin string,
) ([]byte, error) {

	// =====================================================
	// DOCKER EXEC
	// =====================================================
	//
	// -i = giữ STDIN mở
	//
	// Không dùng "-t" vì sandbox không cần pseudo-TTY.
	//
	// Không dùng:
	//
	// echo "input" | python ...
	//
	// vì cách đó dễ lỗi với multiline input và
	// ký tự đặc biệt.
	//
	// =====================================================

	cmd := exec.CommandContext(
		ctx,
		"docker",
		"exec",
		"-i",
		name,
		"bash",
		"-c",
		command,
	)

	// =====================================================
	// TRUYỀN INPUT VÀO STDIN
	// =====================================================

	stdinPipe, err := cmd.StdinPipe()

	if err != nil {
		return nil, fmt.Errorf(
			"create stdin pipe: %w",
			err,
		)
	}

	// =====================================================
	// CAPTURE STDOUT + STDERR
	// =====================================================

	output, err := captureCommandOutput(
		cmd,
		stdinPipe,
		stdin,
	)

	return output, err
}

// captureCommandOutput chạy command, truyền stdin,
// đồng thời gom stdout và stderr.
//
// Stdout + stderr được gom chung để Python traceback,
// compiler error hoặc runtime error có thể được trả
// về frontend.
func captureCommandOutput(
	cmd *exec.Cmd,
	stdinPipe io.WriteCloser,
	input string,
) ([]byte, error) {

	// =====================================================
	// STDOUT
	// =====================================================

	stdout, err := cmd.StdoutPipe()

	if err != nil {
		_ = stdinPipe.Close()

		return nil, fmt.Errorf(
			"create stdout pipe: %w",
			err,
		)
	}

	// =====================================================
	// STDERR
	// =====================================================

	stderr, err := cmd.StderrPipe()

	if err != nil {
		_ = stdinPipe.Close()

		return nil, fmt.Errorf(
			"create stderr pipe: %w",
			err,
		)
	}

	// =====================================================
	// START PROCESS
	// =====================================================

	if err := cmd.Start(); err != nil {
		_ = stdinPipe.Close()

		return nil, err
	}

	// =====================================================
	// WRITE INPUT TO STDIN
	// =====================================================

	_, writeErr := io.WriteString(
		stdinPipe,
		input,
	)

	closeErr := stdinPipe.Close()

	if writeErr != nil {
		// Không return ngay vì process có thể vẫn còn
		// output/error cần đọc.
	}

	if closeErr != nil {
		// Tương tự, tiếp tục đọc output.
	}

	// =====================================================
	// READ STDOUT + STDERR
	// =====================================================

	stdoutData, stdoutErr := io.ReadAll(stdout)

	stderrData, stderrErr := io.ReadAll(stderr)

	// =====================================================
	// WAIT FOR PROCESS
	// =====================================================

	waitErr := cmd.Wait()

	// =====================================================
	// COMBINE OUTPUT
	// =====================================================

	result := make([]byte, 0, len(stdoutData)+len(stderrData))

	result = append(result, stdoutData...)
	result = append(result, stderrData...)

	// =====================================================
	// RETURN FIRST RELEVANT ERROR
	// =====================================================

	if waitErr != nil {
		return result, waitErr
	}

	if writeErr != nil {
		return result, fmt.Errorf(
			"write stdin: %w",
			writeErr,
		)
	}

	if stdoutErr != nil {
		return result, fmt.Errorf(
			"read stdout: %w",
			stdoutErr,
		)
	}

	if stderrErr != nil {
		return result, fmt.Errorf(
			"read stderr: %w",
			stderrErr,
		)
	}

	return result, nil
}

// RemoveContainer xóa sandbox sau khi xử lý xong.
func (d DockerRuntime) RemoveContainer(
	name string,
) error {

	cmd := exec.Command(
		"docker",
		"rm",
		"-f",
		name,
	)

	return cmd.Run()
}
