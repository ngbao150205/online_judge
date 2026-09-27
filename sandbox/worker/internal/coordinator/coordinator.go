package coordinator

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"time"

	"kltn-worker/internal/matcher"
	"kltn-worker/internal/model"
	"kltn-worker/internal/result"
	"kltn-worker/internal/router"
)

type Queue interface {
	Receive(
		ctx context.Context,
	) (
		*model.Job,
		*string,
		error,
	)

	Delete(
		ctx context.Context,
		receipt *string,
	) error
}

type Coordinator struct {
	Queue Queue

	Router router.LanguageRouter

	Matcher matcher.Matcher

	ResultPublisher result.Publisher
}

func (c Coordinator) Start(ctx context.Context) {

	log.Println("judge coordinator started")

	for {

		select {

		case <-ctx.Done():

			log.Println("coordinator stopped")
			return

		default:

			job, receipt, err :=
				c.Queue.Receive(ctx)

			if err != nil {

				log.Println(err)

				time.Sleep(
					2 * time.Second,
				)

				continue
			}

			if job == nil {

				time.Sleep(time.Second)

				continue
			}

			// =============================================
			// DEBUG PAYLOAD
			// =============================================

			jobJSON, errJSON :=
				json.MarshalIndent(
					job,
					"",
					"  ",
				)

			if errJSON == nil {

				log.Printf(
					"\n================ PAYLOAD ================\n%s\n==========================================\n",
					string(jobJSON),
				)

			}

			// =============================================
			// ROUTER
			// =============================================

			executor, err :=
				c.Router.GetExecutor(
					*job,
				)

			if err != nil {

				if errors.Is(
					err,
					router.ErrUnsupportedLanguage,
				) {

					resultMessage :=
						model.ResultMessage{

							SubmissionID: job.SubmissionID,

							TestcaseID: job.TestcaseID,

							Status: model.CE,

							Error: err.Error(),
						}

					if publishErr :=
						c.ResultPublisher.Publish(
							ctx,
							resultMessage,
						); publishErr != nil {

						log.Printf(
							"publish unsupported language failed submission=%s error=%v",
							job.SubmissionID,
							publishErr,
						)

						continue
					}

					_ = c.Queue.Delete(
						ctx,
						receipt,
					)

					continue

				}

				log.Printf(
					"router system error submission=%s error=%v",
					job.SubmissionID,
					err,
				)

				continue
			}

			// =============================================
			// EXECUTE SANDBOX
			// =============================================

			startTime :=
				time.Now()

			result :=
				executor.Execute(
					*job,
				)

			execDuration :=
				time.Since(
					startTime,
				).Milliseconds()

			// =============================================
			// SYSTEM ERROR
			// Không publish.
			// Giữ message cho SQS retry.
			// =============================================

			if result.Status ==
				model.SYSTEM_ERROR {

				log.Printf(
					"executor system error submission=%s error=%s",
					job.SubmissionID,
					result.Error,
				)

				continue
			}

			// =============================================
			// CHECKER RESPONSIBILITY
			//
			// Python + C++:
			// Executor tự:
			// - compile
			// - run
			// - checker
			//
			// Coordinator không chấm lại.
			// =============================================

			isSandboxLanguage :=
				strings.EqualFold(
					strings.TrimSpace(job.Language),
					"python",
				) ||
					strings.EqualFold(
						strings.TrimSpace(job.Language),
						"cpp",
					)

			if isSandboxLanguage {

				submissionType :=
					strings.ToUpper(
						strings.TrimSpace(
							job.SubmissionType,
						),
					)

				if result.Status ==
					model.RUN_SUCCESS &&
					submissionType != "PLAYGROUND" {

					log.Printf(
						"invalid RUN_SUCCESS submission=%s testcase=%s",
						job.SubmissionID,
						job.TestcaseID,
					)

					continue
				}

			} else {

				// Language cũ chưa có checker riêng
				if result.Status ==
					model.RUN_SUCCESS &&
					strings.TrimSpace(
						job.ExpectedOutput,
					) != "" {

					result.Status =
						c.Matcher.Compare(
							result.Output,
							job.ExpectedOutput,
						)

				}

			}

			// =============================================
			// LOG RESULT
			// =============================================

			log.Printf(
				"submission=%s testcase=%s language=%s type=%s checker=%s status=%s timeLimit=%dms memory=%dMB duration=%dms output=%q error=%q",
				job.SubmissionID,
				job.TestcaseID,
				job.Language,
				job.SubmissionType,
				job.CheckerType,
				result.Status,
				job.TimeLimit,
				job.MemoryLimit,
				execDuration,
				result.Output,
				result.Error,
			)

			// =============================================
			// PUBLISH RESULT
			// =============================================

			resultMessage :=
				model.ResultMessage{

					SubmissionID: job.SubmissionID,

					TestcaseID: job.TestcaseID,

					Status: result.Status,

					Output: result.Output,

					Error: result.Error,

					ExecutionTime: execDuration,
				}

			if err :=
				c.ResultPublisher.Publish(
					ctx,
					resultMessage,
				); err != nil {

				log.Println(
					"publish result failed:",
					err,
				)

				continue
			}

			// =============================================
			// DELETE MESSAGE
			// =============================================

			if err :=
				c.Queue.Delete(
					ctx,
					receipt,
				); err != nil {

				log.Println(
					"delete failed:",
					err,
				)

			}

		}

	}

}
