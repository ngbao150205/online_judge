package executor

import (
	"errors"
	"os/exec"

	"kltn-worker/internal/model"
)

type Result struct {
	ExecutionTime *int64
	MemoryUsed    *int64 // KiB, peak cgroup memory during execution
	CPUTime       *int64 // milliseconds of cgroup CPU usage
	CompileTime   *int64 // milliseconds, compiler container lifecycle excluded

	Status model.Status

	Output string

	Error string
}

type Executor interface {
	Execute(job model.Job) Result
}

func getExitCode(err error) int {

	var exitErr *exec.ExitError

	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}

	return -1
}
