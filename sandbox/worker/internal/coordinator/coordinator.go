package coordinator

import (
	"context"
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
	OnState func(string)

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

			if c.OnState != nil {
				c.OnState("BUSY")
			}
			result := executor.Execute(*job)
			if c.OnState != nil {
				c.OnState("IDLE")
			}
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

			log.Printf("submission=%s testcase=%s status=%s", job.SubmissionID, job.TestcaseID, result.Status)

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

					ExecutionTime: result.ExecutionTime,
					MemoryUsed:    result.MemoryUsed, CPUTime: result.CPUTime, CompileTime: result.CompileTime,
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
