package matcher

import (
	"testing"

	"kltn-worker/internal/model"
)

func TestMatcherAC(t *testing.T) {

	m :=
		Matcher{}

	result :=
		m.Compare(
			"Hello Sandbox\n",
			"Hello Sandbox",
		)

	if result != model.AC {

		t.Fail()

	}

}

func TestMatcherWA(t *testing.T) {

	m :=
		Matcher{}

	result :=
		m.Compare(
			"Hello",
			"World",
		)

	if result != model.WA {

		t.Fail()

	}

}
