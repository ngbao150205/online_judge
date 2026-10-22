package executor

import (
	"context"
	"os/exec"
	"strings"
	"testing"
	"time"
)

func TestResourceMetrics(t *testing.T) {
	metrics, err := parseResourceMetrics("memory_peak 10485760\nusage_usec 23000\noom_kill 1\n")
	if err != nil || metrics.MemoryPeakBytes != 10485760 || metrics.CPUUsageUsec != 23000 || metrics.OOMKills != 1 {
		t.Fatalf("metrics=%+v err=%v", metrics, err)
	}
	if _, err := parseResourceMetrics("usage_usec 0\n"); err == nil {
		t.Fatal("missing memory must not become a fabricated zero")
	}
}
func TestBoundedOutputDrainsLargeStreams(t *testing.T) {
	buffer := &boundedBuffer{}
	payload := strings.Repeat("x", 1000000)
	n, err := buffer.Write([]byte(payload))
	if err != nil || n != len(payload) || buffer.Len() != 65536 || !buffer.exceeded {
		t.Fatal("output must be bounded while pipe remains drainable")
	}
}
func TestConcurrentCommandOutput(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "sh", "-c", "i=0; while [ $i -lt 10000 ]; do echo stdout; echo stderr >&2; i=$((i+1)); done")
	out, diagnostics := &boundedBuffer{}, &boundedBuffer{}
	cmd.Stdout, cmd.Stderr = out, diagnostics
	if err := cmd.Run(); err != nil {
		t.Fatal(err)
	}
	if out.Len() == 0 || diagnostics.Len() == 0 {
		t.Fatal("both streams must be captured concurrently")
	}
}
