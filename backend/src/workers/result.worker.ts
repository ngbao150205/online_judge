import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { sqsClient } from "../../sqs";
import prisma from "../config/db";
import { redisClient } from "../config/redis";
import { SubmissionStatus, TestcaseStatus } from "@prisma/client";

const RESULT_QUEUE_URL = process.env.RESULT_QUEUE_URL;

interface TestcaseResultPayload {
  testcaseId: string;
  status: string;
  executionTime: number;
  memoryUsed: number;
  errorLog?: string;
}

interface SandboxResultPayload {
  submissionId: string;
  testcaseId?: string;
  status: string;
  output?: string;
  error?: string;
  executionTime?: number;
  totalTime?: number;
  maxMemory?: number;
  compileLog?: string;
  testcaseResults?: TestcaseResultPayload[];
}

interface ProblemRunTestcaseResult {
  testcaseId: string;
  status: string;
  output: string;
  error: string;
  executionTime: number;
}

interface ProblemRunRedisResult {
  submissionId: string;
  status: string;
  total: number;
  completed: number;
  passed: number;
  failed: number;
  results: ProblemRunTestcaseResult[];
}

function mapToSubmissionStatus(rawStatus: string): SubmissionStatus {
  switch (rawStatus) {
    case "AC":
    case "ACCEPTED":
      return SubmissionStatus.ACCEPTED;

    case "WA":
    case "WRONG_ANSWER":
      return SubmissionStatus.WRONG_ANSWER;

    case "TLE":
    case "TIME_LIMIT_EXCEEDED":
      return SubmissionStatus.TIME_LIMIT_EXCEEDED;

    case "MLE":
    case "MEMORY_LIMIT_EXCEEDED":
      return SubmissionStatus.MEMORY_LIMIT_EXCEEDED;

    case "RTE":
    case "RE":
    case "RUNTIME_ERROR":
      return SubmissionStatus.RUNTIME_ERROR;

    case "CE":
    case "COMPILE_ERROR":
      return SubmissionStatus.COMPILE_ERROR;

    case "SYSTEM_ERROR":
    default:
      return SubmissionStatus.SYSTEM_ERROR;
  }
}

function mapToTestcaseStatus(rawStatus: string): TestcaseStatus {
  switch (rawStatus) {
    case 'AC':
    case 'ACCEPTED':
      return TestcaseStatus.AC;

    case 'WA':
    case 'WRONG_ANSWER':
      return TestcaseStatus.WA;

    case 'TLE':
    case 'TIME_LIMIT_EXCEEDED':
      return TestcaseStatus.TLE;

    case 'MLE':
    case 'MEMORY_LIMIT_EXCEEDED':
      return TestcaseStatus.MLE;

    case 'RE':
    case 'RTE':
    case 'RUNTIME_ERROR':
      return TestcaseStatus.RE;

    case 'CE':
    case 'COMPILE_ERROR':
      return TestcaseStatus.CE;

    default:
      // Bao gồm SYSTEM_ERROR hoặc trạng thái không hợp lệ
      // đối với chấm chính thức, chẳng hạn RUN_SUCCESS.
      return TestcaseStatus.SYSTEM_ERROR;
  }
}

function aggregateOfficialStatus(
  statuses: TestcaseStatus[],
): SubmissionStatus {
  // Thứ tự ưu tiên cố định, không phụ thuộc thứ tự message đến.
  if (statuses.includes(TestcaseStatus.SYSTEM_ERROR)) {
    return SubmissionStatus.SYSTEM_ERROR;
  }

  if (statuses.includes(TestcaseStatus.CE)) {
    return SubmissionStatus.COMPILE_ERROR;
  }

  if (statuses.includes(TestcaseStatus.RE)) {
    return SubmissionStatus.RUNTIME_ERROR;
  }

  if (statuses.includes(TestcaseStatus.MLE)) {
    return SubmissionStatus.MEMORY_LIMIT_EXCEEDED;
  }

  if (statuses.includes(TestcaseStatus.TLE)) {
    return SubmissionStatus.TIME_LIMIT_EXCEEDED;
  }

  if (statuses.includes(TestcaseStatus.WA)) {
    return SubmissionStatus.WRONG_ANSWER;
  }

  if (
    statuses.length > 0 &&
    statuses.every((status) => status === TestcaseStatus.AC)
  ) {
    return SubmissionStatus.ACCEPTED;
  }

  return SubmissionStatus.SYSTEM_ERROR;
}

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IS_RUN_ID = /^run-[0-9a-f-]+$/i;

