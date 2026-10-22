// Collect evidence using the production executors and DockerRuntime.
// No database writes or SQS jobs are needed for these local checks.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"kltn-worker/internal/executor"
	"kltn-worker/internal/model"
)

type Case struct {
	Name           string    `json:"name"`
	ExpectedStatus string    `json:"expectedStatus"`
	Job            model.Job `json:"job"`
}

func command(args ...string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	output, err := exec.CommandContext(ctx, "docker", args...).CombinedOutput()
	if err != nil {
		return fmt.Sprintf("ERROR: %v: %s", err, output)
	}
	return string(output)
}

func probe(image string) (map[string]any, error) {
	workDir, err := os.MkdirTemp("", "sandbox-evidence-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(workDir)
	source := filepath.Join(workDir, "main.py")
	if err := os.WriteFile(source, []byte("data = bytearray(512 * 1024 * 1024)\nprint(len(data))\n"), 0644); err != nil {
		return nil, err
	}
	runtime := executor.DockerRuntime{Image: image}
	name := filepath.Base(workDir)
	if _, err := runtime.CreateContainer(name, 256); err != nil {
		return nil, err
	}
	defer runtime.RemoveContainer(name)
	if err := runtime.StartContainer(name); err != nil {
		return nil, err
	}
	if err := runtime.CopySource(name, source); err != nil {
		return nil, err
	}

	result := map[string]any{"image": image, "containerName": name}
	result["dockerConfig"] = command("inspect", "--format", `{"memory":{{.HostConfig.Memory}},"memorySwap":{{.HostConfig.MemorySwap}},"nanoCPUs":{{.HostConfig.NanoCpus}},"pidsLimit":{{.HostConfig.PidsLimit}},"networkMode":{{json .HostConfig.NetworkMode}},"readOnlyRootfs":{{.HostConfig.ReadonlyRootfs}},"capDrop":{{json .HostConfig.CapDrop}},"securityOpt":{{json .HostConfig.SecurityOpt}},"user":{{json .Config.User}}}`, name)
	result["kernelLimitsAndSecurity"] = command("exec", name, "bash", "-c", `for key in memory.max memory.swap.max cpu.max pids.max; do echo "$key=$(cat /sys/fs/cgroup/$key)"; done; grep -E '^(NoNewPrivs|Seccomp|Seccomp_filters|CapEff):' /proc/self/status; id; echo '--- memory.events ---'; cat /sys/fs/cgroup/memory.events`)
	if image == "python-sandbox" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		start := time.Now()
		output, runErr := runtime.ExecContext(ctx, name, "python3 -u /workspace/main.py", "")
		cancel()
		result["oomProbeOutput"] = string(output)
		result["oomProbeElapsedMs"] = time.Since(start).Milliseconds()
		if runErr != nil {
			result["oomProbeError"] = runErr.Error()
		}
		result["memoryEventsAfterAllocation"] = command("exec", name, "cat", "/sys/fs/cgroup/memory.events")
		result["containerStateAfterAllocation"] = command("inspect", "--format", `{"running":{{.State.Running}},"oomKilled":{{.State.OOMKilled}},"exitCode":{{.State.ExitCode}}}`, name)
	}
	return result, nil
}

func main() {
	casesPath := "../evidence/cases.json"
	outputPath := "../evidence/output/sandbox-evidence.json"
	if len(os.Args) > 1 {
		casesPath = os.Args[1]
	}
	if len(os.Args) > 2 {
		outputPath = os.Args[2]
	}
	data, err := os.ReadFile(casesPath)
	if err != nil {
		panic(err)
	}
	var cases []Case
	if err := json.Unmarshal(data, &cases); err != nil {
		panic(err)
	}
	evidence := map[string]any{
		"recordedAt": time.Now().UTC().Format(time.RFC3339),
		"scope":      "Direct production DockerRuntime and PythonExecutor/CppExecutor; does not test API/SQS/Redis",
		"dockerInfo": command("info", "--format", `{"serverVersion":{{json .ServerVersion}},"cgroupVersion":{{json .CgroupVersion}},"cgroupDriver":{{json .CgroupDriver}},"securityOptions":{{json .SecurityOptions}}}`),
	}
	var probes []map[string]any
	for _, image := range []string{"python-sandbox", "cpp-sandbox"} {
		p, err := probe(image)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		probes = append(probes, p)
	}
	evidence["configurationProbes"] = probes
	var results []map[string]any
	allMatched := true
	for _, c := range cases {
		start := time.Now()
		var result executor.Result
		switch c.Job.Language {
		case "python":
			result = (executor.PythonExecutor{Image: "python-sandbox"}).Execute(c.Job)
		case "cpp":
			result = (executor.CppExecutor{Image: "cpp-sandbox"}).Execute(c.Job)
		default:
			panic("unsupported evidence language")
		}
		matched := string(result.Status) == c.ExpectedStatus
		allMatched = allMatched && matched
		results = append(results, map[string]any{"name": c.Name, "job": c.Job, "expectedStatus": c.ExpectedStatus, "actualStatus": result.Status, "output": result.Output, "error": result.Error, "elapsedMsIncludingContainerCleanup": time.Since(start).Milliseconds(), "matched": matched})
		fmt.Printf("%s: expected=%s actual=%s matched=%t\n", c.Name, c.ExpectedStatus, result.Status, matched)
	}
	evidence["executionCases"] = results
	evidence["allStatusesMatched"] = allMatched
	output, err := json.MarshalIndent(evidence, "", "  ")
	if err != nil {
		panic(err)
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		panic(err)
	}
	if err := os.WriteFile(outputPath, append(output, '\n'), 0644); err != nil {
		panic(err)
	}
	fmt.Println(string(output))
	fmt.Println("Evidence saved:", outputPath)
	if !allMatched {
		os.Exit(1)
	}
}
