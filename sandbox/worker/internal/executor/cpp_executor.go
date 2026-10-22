package executor

import "kltn-worker/internal/model"

type CppExecutor struct{ Image string }

func (e CppExecutor) Execute(job model.Job) Result {
	return executeSandbox(job, e.Image, "cpp")
}
