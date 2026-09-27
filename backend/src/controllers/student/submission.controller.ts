import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/db';
import { redisClient } from '../../config/redis'; // 👈 Client Redis để đọc kết quả chạy thử
import { SubmissionStatus, TestcaseStatus } from '@prisma/client';
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from '../../../sqs'; 
import { randomUUID } from 'crypto';

const queueUrl = process.env.SQS_QUEUE_URL;

// ============================================================================
// 🟢 1. NỘP BÀI CHÍNH THỨC (Lưu PostgreSQL + Gửi SQS)
// ============================================================================
export const submitCode = async (req: AuthRequest, res: Response) => {
  let createdSubmissionId: string | null = null;

  try {
    const userId = req.user?.userId;
    const { problemId, language, sourceCode } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng',
      });
    }

    if (
      typeof problemId !== 'string' ||
      typeof language !== 'string' ||
      typeof sourceCode !== 'string' ||
      !problemId.trim() ||
      !language.trim() ||
      !sourceCode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu hoặc sai thông tin nộp bài',
      });
    }

    if (!queueUrl) {
      return res.status(503).json({
        success: false,
        message: 'Hệ thống hàng đợi chưa được cấu hình',
      });
    }

    // Lấy cả testcase public và hidden.
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testcases: {
          orderBy: [
            { orderIndex: 'asc' },
            { id: 'asc' },
          ],
          select: {
            id: true,
            inputData: true,
            expectedOutput: true,
          },
        },
      },
    });

    if (!problem || !problem.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Bài tập không tồn tại hoặc đã đóng',
      });
    }

    if (problem.testcases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bài tập chưa có testcase để chấm',
      });
    }

    // Tạo submission và toàn bộ các hàng kết quả chờ
    // trong cùng một thao tác nested write.
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId: problem.id,
        language,
        sourceCode,
        status: SubmissionStatus.PENDING,
        totalTestcases: problem.testcases.length,

        results: {
          create: problem.testcases.map((testcase) => ({
            testcaseId: testcase.id,
            status: TestcaseStatus.PENDING,
          })),
        },
      },
    });

    createdSubmissionId = submission.id;

    // Mỗi testcase là một job; dùng chung submissionId.
    for (const testcase of problem.testcases) {
      const jobPayload = {
        submissionId: submission.id,
        problemId: problem.id,
        testcaseId: testcase.id,

        submissionType: 'PROBLEM_SUBMIT',
        checkerType: problem.checkerType,

        language,
        code: sourceCode,
        input: testcase.inputData,
        expectedOutput: testcase.expectedOutput,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        isCustomInput: false,
      };

      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(jobPayload),
        }),
      );
    }

    // Không ghi đè nếu result worker đã xử lý xong.
    await prisma.submission.updateMany({
      where: {
        id: submission.id,
        status: SubmissionStatus.PENDING,
      },
      data: {
        status: SubmissionStatus.IN_PROGRESS,
      },
    });

    const latestSubmission = await prisma.submission.findUnique({
      where: { id: submission.id },
    });

    return res.status(201).json({
      success: true,
      message: 'Đã gửi bài để chấm toàn bộ testcase',
      submissionId: submission.id,
      total: problem.testcases.length,
      data: latestSubmission,
    });
  } catch (error) {
    console.error('submitCode error:', error);

    if (createdSubmissionId) {
      const submissionId = createdSubmissionId;

      try {
        await prisma.$transaction(async (tx) => {
          // Đồng bộ với khóa dùng trong result worker.
          await tx.$queryRaw`
            SELECT id
            FROM submissions
            WHERE id = ${submissionId}::uuid
            FOR UPDATE
          `;

          const updated = await tx.submission.updateMany({
            where: {
              id: submissionId,
              status: {
                in: [
                  SubmissionStatus.PENDING,
                  SubmissionStatus.IN_PROGRESS,
                ],
              },
            },
            data: {
              status: SubmissionStatus.SYSTEM_ERROR,
              compileLog:
                'Không thể hoàn tất gửi testcase hoặc xử lý yêu cầu nộp bài.',
            },
          });

          if (updated.count > 0) {
            await tx.submissionResult.updateMany({
              where: {
                submissionId,
                status: TestcaseStatus.PENDING,
              },
              data: {
                status: TestcaseStatus.SYSTEM_ERROR,
                errorLog:
                  'Lần nộp bị dừng do lỗi hệ thống khi gửi bài.',
              },
            });
          }
        });
      } catch (dbError) {
        console.error('Không thể ghi trạng thái lỗi:', dbError);
      }
    }

    return res.status(500).json({
      success: false,
      submissionId: createdSubmissionId,
      message: 'Không thể hoàn tất nộp bài, vui lòng thử lại',
    });
  }
};

