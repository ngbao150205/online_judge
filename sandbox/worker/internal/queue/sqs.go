package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"kltn-worker/internal/model"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
)

type SQSQueue struct {
	Client   *sqs.Client
	QueueURL string
}

func (q SQSQueue) Receive(ctx context.Context) (*model.Job, *string, error) {

	result, err := q.Client.ReceiveMessage(
		ctx,
		&sqs.ReceiveMessageInput{
			QueueUrl:            aws.String(q.QueueURL),
			MaxNumberOfMessages: 1,
			WaitTimeSeconds:     20,
			VisibilityTimeout:   30,
			MessageSystemAttributeNames: []types.MessageSystemAttributeName{
				types.MessageSystemAttributeNameApproximateReceiveCount,
			},
		},
	)

	if err != nil {
		return nil, nil, err
	}

	if len(result.Messages) == 0 {
		return nil, nil, nil
	}

	message := result.Messages[0]

	attempt :=
		message.Attributes["ApproximateReceiveCount"]

	fmt.Println(
		"receive attempt:",
		attempt,
	)

	var job model.Job

	err = json.Unmarshal(
		[]byte(aws.ToString(message.Body)),
		&job,
	)

	if err != nil {
		return nil, nil,
			fmt.Errorf("decode job: %w", err)
	}

	return &job,
		message.ReceiptHandle,
		nil
}

func (q SQSQueue) Delete(
	ctx context.Context,
	receipt *string,
) error {

	_, err := q.Client.DeleteMessage(
		ctx,
		&sqs.DeleteMessageInput{
			QueueUrl:      aws.String(q.QueueURL),
			ReceiptHandle: receipt,
		},
	)

	return err
}