export async function pollResults(): Promise<void> {
  if (!RESULT_QUEUE_URL) {
    console.error(
      "[Worker Error] Biến môi trường RESULT_QUEUE_URL chưa được thiết lập."
    );

    return;
  }

  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: RESULT_QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    });

    const { Messages } = await sqsClient.send(command);

    if (!Messages || Messages.length === 0) {
      return;
    }

    for (const message of Messages) {
      if (!message.Body) {
        continue;
      }

      try {
        const result: SandboxResultPayload = JSON.parse(message.Body);

        // ============================================================
        // 1. Lấy submissionId
        // ============================================================
        const submissionId = result.submissionId;

        const {
          status,
          output,
          error,
          executionTime,
          totalTime,
          maxMemory,
          compileLog,
          testcaseResults,
          testcaseId,
        } = result;

        if (!submissionId) {
          console.warn(
            "[Result Worker] Bỏ qua message vì thiếu submissionId"
          );

          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: RESULT_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );

          continue;
        }

        // ============================================================
        // 2. SANDBOX RUN
        //
        // Có 2 trường hợp:
        //
        // A. runCustomInput:
        //    không có testcaseId
        //
        // B. runProblem:
        //    có testcaseId
        //    nhiều testcase dùng chung một runId
        // ============================================================
        if (IS_RUN_ID.test(submissionId)) {
          const redisKey = `run_result:${submissionId}`;

          // ----------------------------------------------------------
          // 2A. Chạy thử tự do - custom input
          //
          // runCustomInput không có testcaseId nên giữ behavior cũ.
          // ----------------------------------------------------------
          if (!testcaseId) {
            const redisValue = {
              submissionId,
              status,
              output: output ?? "",
              error: error ?? "",
              executionTime: executionTime ?? 0,
            };

            await redisClient.set(
              redisKey,
              JSON.stringify(redisValue)
            );

            console.log(
              `[Result Worker] ✅ Đã lưu custom run vào Redis: ${redisKey}`
            );
          }

          // ----------------------------------------------------------
          // 2B. Chạy thử trong Problem
          //
          // Mỗi testcase có cùng submissionId/runId nhưng testcaseId
          // khác nhau.
          // ----------------------------------------------------------
          else {
            const existingData = await redisClient.get(redisKey);

            if (!existingData) {
              console.warn(
                `[Result Worker] ⚠️ Không tìm thấy trạng thái ban đầu của run: ${redisKey}`
              );

              // Không delete message để SQS có thể retry.
              continue;
            }

            const current: ProblemRunRedisResult =
              JSON.parse(existingData);

            // --------------------------------------------------------
            // Tránh testcase bị ghi nhận 2 lần nếu SQS redelivery
            // --------------------------------------------------------
            const alreadyExists = current.results.some(
              (item) => item.testcaseId === testcaseId
            );

            if (alreadyExists) {
              console.log(
                `[Result Worker] ⚠️ Testcase ${testcaseId} đã được xử lý, bỏ qua.`
              );

              await sqsClient.send(
                new DeleteMessageCommand({
                  QueueUrl: RESULT_QUEUE_URL,
                  ReceiptHandle: message.ReceiptHandle,
                })
              );

              continue;
            }

            // --------------------------------------------------------
            // Thêm kết quả testcase
            // --------------------------------------------------------
            current.results.push({
              testcaseId,
              status,
              output: output ?? "",
              error: error ?? "",
              executionTime: executionTime ?? 0,
            });

            // --------------------------------------------------------
            // Tính lại thống kê
            // --------------------------------------------------------
            current.completed = current.results.length;

            current.passed = current.results.filter(
              (item) =>
                item.status === "AC" ||
                item.status === "ACCEPTED"
            ).length;

            current.failed =
              current.completed - current.passed;

            // --------------------------------------------------------
            // Chưa chạy hết testcase
            // --------------------------------------------------------
            if (current.completed < current.total) {
              current.status = "RUNNING";
            }

            // --------------------------------------------------------
            // Đã chạy hết testcase
            // --------------------------------------------------------
            else {
              current.status =
                current.failed === 0
                  ? "ACCEPTED"
                  : "COMPLETED";
            }

            await redisClient.set(
              redisKey,
              JSON.stringify(current)
            );

            console.log(
              `[Result Worker] ✅ Problem run ${submissionId}: ` +
                `${current.completed}/${current.total} testcase, ` +
                `${current.passed} passed, ` +
                `${current.failed} failed`
            );
          }

          // ----------------------------------------------------------
          // Xóa message khỏi result queue
          // ----------------------------------------------------------
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: RESULT_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );

          continue;
        }

        // ============================================================
        // 3. SUBMISSION THƯỜNG
        //
        // submissionId phải là UUID của PostgreSQL
        // ============================================================
        if (!IS_UUID.test(submissionId)) {
          console.warn(
            `[Result Worker] Xóa message vì submissionId không hợp lệ: ${submissionId}`
          );

          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: RESULT_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );

          continue;
        }

        // ============================================================
        // 4. Cập nhật submission PostgreSQL
        // ============================================================
        if (!testcaseId || !IS_UUID.test(testcaseId)) {
  throw new Error(
    `Official result missing valid testcaseId: ${submissionId}`,
  );
}

