import { SQSClient } from "@aws-sdk/client-sqs";
import { env } from './env.js';

export const sqsClient = new SQSClient({
  region: env.AWS_REGION,
  ...(env.SQS_ENDPOINT_URL ? { endpoint: env.SQS_ENDPOINT_URL } : {}),
  ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? { credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    ...(env.AWS_SESSION_TOKEN ? { sessionToken: env.AWS_SESSION_TOKEN } : {}),
  } } : {}),
});