// ============================================================================
// 🟢 2. LẤY LỊCH SỬ NỘP BÀI CỦA TÔI
// ============================================================================
export const getMySubmissions = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng',
      });
    }

    const pageValue = Number(req.query.page ?? 1);
    const page =
      Number.isSafeInteger(pageValue) && pageValue > 0
        ? Math.min(pageValue, 1000000)
        : 1;

    const pageSize = 10;
    const where = { userId };

    const [total, submissions] = await prisma.$transaction([
      prisma.submission.count({ where }),

      prisma.submission.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          language: true,
          status: true,
          totalTestcases: true,
          totalTime: true,
          createdAt: true,
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          results: {
            select: { status: true },
          },
        },
      }),
    ]);

    const data = submissions.map(({ results, ...submission }) => {
      const completed = results.filter(
        (item) => item.status !== TestcaseStatus.PENDING,
      ).length;

      const passed = results.filter(
        (item) => item.status === TestcaseStatus.AC,
      ).length;

      return {
        ...submission,
        completed,
        passed,
        failed: completed - passed,
      };
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
  console.error('getMySubmissions error:', error);

  return res.status(500).json({
    success: false,
    message: 'Không thể lấy lịch sử nộp bài',
  });
}
};

// ============================================================================
// 🟢 3. CHẠY THỬ NGHIỆM (CUSTOM INPUT / PLAYGROUND - Không ghi Postgres DB)
// ============================================================================
export const runCustomInput = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { problemId, language, sourceCode, customInput } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
    }

    if (
      typeof sourceCode !== 'string' ||
      !sourceCode.trim() ||
      typeof language !== 'string' ||
      !language.trim() ||
      (customInput != null && typeof customInput !== 'string')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Mã nguồn, ngôn ngữ và input phải đúng định dạng',
      });
    }

    if (!queueUrl) {
      return res.status(503).json({
        success: false,
        message: 'Hệ thống hàng đợi chưa được cấu hình',
      });
    }

    // Dynamic resource limit
    let timeLimit = 2000;  // Mặc định Playground: 2000ms
    let memoryLimit = 256; // Mặc định Playground: 256MB

    // 3.1 Nếu chạy trong ngữ cảnh Bài tập -> Lấy giới hạn thực tế từ Bài tập đó
    if (problemId) {
      const problem = await prisma.problem.findUnique({
        where: {
          id: problemId,
        },
        select: {
          isActive: true,
          timeLimit: true,
          memoryLimit: true,
        },
      });

      if (!problem || !problem.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Bài tập không tồn tại hoặc đã đóng',
        });
      }

      timeLimit = problem.timeLimit;
      memoryLimit = problem.memoryLimit;
    }

    // 3.2 Sinh runId định danh tạm thời (Không lưu bản ghi vào Postgres)
    const runId = `run-${randomUUID()}`;

    // 3.3 Đóng gói Payload gửi sang SQS Sandbox
    const jobPayload = {
      submissionId: runId,
      problemId: problemId || null,
      testcaseId: "",

      submissionType: "PLAYGROUND",
      checkerType: "",

      language,
      code: sourceCode,
      timeLimit,
      memoryLimit,

      input: customInput ?? "",
      expectedOutput: "",
      isCustomInput: true,
    };

    console.log("\n================ [API -> SQS CUSTOM RUN PAYLOAD] ================");
    console.log(JSON.stringify(jobPayload, null, 2));
    console.log("===============================================================\n");

    // 3.4 Đẩy Job vào AWS SQS
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(jobPayload),
    });
    await sqsClient.send(command);

    return res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu chạy thử, đang xử lý',
      runId,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý chạy thử:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi chạy thử nghiệm', error });
  }
};

