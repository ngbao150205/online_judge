package model

type ResultMessage struct {
	SubmissionID string `json:"submissionId"`

	// ID testcase mà Worker vừa chạy
	TestcaseID string `json:"testcaseId"`

	Status Status `json:"status"`

	Output string `json:"output"`

	Error string `json:"error"`

	ExecutionTime int64 `json:"executionTime"`
}
