package result

import (
	"context"
	"encoding/json"

	"kltn-worker/internal/model"

	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

type Publisher struct {
	Client *sqs.Client

	QueueURL string
}

func (p Publisher) Publish(
	ctx context.Context,
	result model.ResultMessage,
) error {

	data, err := json.Marshal(result)

	if err != nil {
		return err
	}

	body := string(data)

	_, err = p.Client.SendMessage(
		ctx,
		&sqs.SendMessageInput{

			QueueUrl: &p.QueueURL,

			MessageBody: &body,
		},
	)

	return err
}
