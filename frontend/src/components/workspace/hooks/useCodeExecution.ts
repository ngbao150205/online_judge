import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  getRunStatus,
  runCode,
  runProblem,
} from '../services/executionService';

import type {
  RunResult,
} from '../types';

interface RunCodeOptions {
  problemId?: string;
  language: string;
  sourceCode: string;
  customInput: string;
}

export const useCodeExecution = () => {
  const [
    runResult,
    setRunResult,
  ] =
    useState<RunResult | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const pollingRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  const clearPolling =
    useCallback(() => {
      if (pollingRef.current) {
        clearInterval(
          pollingRef.current
        );

        pollingRef.current =
          null;
      }
    }, []);

  const runCustomCode =
    useCallback(
      async ({
        problemId,
        language,
        sourceCode,
        customInput,
      }: RunCodeOptions) => {
        clearPolling();

        setLoading(true);

        setRunResult({
          status: 'EXECUTING',
          stdout:
            'Đang biên dịch và chạy chương trình...',
        });

        try {
          const runId =
            await runCode({
              problemId,
              language,
              sourceCode,
              customInput,
            });

          let pollCount = 0;

          const maxPolls = 20;

          const poll =
            async (): Promise<boolean> => {
              pollCount += 1;

              const response =
                await getRunStatus(
                  runId
                );

              if (!response) {
                if (
                  pollCount >=
                  maxPolls
                ) {
                  setRunResult({
                    status:
                      'ERROR',
                    stdout:
                      'Không thể lấy trạng thái thực thi.',
                  });

                  setLoading(false);

                  return true;
                }

                return false;
              }

              const data =
                response?.data ||
                response;

              const status =
                data?.status;

              const isProcessing =
                status ===
                  'PENDING' ||
                status ===
                  'RUNNING' ||
                status ===
                  'IN_PROGRESS';

              if (isProcessing) {
                if (
                  pollCount >=
                  maxPolls
                ) {
                  setRunResult({
                    status:
                      'TIMEOUT',
                    stdout:
                      'Quá thời gian chờ kết quả thực thi.',
                  });

                  setLoading(false);

                  return true;
                }

                return false;
              }

              const stdout =
                data?.stdout ??
                data?.output ??
                '';

              const stderr =
                data?.stderr ??
                data?.error ??
                '';

              setRunResult({
                status:
                  status ||
                  'COMPLETED',

                stdout:
                  stdout ||
                  stderr ||
                  'Không có output.',

                executionTime:
                  data?.executionTime !=
                  null
                    ? `${data.executionTime} ms`
                    : data?.executionTimeMs !=
                      null
                    ? `${data.executionTimeMs} ms`
                    : undefined,

                memoryUsed:
                  data?.memoryUsed !=
                  null
                    ? `${data.memoryUsed} KB`
                    : data?.memoryUsedKb !=
                      null
                    ? `${data.memoryUsedKb} KB`
                    : undefined,
              });

              setLoading(false);

              return true;
            };

          const completed =
            await poll();

          if (completed) {
            return;
          }

          pollingRef.current =
            setInterval(
              async () => {
                try {
                  const done =
                    await poll();

                  if (done) {
                    clearPolling();
                  }
                } catch (error) {
                  console.error(
                    'Lỗi polling execution:',
                    error
                  );

                  if (
                    pollCount >=
                    maxPolls
                  ) {
                    clearPolling();

                    setRunResult({
                      status:
                        'ERROR',
                      stdout:
                        'Có lỗi xảy ra khi lấy kết quả thực thi.',
                    });

                    setLoading(false);
                  }
                }
              },
              1000
            );
        } catch (error) {
          clearPolling();

          console.error(
            'Lỗi chạy code:',
            error
          );

          setRunResult({
            status: 'ERROR',
            stdout:
              error instanceof Error
                ? error.message
                : 'Không thể chạy chương trình.',
          });

          setLoading(false);
        }
      },
      [clearPolling]
    );

const runProblemCode = useCallback(
  async ({
    problemId,
    language,
    sourceCode,
  }: {
    problemId: string;
    language: string;
    sourceCode: string;
  }) => {
    clearPolling();

    setLoading(true);

    setRunResult({
      status: 'RUNNING',
      stdout:
        'Đang chạy các testcase công khai...',
    });

    try {
      const runId = await runProblem({
        problemId,
        language,
        sourceCode,
      });

      let pollCount = 0;
      const maxPolls = 60;

      const poll =
        async (): Promise<boolean> => {
          pollCount += 1;

          const response =
            await getRunStatus(runId);

          if (!response) {
            if (pollCount >= maxPolls) {
              setRunResult({
                status: 'ERROR',
                stdout:
                  'Không thể lấy trạng thái thực thi.',
              });

              setLoading(false);
              return true;
            }

            return false;
          }

          const data =
            response?.data ||
            response;

          const status =
            data?.status;

          const isProcessing =
            status === 'PENDING' ||
            status === 'RUNNING' ||
            status === 'IN_PROGRESS';

          if (isProcessing) {
            /*
             * Có results rồi nhưng vẫn còn testcase
             * đang chạy.
             */
            if (
              Array.isArray(
                data?.results
              )
            ) {
              const completed =
                data.completed ?? 0;
              const total =
                data.total ?? 0;

              setRunResult({
                status: 'RUNNING',
                stdout:
                  `Đang chạy testcase ${completed}/${total}...`,
                total,
                completed,
                passed:
                  data.passed ?? 0,
                failed:
                  data.failed ?? 0,
                results:
                  data.results,
              });
            }

            if (pollCount >= maxPolls) {
              setRunResult({
                status: 'TIMEOUT',
                stdout:
                  'Quá thời gian chờ kết quả thực thi.',
              });

              setLoading(false);
              return true;
            }

            return false;
          }

          /*
           * Problem run:
           * backend trả results[]
           */
          if (
            Array.isArray(
              data?.results
            )
          ) {
            const results =
              data.results;

            const total =
              data.total ??
              results.length;

            const completed =
              data.completed ??
              results.length;

            const passed =
              data.passed ??
              results.filter(
                (item: {
                  status: string;
                }) =>
                  item.status === 'AC' ||
                  item.status ===
                    'ACCEPTED'
              ).length;

            const failed =
              data.failed ??
              completed - passed;

            setRunResult({
              status:
                data.status ||
                (failed === 0
                  ? 'ACCEPTED'
                  : 'COMPLETED'),

              stdout: results
  .map((item: any) => {
    return [
      `Testcase #${item.number}`,
      `Status: ${item.status}`,
      item.isHidden
        ? 'Output: Hidden testcase'
        : `Output: ${item.output || '(Không có output)'}`,
      item.errorLog
        ? `Error: ${item.errorLog}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  })
  .join('\n\n'),

              total,
              completed,
              passed,
              failed,
              results,

              executionTime:
                results.length > 0
                  ? `${results.reduce(
                      (
                        sum: number,
                        item: {
                          executionTime: number;
                        }
                      ) =>
                        sum +
                        (item.executionTime ||
                          0),
                      0
                    )} ms`
                  : undefined,
            });

            setLoading(false);

            return true;
          }

          /*
           * Fallback cho response dạng
           * custom run.
           */
          const stdout =
            data?.stdout ??
            data?.output ??
            '';

          const stderr =
            data?.stderr ??
            data?.error ??
            '';

          setRunResult({
            status:
              status ||
              'COMPLETED',

            stdout:
              stdout ||
              stderr ||
              'Không có output.',

            executionTime:
              data?.executionTime !=
              null
                ? `${data.executionTime} ms`
                : undefined,

            memoryUsed:
              data?.memoryUsed !=
              null
                ? `${data.memoryUsed} KB`
                : undefined,
          });

          setLoading(false);

          return true;
        };

      const completed =
        await poll();

      if (completed) {
        return;
      }

      pollingRef.current =
        setInterval(
          async () => {
            try {
              const done =
                await poll();

              if (done) {
                clearPolling();
              }
            } catch (error) {
              console.error(
                'Lỗi polling problem execution:',
                error
              );

              if (
                pollCount >= maxPolls
              ) {
                clearPolling();

                setRunResult({
                  status: 'ERROR',
                  stdout:
                    'Có lỗi xảy ra khi lấy kết quả thực thi.',
                });

                setLoading(false);
              }
            }
          },
          1000
        );
    } catch (error) {
      clearPolling();

      console.error(
        'Lỗi chạy problem:',
        error
      );

      setRunResult({
        status: 'ERROR',
        stdout:
          error instanceof Error
            ? error.message
            : 'Không thể chạy chương trình.',
      });

      setLoading(false);
    }
  },
  [clearPolling]
);

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
  runResult,
  loading,
  runCustomCode,
  runProblemCode,
  clearPolling,
};
};