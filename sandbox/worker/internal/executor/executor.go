package executor

import (
	"errors"
	"fmt"
	"os/exec"
	"time"

	"kltn-worker/internal/model"
)

type Result struct {
	Status model.Status

	Output string

	Error string
}

type Executor interface {
	Execute(job model.Job) Result
}

type LocalExecutor struct {
}

func (e LocalExecutor) Execute(job model.Job) Result {

	fmt.Println(
		"Executing submission:",
		job.SubmissionID,
	)

	fmt.Println(
		"Language:",
		job.Language,
	)

	// giả lập thời gian chạy sandbox
	time.Sleep(5 * time.Second)

	return Result{
		Status: model.RUN_SUCCESS,
		Output: "Hello from executor",
	}
}

func getExitCode(err error) int {

	var exitErr *exec.ExitError

	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}

	return -1
}
