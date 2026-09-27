package router

import (
	"errors"

	"kltn-worker/internal/executor"
	"kltn-worker/internal/model"
)

var ErrUnsupportedLanguage = errors.New("unsupported language")

type LanguageRouter struct {
	CppExecutor executor.Executor

	PythonExecutor executor.Executor
}

func (r LanguageRouter) GetExecutor(
	job model.Job,
) (executor.Executor, error) {

	switch job.Language {

	case "cpp":

		return r.CppExecutor, nil

	case "python":

		return r.PythonExecutor, nil

	default:

		return nil, ErrUnsupportedLanguage

	}

}