const officialTestcaseId = testcaseId;

await prisma.$transaction(async (tx) => {
  // Hai consumer nhận kết quả cùng submission
  // sẽ cập nhật lần lượt, tránh ghi đè kết quả tổng hợp.
  await tx.$queryRaw`
    SELECT id
    FROM submissions
    WHERE id = ${submissionId}::uuid
    FOR UPDATE
  `;

  const submission = await tx.submission.findUnique({
  where: { id: submissionId },
  select: {
    id: true,
    userId: true,
    problemId: true,
    status: true,
    totalTestcases: true,
  },
});

  if (!submission) {
  console.warn(
    `[Result Worker] Bỏ qua result vì submission không tồn tại: ${submissionId}`
  );

  return;
}

  // Đã kết thúc: bỏ qua kết quả trùng hoặc đến muộn.
  if (
    submission.status !== SubmissionStatus.PENDING &&
    submission.status !== SubmissionStatus.IN_PROGRESS
  ) {
    return;
  }

  // Submission cũ chưa tạo danh sách testcase chờ
  // không được kết luận theo cơ chế mới.
  if (submission.totalTestcases <= 0) {
    throw new Error(
      `Submission has no initialized testcases: ${submissionId}`,
    );
  }

  const testcaseResult = await tx.submissionResult.findFirst({
    where: {
      submissionId,
      testcaseId: officialTestcaseId,
    },
  });

  if (!testcaseResult) {
    throw new Error(
      `Unexpected testcase ${officialTestcaseId} for ${submissionId}`,
    );
  }

  // Đã có kết quả: không cộng thêm và không ghi đè.
  if (testcaseResult.status !== TestcaseStatus.PENDING) {
    return;
  }

  const nextStatus = mapToTestcaseStatus(status);

  // Schema dùng Int; giới hạn giá trị trước khi ghi.
  const elapsedMs =
    typeof executionTime === 'number' &&
    Number.isFinite(executionTime) &&
    executionTime >= 0 &&
    executionTime <= 2147483647
      ? Math.floor(executionTime)
      : 0;

  await tx.submissionResult.update({
  where: { id: testcaseResult.id },
  data: {
    status: nextStatus,
    executionTime: elapsedMs,

    output:
      output !== undefined &&
      output !== null
        ? output
        : null,

    errorLog:
      error ||
      compileLog ||
      (nextStatus === TestcaseStatus.SYSTEM_ERROR
        ? `Unexpected worker status: ${status}`
        : null),
  },
});

const check =
  await tx.submissionResult.findUnique({
    where: {
      id: testcaseResult.id,
    },
  });

console.log("AFTER UPDATE:", {
  status: check?.status,
  output: check?.output,
  errorLog: check?.errorLog,
});

  const rows = await tx.submissionResult.findMany({
    where: { submissionId },
    select: {
      status: true,
      executionTime: true,
      errorLog: true,
    },
  });

  if (rows.length !== submission.totalTestcases) {
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.SYSTEM_ERROR,
        compileLog: 'Danh sách testcase của lần nộp không còn đầy đủ.',
      },
    });
    return;
  }

  const finishedRows = rows.filter(
    (row) => row.status !== TestcaseStatus.PENDING,
  );

  const durationSum = finishedRows.reduce(
    (sum, row) => sum + row.executionTime,
    0,
  );

  // Không lưu tổng bị tràn kiểu Int.
  const recordedTotalTime =
    durationSum <= 2147483647 ? durationSum : null;

  if (finishedRows.length < submission.totalTestcases) {
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.IN_PROGRESS,
        totalTime: recordedTotalTime,
      },
    });
    return;
  }

  const finalStatus = aggregateOfficialStatus(
    rows.map((row) => row.status),
  );

  const diagnostics = rows
    .filter(
      (row) =>
        row.status === TestcaseStatus.CE ||
        row.status === TestcaseStatus.SYSTEM_ERROR,
    )
    .map((row) => row.errorLog)
    .filter((message): message is string => Boolean(message))
    .join('\n');

  await tx.submission.update({
  where: { id: submissionId },
  data: {
    status: finalStatus,
    totalTime: recordedTotalTime,
    compileLog: diagnostics || null,
  },
});


