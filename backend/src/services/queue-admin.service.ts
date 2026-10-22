import { CreateQueueCommand, GetQueueAttributesCommand, SetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { sqsClient } from '../config/sqs.js';
import { env } from '../config/env.js';

export async function ensureJudgeQueues() {
  for (const url of [env.SQS_QUEUE_URL, env.RESULT_QUEUE_URL]) {
    if (!url) throw new Error('SQS queue URLs chưa được cấu hình');
    if (env.SQS_AUTO_CREATE) {
      const name = new URL(url).pathname.split('/').filter(Boolean).at(-1)!;
      if (!/^[a-zA-Z0-9_-]{1,75}$/.test(name)) throw new Error('Chỉ hỗ trợ SQS standard queue names');
      const deadLetter = await sqsClient.send(new CreateQueueCommand({ QueueName: `${name}-dlq`, Attributes: { MessageRetentionPeriod: '1209600' } }));
      const dlq = await sqsClient.send(new GetQueueAttributesCommand({ QueueUrl: deadLetter.QueueUrl!, AttributeNames: ['QueueArn'] }));
      await sqsClient.send(new CreateQueueCommand({ QueueName: name }));
      await sqsClient.send(new SetQueueAttributesCommand({ QueueUrl: url, Attributes: {
        VisibilityTimeout: '120', MessageRetentionPeriod: '345600',
        RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlq.Attributes!.QueueArn, maxReceiveCount: 3 }),
      } }));
    }
    await sqsClient.send(new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['QueueArn'] }), { abortSignal: AbortSignal.timeout(4000) });
  }
}

export async function getQueueDepths() {
  return Promise.all([env.SQS_QUEUE_URL, env.RESULT_QUEUE_URL].filter((url): url is string => Boolean(url)).map(async url => {
    try {
      const response = await sqsClient.send(new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'RedrivePolicy'] }), { abortSignal: AbortSignal.timeout(3000) });
      const redrive = response.Attributes?.RedrivePolicy ? JSON.parse(response.Attributes.RedrivePolicy) as { deadLetterTargetArn?: string } : null;
      let deadLetters: number | null = null;
      if (redrive?.deadLetterTargetArn) {
        const name = redrive.deadLetterTargetArn.split(':').at(-1)!;
        const dlqUrl = url.slice(0, url.lastIndexOf('/') + 1) + name;
        const dlq = await sqsClient.send(new GetQueueAttributesCommand({ QueueUrl: dlqUrl, AttributeNames: ['ApproximateNumberOfMessages'] }), { abortSignal: AbortSignal.timeout(3000) });
        deadLetters = Number(dlq.Attributes?.ApproximateNumberOfMessages || 0);
      }
      return { name: new URL(url).pathname.split('/').at(-1)!, pending: Number(response.Attributes?.ApproximateNumberOfMessages || 0), processing: Number(response.Attributes?.ApproximateNumberOfMessagesNotVisible || 0), deadLetters, available: true };
    } catch { return { name: new URL(url).pathname.split('/').at(-1)!, pending: null, processing: null, deadLetters: null, available: false }; }
  }));
}