export const runProblem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { problemId, language, sourceCode } = req.body;

    if (
      typeof problemId !== 'string' ||
      !problemId.trim() ||
      typeof language !== 'string' ||
      !language.trim() ||
      typeof sourceCode !== 'string' ||
      !sourceCode.trim()
    ) {
      res.status(400).json({
        success: false,
        message: 'Thiếu hoặc sai problemId, language hoặc sourceCode',
      });
      return;
    }

    // Chỉ lấy testcase public, tuyệt đối không lấy testcase hidden
    const problem = await prisma.problem.findUnique({
      where: {
        id: problemId,
      },
      select: {
        id: true,
        isActive: true,
        timeLimit: true,
        memoryLimit: true,
        checkerType: true,
        testcases: {
          where: {
            isHidden: false,
          },
          orderBy: {
            orderIndex: 'asc',
          },
          select: {
            id: true,
            inputData: true,
            expectedOutput: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài tập',
      });
      return;
    }

    if (!problem.isActive) {
      res.status(400).json({
        success: false,
        message: 'Bài tập hiện không hoạt động',
      });
      return;
    }

    const hasPublicTestcase = problem.testcases.length > 0;

    if (!queueUrl) {
      res.status(503).json({
        success: false,
        message: 'Hệ thống hàng đợi chưa được cấu hình',
      });
      return;
    }

    // Một runId dùng chung cho toàn bộ testcase public
    const runId = `run-${randomUUID()}`;
    const redisKey = `run_result:${runId}`;

    // Khởi tạo trạng thái để result.worker biết tổng số testcase cần chờ
    const initialResult = {
  submissionId: runId,
  status: 'RUNNING',
  total: hasPublicTestcase
    ? problem.testcases.length
    : 1,
  completed: 0,
  passed: 0,
  failed: 0,
  results: [],
};

    await redisClient.set(
      redisKey,
      JSON.stringify(initialResult)
    );

    // Gửi từng testcase public vào cùng một run
    if (hasPublicTestcase) {

  // Có testcase public -> chạy và chấm
  for (const testcase of problem.testcases) {

    const jobPayload = {
      submissionId: runId,
      problemId: problem.id,
      testcaseId: testcase.id,

      submissionType: 'PROBLEM_TRIAL',
      checkerType: problem.checkerType,

      language,
      code: sourceCode,

      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,

      input: testcase.inputData ?? "",
      expectedOutput: testcase.expectedOutput ?? "",
    };


    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(jobPayload),
      })
    );
  }


} else {

  // Không có testcase public -> chỉ chạy code
  const jobPayload = {

    submissionId: runId,
    problemId: problem.id,
    testcaseId: "",

    submissionType: 'PLAYGROUND',
    checkerType: problem.checkerType,

    language,
    code: sourceCode,

    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,

    input: "",
    expectedOutput: "",
  };


  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(jobPayload),
    })
  );

}

    res.status(200).json({
      success: true,
      message: 'Đã gửi code để chạy thử',
      runId,
      total: hasPublicTestcase
  ? problem.testcases.length
  : 1,
    });
  } catch (error) {
    console.error('runProblem error:', error);

    res.status(500).json({
      success: false,
      message: 'Không thể chạy thử code',
    });
  }
};

