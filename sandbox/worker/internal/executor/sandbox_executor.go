package executor

import (
	"context"
	"fmt"
	"io"
	"kltn-worker/internal/model"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func executeSandbox(job model.Job, image, language string) (result Result) {
	kind := strings.ToUpper(strings.TrimSpace(job.SubmissionType))
	if kind != "PLAYGROUND" && kind != "PROBLEM_TRIAL" && kind != "PROBLEM_SUBMIT" {
		return Result{Status: model.SYSTEM_ERROR, Error: "invalid submissionType"}
	}
	checker := ""
	if kind != "PLAYGROUND" {
		var err error
		checker, err = normalizeCheckerType(job.CheckerType)
		if err != nil {
			return Result{Status: model.SYSTEM_ERROR, Error: "checker config: " + err.Error()}
		}
		if err = validateExpected(job.ExpectedOutput, checker); err != nil {
			return Result{Status: model.SYSTEM_ERROR, Error: "invalid expected output: " + err.Error()}
		}
	}
	limit := job.TimeLimit
	if limit <= 0 {
		limit = 2000
	}
	if limit > 60000 || job.MemoryLimit > 1024 || len(job.Code) > 65536 || len(job.Input) > 65536 {
		return Result{Status: model.SYSTEM_ERROR, Error: "invalid execution limits"}
	}
	workDir, err := os.MkdirTemp("", "sandbox-")
	if err != nil {
		return Result{Status: model.SYSTEM_ERROR, Error: "create workspace"}
	}
	defer os.RemoveAll(workDir)
	runtime := DockerRuntime{Image: image}
	base := filepath.Base(workDir)
	extension := ".py"
	if language == "cpp" {
		extension = ".cpp"
	}
	source := filepath.Join(workDir, "main"+extension)
	if err := os.WriteFile(source, []byte(job.Code), 0644); err != nil {
		return Result{Status: model.SYSTEM_ERROR, Error: "write source"}
	}

	if language == "cpp" {
		// Compilation has a separate cgroup, so its RAM/CPU cannot inflate run metrics.
		compileName := base + "-compile"
		if _, err = runtime.CreateContainer(compileName, max(job.MemoryLimit, 256)); err != nil {
			return Result{Status: model.SYSTEM_ERROR, Error: "create compiler container"}
		}
		defer runtime.RemoveContainer(compileName)
		if err = runtime.StartContainer(compileName); err != nil {
			return Result{Status: model.SYSTEM_ERROR, Error: "start compiler container"}
		}
		if err = runtime.CopySource(compileName, source); err != nil {
			return Result{Status: model.SYSTEM_ERROR, Error: err.Error()}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
		started := time.Now()
		out, diagnostics, compileErr := runtime.ExecSeparated(ctx, compileName, "timeout --signal=KILL 10s g++ -std=c++17 /workspace/main.cpp -O2 -o /workspace/main", "")
		elapsed := time.Since(started).Milliseconds()
		cancel()
		result.CompileTime = &elapsed
		if compileErr != nil {
			result.Status = model.CE
			result.Output = string(out)
			result.Error = string(diagnostics)
			if result.Error == "" {
				result.Error = "Compilation failed or exceeded 10s"
			}
			return
		}
		executable := filepath.Join(workDir, "main")
		copyCtx, copyCancel := context.WithTimeout(context.Background(), 5*time.Second)
		file, createErr := os.Create(executable)
		if createErr != nil {
			copyCancel()
			result.Status = model.SYSTEM_ERROR
			result.Error = "create executable file"
			return
		}
		// docker cp cannot read tmpfs; stream via exec from the running compiler.
		copyCommand := exec.CommandContext(copyCtx, "docker", "exec", compileName, "cat", "/workspace/main")
		copyCommand.Stdout = &limitedFileWriter{writer: file, remaining: 32 * 1024 * 1024}
		err = copyCommand.Run()
		closeErr := file.Close()
		if err == nil {
			err = closeErr
		}
		copyCancel()
		if err != nil {
			result.Status = model.SYSTEM_ERROR
			result.Error = "copy compiled executable"
			return
		}
		source = executable
	}
	runName := base + "-run"
	if _, err = runtime.CreateContainer(runName, job.MemoryLimit); err != nil {
		result.Status = model.SYSTEM_ERROR
		result.Error = "create execution container"
		return
	}
	defer runtime.RemoveContainer(runName)
	if err = runtime.StartContainer(runName); err != nil {
		result.Status = model.SYSTEM_ERROR
		result.Error = "start execution container"
		return
	}
	if err = runtime.CopySource(runName, source); err != nil {
		result.Status = model.SYSTEM_ERROR
		result.Error = err.Error()
		return
	}
	command := "python3 -u /workspace/main.py"
	if language == "cpp" {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		_, err = runtime.ExecContext(ctx, runName, "chmod +x /workspace/main", "")
		cancel()
		if err != nil {
			result.Status = model.SYSTEM_ERROR
			result.Error = "set executable permissions"
			return
		}
		command = "/workspace/main"
	}
	before, beforeErr := runtime.ReadMetrics(runName)
	// timeout kills the whole workload process group; the outer context is a transport failsafe.
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(limit)*time.Millisecond+2*time.Second)
	started := time.Now()
	out, diagnostics, runErr := runtime.ExecSeparated(ctx, runName, fmt.Sprintf("timeout --signal=KILL %.3fs %s", float64(limit)/1000, command), job.Input)
	elapsed := time.Since(started).Milliseconds()
	transportTimeout := ctx.Err() == context.DeadlineExceeded
	cancel()
	after, metricErr := runtime.ReadMetrics(runName)
	result.ExecutionTime = &elapsed
	if metricErr == nil {
		peak := (after.MemoryPeakBytes + 1023) / 1024
		result.MemoryUsed = &peak
		if beforeErr == nil {
			cpu := max(int64(0), after.CPUUsageUsec-before.CPUUsageUsec) / 1000
			result.CPUTime = &cpu
		}
	}
	result.Output, result.Error = string(out), string(diagnostics)
	code := getExitCode(runErr)
	if metricErr == nil && after.OOMKills > before.OOMKills {
		result.Status = model.MLE
		result.Error = "Memory Limit Exceeded (cgroup OOM)"
		return
	}
	if transportTimeout || ((code == 124 || code == 137) && elapsed >= int64(limit)) {
		result.Status = model.TLE
		result.Error = "Time Limit Exceeded"
		return
	}
	if runErr != nil {
		result.Status = model.RE
		if result.Error == "" {
			result.Error = runErr.Error()
		}
		return
	}
	if kind == "PLAYGROUND" {
		result.Status = model.RUN_SUCCESS
		return
	}
	accepted, feedback, err := checkOutput(result.Output, job.ExpectedOutput, checker)
	if err != nil {
		result.Status = model.SYSTEM_ERROR
		result.Error = err.Error()
		return
	}
	if accepted {
		result.Status = model.AC
	} else {
		result.Status = model.WA
		result.Error = feedback
	}
	return
}

type limitedFileWriter struct {
	writer    io.Writer
	remaining int
}

func (w *limitedFileWriter) Write(data []byte) (int, error) {
	if len(data) > w.remaining {
		return 0, fmt.Errorf("executable exceeds 32 MiB")
	}
	n, err := w.writer.Write(data)
	w.remaining -= n
	return n, err
}
