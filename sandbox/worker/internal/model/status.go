package model

type Status string

const (
	AC Status = "AC"

	WA Status = "WA"

	CE Status = "CE"

	RE Status = "RE"

	TLE Status = "TLE"

	MLE Status = "MLE"

	SYSTEM_ERROR Status = "SYSTEM_ERROR"

	RUN_SUCCESS Status = "RUN_SUCCESS"
)