// ===============================
// UPDATE ROADMAP PROGRESS
// ===============================

if (finalStatus === SubmissionStatus.ACCEPTED) {

  const roadmapProblems =
    await tx.roadmapProblem.findMany({
      where: {
        problemId: submission.problemId,
      },
    });


  for (const rp of roadmapProblems) {

    await tx.roadmapProgress.upsert({

      where: {
        userId_roadmapId_problemId: {
          userId: submission.userId,
          roadmapId: rp.roadmapId,
          problemId: submission.problemId,
        },
      },


      update: {
        isSolved: true,
        solvedAt: new Date(),
        lastSubmissionId: submission.id,
        attemptCount: {
          increment: 1,
        },
      },


      create: {
        userId: submission.userId,
        roadmapId: rp.roadmapId,
        problemId: submission.problemId,

        isSolved: true,
        solvedAt: new Date(),

        lastSubmissionId: submission.id,

        attemptCount: 1,
      },

    });

  }

}
});

        console.log(
          `[Result Worker] ✅ Cập nhật thành công Submission ID: ${submissionId}`
        );

        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: RESULT_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          })
        );
      } catch (messageError) {
        console.error(
          "[Result Worker] ❌ Lỗi xử lý message:",
          messageError
        );
      }
    }
  } catch (err) {
    console.error(
      "[Result Worker] ❌ Lỗi khi xử lý hàng đợi kết quả:",
      err
    );
  } finally {
    setTimeout(pollResults, 1000);
  }
}