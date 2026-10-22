package executor

import "kltn-worker/internal/model"

type PythonExecutor struct{ Image string }

func (e PythonExecutor) Execute(job model.Job) Result {
	return executeSandbox(job, e.Image, "python")
}
