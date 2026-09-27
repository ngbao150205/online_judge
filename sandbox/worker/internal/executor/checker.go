package executor

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

const (
	absoluteTolerance = 1e-6
	relativeTolerance = 1e-6
)

func normalizeCheckerType(value string) (string, error) {
	kind := strings.ToUpper(strings.TrimSpace(value))
	if kind == "" {
		kind = "TOKENS"
	}

	switch kind {
	case "TOKENS", "FLOAT":
		return kind, nil
	default:
		return "", fmt.Errorf("unsupported checkerType: %q", value)
	}
}

func parseFiniteNumber(token string) (float64, error) {
	value, err := strconv.ParseFloat(token, 64)
	if err != nil {
		return 0, err
	}

	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, fmt.Errorf("number must be finite")
	}

	return value, nil
}

// validateExpected kiểm tra đáp án chuẩn trước khi chạy bài.
// Đáp án chuẩn sai là lỗi hệ thống, không phải WA.
func validateExpected(expected, kind string) error {
	if kind != "FLOAT" {
		return nil
	}

	for i, token := range strings.Fields(expected) {
		if _, err := parseFiniteNumber(token); err != nil {
			return fmt.Errorf(
				"invalid expected number at token %d", i+1,
			)
		}
	}

	return nil
}

func numbersClose(actual, expected float64) bool {
	if actual == expected {
		return true
	}

	diff := math.Abs(actual - expected)

	if diff <= absoluteTolerance {
		return true
	}

	if expected == 0 {
		return false
	}

	return diff/math.Abs(expected) <= relativeTolerance
}

// checkOutput trả:
// - accepted: kết quả chấm.
// - feedback: lý do WA.
// - err: lỗi cấu hình hoặc đáp án chuẩn.
func checkOutput(
	actual, expected, checkerType string,
) (accepted bool, feedback string, err error) {
	kind, err := normalizeCheckerType(checkerType)
	if err != nil {
		return false, "", err
	}

	if err := validateExpected(expected, kind); err != nil {
		return false, "", err
	}

	actualTokens := strings.Fields(actual)
	expectedTokens := strings.Fields(expected)

	if len(actualTokens) != len(expectedTokens) {
		return false,
			"Wrong Answer: thiếu hoặc thừa nội dung đầu ra; " +
				"chỉ in nội dung đề yêu cầu",
			nil
	}

	for i, actualToken := range actualTokens {
		expectedToken := expectedTokens[i]

		if kind == "TOKENS" {
			if actualToken != expectedToken {
				return false, fmt.Sprintf(
					"Wrong Answer: token thứ %d không khớp", i+1,
				), nil
			}
			continue
		}

		actualNumber, parseErr := parseFiniteNumber(actualToken)
		if parseErr != nil {
			return false, fmt.Sprintf(
				"Wrong Answer: token thứ %d phải là số hữu hạn",
				i+1,
			), nil
		}

		// Đã kiểm tra toàn bộ expected ở validateExpected.
		expectedNumber, parseErr := parseFiniteNumber(expectedToken)
		if parseErr != nil {
			return false, "", parseErr
		}

		if !numbersClose(actualNumber, expectedNumber) {
			return false, fmt.Sprintf(
				"Wrong Answer: giá trị số thứ %d không khớp",
				i+1,
			), nil
		}
	}

	return true, "", nil
}
