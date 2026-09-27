package model

type Job struct {
	// ID chung của một lần chạy hoặc nộp bài.
	SubmissionID string `json:"submissionId"`

	// ID testcase; để rỗng khi chạy PLAYGROUND.
	TestcaseID string `json:"testcaseId"`

	// PLAYGROUND / PROBLEM_TRIAL / PROBLEM_SUBMIT.
	SubmissionType string `json:"submissionType"`

	// TOKENS / FLOAT.
	// Nếu không có, checker mặc định TOKENS.
	CheckerType string `json:"checkerType"`

	Language string `json:"language"`

	Code string `json:"code"`

	// Dữ liệu truyền vào stdin.
	Input string `json:"input"`

	// Đáp án rỗng vẫn hợp lệ khi chấm testcase.
	ExpectedOutput string `json:"expectedOutput"`

	// Milliseconds.
	TimeLimit int `json:"timeLimit"`

	// Megabytes.
	MemoryLimit int `json:"memoryLimit"`
}
