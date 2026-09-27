package matcher

import (
	"strings"

	"kltn-worker/internal/model"
)

type Matcher struct{}

func (m Matcher) Compare(
	output string,
	expected string,
) model.Status {

	actual := strings.TrimSpace(output)

	target := strings.TrimSpace(expected)

	if actual == target {

		return model.AC

	}

	return model.WA

}
