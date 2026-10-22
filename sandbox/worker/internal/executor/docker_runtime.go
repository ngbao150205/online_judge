package executor

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
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
	memoryLimitMB int,
) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

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

	cmd := exec.CommandContext(ctx,
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
		// SOURCE CODE is streamed after start; no host bind mount.
		// =================================================
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

// CopySource streams the worker-local file into sandbox tmpfs. This works when
// the worker runs in a container and the Docker daemon cannot see its /tmp.
func (d DockerRuntime) CopySource(name, filePath string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	source, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer source.Close()
	cmd := exec.CommandContext(ctx, "docker", "exec", "-i", name, "tee", "/workspace/"+filepath.Base(filePath))
	cmd.Stdin = source
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("copy source into sandbox: %w", err)
	}
	return nil
}

// StartContainer chuyển container từ Created → Running.
func (d DockerRuntime) StartContainer(
	name string,
) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx,
		"docker",
		"start",
		name,
	)

	return cmd.Run()
}

// ExecSeparated drains stdout/stderr concurrently via os/exec and bounds output.
func (d DockerRuntime) ExecSeparated(ctx context.Context, name, command, stdin string) ([]byte, []byte, error) {
	cmd := exec.CommandContext(ctx, "docker", "exec", "-i", name, "bash", "-c", command)
	cmd.Stdin = strings.NewReader(stdin)
	out, diagnostics := &boundedBuffer{}, &boundedBuffer{}
	cmd.Stdout, cmd.Stderr = out, diagnostics
	err := cmd.Run()
	if out.exceeded || diagnostics.exceeded {
		err = fmt.Errorf("output exceeds 64 KiB per stream")
	}
	return out.Bytes(), diagnostics.Bytes(), err
}

func (d DockerRuntime) ExecContext(ctx context.Context, name, command, stdin string) ([]byte, error) {
	out, diagnostics, err := d.ExecSeparated(ctx, name, command, stdin)
	return append(out, diagnostics...), err
}

type boundedBuffer struct {
	bytes.Buffer
	exceeded bool
}

func (b *boundedBuffer) Write(data []byte) (int, error) {
	size := len(data)
	remaining := 65536 - b.Len()
	if size > remaining {
		b.exceeded = true
	}
	if remaining > 0 {
		b.Buffer.Write(data[:min(size, remaining)])
	}
	return size, nil // Continue draining the pipe; never deadlock a noisy workload.
}

type ResourceMetrics struct{ MemoryPeakBytes, CPUUsageUsec, OOMKills int64 }

func parseResourceMetrics(data string) (ResourceMetrics, error) {
	values := map[string]int64{}
	for _, line := range strings.Split(data, "\n") {
		fields := strings.Fields(line)
		if len(fields) != 2 {
			continue
		}
		value, err := strconv.ParseInt(fields[1], 10, 64)
		if err == nil {
			values[fields[0]] = value
		}
	}
	peak, peakFound := values["memory_peak"]
	cpu, cpuFound := values["usage_usec"]
	oom, oomFound := values["oom_kill"]
	if !peakFound || !cpuFound || !oomFound {
		return ResourceMetrics{}, fmt.Errorf("cgroup v2 metrics unavailable")
	}
	return ResourceMetrics{MemoryPeakBytes: peak, CPUUsageUsec: cpu, OOMKills: oom}, nil
}
func (d DockerRuntime) ReadMetrics(name string) (ResourceMetrics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	output, err := exec.CommandContext(ctx, "docker", "exec", name, "sh", "-c", `printf 'memory_peak '; cat /sys/fs/cgroup/memory.peak; cat /sys/fs/cgroup/cpu.stat; cat /sys/fs/cgroup/memory.events`).Output()
	if err != nil {
		return ResourceMetrics{}, err
	}
	return parseResourceMetrics(string(output))
}
func (d DockerRuntime) RemoveContainer(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return exec.CommandContext(ctx, "docker", "rm", "-f", name).Run()
}
