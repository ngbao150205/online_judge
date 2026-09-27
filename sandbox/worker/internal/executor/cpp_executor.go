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

type CppExecutor struct {
	Image string
}

func (e CppExecutor) Execute(job model.Job) Result {

	// =====================================================
	// STEP 1 - Xác định nghiệp vụ
	// =====================================================

	submissionType :=
		strings.ToUpper(
			strings.TrimSpace(
				job.SubmissionType,
			),
		)

	shouldJudge := false

	switch submissionType {

	case "PLAYGROUND":

		shouldJudge = false

	case "PROBLEM_TRIAL",
		"PROBLEM_SUBMIT":

		shouldJudge = true

	default:

		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  "invalid submissionType",
		}

	}

	// =====================================================
	// STEP 2 - Checker
	// =====================================================

	var checkerType string

	if shouldJudge {

		var err error

		checkerType, err =
			normalizeCheckerType(
				job.CheckerType,
			)

		if err != nil {

			return Result{
				Status: model.SYSTEM_ERROR,
				Error:  "checker config: " + err.Error(),
			}

		}

		if err :=
			validateExpected(
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
	// STEP 3 - Timeout
	// =====================================================

	timeoutMs :=
		job.TimeLimit

	if timeoutMs <= 0 {

		timeoutMs = 2000

	}

	execTimeout :=
		time.Duration(timeoutMs) *
			time.Millisecond

	// =====================================================
	// STEP 4 - Create workspace
	// =====================================================

	workDir, err :=
		os.MkdirTemp(
			"",
			"sandbox-*",
		)

	if err != nil {

		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  err.Error(),
		}

	}

	defer os.RemoveAll(workDir)

	filePath :=
		filepath.Join(
			workDir,
			"main.cpp",
		)

	err =
		os.WriteFile(
			filePath,
			[]byte(job.Code),
			0644,
		)

	if err != nil {

		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  "write cpp source: " + err.Error(),
		}

	}

	// =====================================================
	// STEP 5 - Docker container
	// =====================================================

	runtime :=
		DockerRuntime{
			Image: e.Image,
		}

	containerName :=
		filepath.Base(
			workDir,
		)

	_, err =
		runtime.CreateContainer(
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

	defer runtime.RemoveContainer(
		containerName,
	)

	// =====================================================
	// STEP 6 - Start container
	// =====================================================

	err =
		runtime.StartContainer(
			containerName,
		)

	if err != nil {

		return Result{
			Status: model.SYSTEM_ERROR,
			Error:  "start container: " + err.Error(),
		}

	}

	// =====================================================
	// STEP 7 - Compile C++
	// =====================================================

	compileCtx, cancelCompile :=
		context.WithTimeout(
			context.Background(),
			10*time.Second,
		)

	defer cancelCompile()

	compileOutput, compileErr :=
		runtime.ExecContext(
			compileCtx,
			containerName,
			"g++ -std=c++17 /code/main.cpp -O2 -o /workspace/main",
			"",
		)

	if compileCtx.Err() == context.DeadlineExceeded {

		return Result{
			Status: model.TLE,
			Output: string(compileOutput),
			Error:  "compile timeout",
		}

	}

	if compileErr != nil {

		return Result{
			Status: model.CE,
			Output: string(compileOutput),
			Error:  compileErr.Error(),
		}

	}

	// =====================================================
	// STEP 8 - Execute
	// =====================================================

	runCtx, cancelRun :=
		context.WithTimeout(
			context.Background(),
			execTimeout,
		)

	defer cancelRun()

	runOutput, runErr :=
		runtime.ExecContext(
			runCtx,
			containerName,
			"/workspace/main",
			job.Input,
		)

	actualOutput :=
		string(runOutput)

	// =====================================================
	// STEP 9 - Timeout
	// =====================================================

	if runCtx.Err() == context.DeadlineExceeded {

		return Result{
			Status: model.TLE,
			Output: actualOutput,
			Error:  "Time Limit Exceeded",
		}

	}

	// =====================================================
	// STEP 10 - Runtime error
	// =====================================================

	if runErr != nil {

		exitCode :=
			getExitCode(runErr)

		switch exitCode {

		case 137:

			return Result{
				Status: model.MLE,
				Output: actualOutput,
				Error:  "memory limit exceeded",
			}

		case 139:

			return Result{
				Status: model.RE,
				Output: actualOutput,
				Error:  "segmentation fault",
			}

		default:

			return Result{
				Status: model.RE,
				Output: actualOutput,
				Error: fmt.Sprintf(
					"C++ execution failed: %v",
					runErr,
				),
			}

		}

	}

	// =====================================================
	// STEP 11 - Playground
	// =====================================================

	if !shouldJudge {

		return Result{

			Status: model.RUN_SUCCESS,

			Output: actualOutput,
		}

	}

	// =====================================================
	// STEP 12 - Checker
	// =====================================================

	accepted, feedback, checkerErr :=
		checkOutput(
			actualOutput,
			job.ExpectedOutput,
			checkerType,
		)

	if checkerErr != nil {

		return Result{

			Status: model.SYSTEM_ERROR,

			Output: actualOutput,

			Error: "checker: " + checkerErr.Error(),
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

		Error: feedback,
	}

}
