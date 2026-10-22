package result

import (
	"context"
	"encoding/json"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

type Heartbeat struct {
	Publisher Publisher
	WorkerID  string
	Busy      atomic.Bool
}

func (h *Heartbeat) SetState(state string) { h.Busy.Store(state == "BUSY") }
func readCounter(file, key string) *int64 {
	data, err := os.ReadFile(file)
	if err != nil {
		return nil
	}
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		text := ""
		if key == "" && len(fields) == 1 {
			text = fields[0]
		}
		if key != "" && len(fields) == 2 && fields[0] == key {
			text = fields[1]
		}
		if text != "" {
			value, err := strconv.ParseInt(text, 10, 64)
			if err == nil {
				return &value
			}
		}
	}
	return nil
}
func (h *Heartbeat) Run(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	var previousCPU *int64
	previousAt := time.Now()
	for {
		state := "IDLE"
		if h.Busy.Load() {
			state = "BUSY"
		}
		now := time.Now()
		currentCPU := readCounter("/sys/fs/cgroup/cpu.stat", "usage_usec")
		var cpuUsage *float64
		if previousCPU != nil && currentCPU != nil {
			usage := float64(*currentCPU-*previousCPU) / float64(now.Sub(previousAt).Microseconds()) * 100
			if usage >= 0 {
				cpuUsage = &usage
			}
		}
		previousCPU, previousAt = currentCPU, now
		payload := map[string]any{"type": "WORKER_HEARTBEAT", "workerId": h.WorkerID, "state": state,
			"observedAt": now.UTC().Format(time.RFC3339Nano), "cpuUsage": cpuUsage,
			"memoryBytes": readCounter("/sys/fs/cgroup/memory.current", ""), "memoryLimitBytes": readCounter("/sys/fs/cgroup/memory.max", "")}
		body, _ := json.Marshal(payload)
		text := string(body)
		requestCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		_, _ = h.Publisher.Client.SendMessage(requestCtx, &sqs.SendMessageInput{QueueUrl: &h.Publisher.QueueURL, MessageBody: &text})
		cancel()
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