// ============================================================================
// 🟢 4. LẤY KẾT QUẢ CHẠY THỬ (Frontend Polling kết quả Custom Run từ Redis)
// ============================================================================
export const getRunStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { runId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng'
      });
    }

    if (!runId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã runId'
      });
    }

    const redisKey = `run_result:${runId}`;
    const result = await redisClient.get(redisKey);

    console.log('[RUN STATUS] runId =', runId);
    console.log('[RUN STATUS] redis key =', redisKey);
    console.log('[RUN STATUS] redis result =', result);

    // ============================================================
    // CHƯA CÓ KẾT QUẢ
    // ============================================================
    if (!result) {
      return res.status(200).json({
        success: true,
        runId,
        status: 'PENDING',
        message: 'Hệ thống đang xử lý mã nguồn...'
      });
    }

    const parsedResult = JSON.parse(result);

    console.log('\n================ [REDIS RUN RESULT] ================');
    console.log(JSON.stringify(parsedResult, null, 2));
    console.log('=====================================================\n');

    // ============================================================
    // PROBLEM RUN
    //
    // Có:
    // total
    // completed
    // passed
    // failed
    // results[]
    // ============================================================
    if (
      typeof parsedResult.total === 'number' &&
      Array.isArray(parsedResult.results)
    ) {
      return res.status(200).json({
        success: true,

        runId: parsedResult.submissionId || runId,

        status: parsedResult.status || 'RUNNING',

        total: parsedResult.total,
        completed: parsedResult.completed ?? 0,
        passed: parsedResult.passed ?? 0,
        failed: parsedResult.failed ?? 0,

        results: parsedResult.results
      });
    }

    // ============================================================
    // CUSTOM INPUT RUN
    //
    // Giữ nguyên response cũ để không ảnh hưởng
    // chức năng "Chạy thử" tự do.
    // ============================================================
    return res.status(200).json({
      success: true,

      runId: parsedResult.submissionId || runId,

      status: parsedResult.status || 'RUN_SUCCESS',

      output: parsedResult.output || '',
      stdout:
        parsedResult.stdout ||
        parsedResult.output ||
        '',

      error: parsedResult.error || '',
      stderr:
        parsedResult.stderr ||
        parsedResult.error ||
        '',

      executionTime:
        parsedResult.executionTime ??
        parsedResult.duration ??
        null,

      memoryUsed:
        parsedResult.memoryUsed ??
        parsedResult.memory ??
        null,
    });

  } catch (error) {
    console.error(
      'Lỗi lấy kết quả chạy thử từ Redis:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy kết quả chạy thử'
    });
  }
};

// ============================================================================
// 🟢 5. LẤY CHI TIẾT BÀI NỘP CHÍNH THỨC (Frontend Polling kết quả từ PostgreSQL)
// ============================================================================
export const getSubmissionDetail = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng',
      });
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (typeof id !== 'string' || !uuidPattern.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã bài nộp không hợp lệ',
      });
    }

    const submission = await prisma.submission.findFirst({
      // Chỉ xem được bài nộp của chính người đăng nhập.
      where: { id, userId },
      select: {
        id: true,
        language: true,
        sourceCode: true,
        status: true,
        totalTestcases: true,
        totalTime: true,
        createdAt: true,
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        results: {
          select: {
            id: true,
            testcaseId: true,
            status: true,
            executionTime: true,
            output: true,
            errorLog: true,
            testcase: {
              select: {
                orderIndex: true,
                isHidden: true,
                inputData: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài nộp',
      });
    }

    const completed = submission.results.filter(
      (item) => item.status !== TestcaseStatus.PENDING,
    ).length;

    const passed = submission.results.filter(
      (item) => item.status === TestcaseStatus.AC,
    ).length;

    const allPassed =
  completed === submission.totalTestcases &&
  passed === submission.totalTestcases;

    const results = [...submission.results]
  .sort(
    (a, b) =>
      a.testcase.orderIndex - b.testcase.orderIndex ||
      a.testcaseId.localeCompare(b.testcaseId),
  )
  .map(({ testcase, errorLog, output, ...item }, index) => ({
    ...item,

    number: index + 1,

    isHidden: testcase.isHidden,

    input:
      allPassed || !testcase.isHidden
        ? testcase.inputData
        : null,

    output:
      allPassed || !testcase.isHidden
        ? output
        : null,

    errorLog:
      allPassed || !testcase.isHidden
        ? errorLog
        : null,
  }));

    return res.status(200).json({
      success: true,
      data: {
        ...submission,
        results,
        completed,
        passed,
        failed: completed - passed,
      },
    });
  } catch (error) {
    console.error('getSubmissionDetail error:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể lấy chi tiết bài nộp',
    });
  }
};