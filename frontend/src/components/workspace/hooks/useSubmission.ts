import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  getSubmissionStatus,
  submitCode,
} from '../services/submissionService';

import type {
  SubmissionResult,
} from '../types';

interface SubmitOptions {
  problemId: string;
  language: string;
  sourceCode: string;
}

export const useSubmission = () => {
  const [
    submissionResult,
    setSubmissionResult,
  ] =
    useState<SubmissionResult | null>(
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

  const submit =
    useCallback(
      async ({
        problemId,
        language,
        sourceCode,
      }: SubmitOptions) => {
        clearPolling();

        setLoading(true);

        setSubmissionResult({
          status: 'PENDING',
        });

        try {
          const submissionId =
            await submitCode({
              problemId,
              language,
              sourceCode,
            });

          let pollCount = 0;

          const maxPolls = 25;

          const poll =
  async (): Promise<boolean> => {
    pollCount += 1;

    const response =
      await getSubmissionStatus(
        submissionId
      );

    if (!response) {
      if (pollCount >= maxPolls) {
        setSubmissionResult({
          status: 'ERROR',
          compileLog:
            'Không thể lấy trạng thái bài nộp.',
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
      status === 'IN_PROGRESS' ||
      status === 'RUNNING';


    if (isProcessing) {

      if (pollCount >= maxPolls) {

        setSubmissionResult({
          status: 'TIMEOUT',
          compileLog:
            'Quá thời gian chờ kết quả chấm bài.',
        });

        setLoading(false);

        return true;
      }

      return false;
    }


    const compileLog =
      data?.compileLog ||
      data?.compileOutput ||
      data?.stderr ||
      '';


    const results =
      Array.isArray(data?.results)
        ? data.results
        : [];


    const stdout =
      data?.stdout ||
      data?.output ||
      (
        results.length > 0
          ? results
              .map((item: any) => {
                return [
                  `Testcase #${item.number}`,
                  `Status: ${item.status}`,
                  item.output
                    ? `Output: ${item.output}`
                    : 'Output: (Không có output)',
                  item.errorLog
                    ? `Error: ${item.errorLog}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n');
              })
              .join('\n\n')
          : ''
      );


    setSubmissionResult({

      status:
        status ||
        'UNKNOWN',


      stdout:
        stdout ||
        '(Không có output)',


      results,


      total:
        data?.total ??
        data?.totalTestcases ??
        results.length,


      completed:
        data?.completed ??
        results.length,


      passed:
        data?.passed ??
        results.filter(
          (item: any) =>
            item.status === 'AC' ||
            item.status === 'ACCEPTED'
        ).length,


      failed:
        data?.failed ??
        results.filter(
          (item: any) =>
            item.status !== 'AC' &&
            item.status !== 'ACCEPTED'
        ).length,


      compileLog:
        status === 'COMPILE_ERROR'
          ? compileLog
          : undefined,


      totalTime:
        data?.totalTime != null
          ? `${data.totalTime} ms`
          : data?.executionTime != null
          ? `${data.executionTime} ms`
          : undefined,


      maxMemory:
        data?.maxMemory != null
          ? `${data.maxMemory} KB`
          : data?.memoryUsed != null
          ? `${data.memoryUsed} KB`
          : undefined,

    });


    setLoading(false);

    return true;
};

          /**
           * Poll lần đầu.
           */
          const completed =
            await poll();

          if (completed) {
            return;
          }

          /**
           * Poll mỗi 1.5 giây.
           */
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
                    'Lỗi polling submission:',
                    error
                  );

                  if (
                    pollCount >=
                    maxPolls
                  ) {
                    clearPolling();

                    setSubmissionResult({
                      status:
                        'ERROR',
                      compileLog:
                        'Có lỗi xảy ra khi lấy kết quả chấm bài.',
                    });

                    setLoading(false);
                  }
                }
              },
              1500
            );
        } catch (error) {
          clearPolling();

          console.error(
            'Lỗi submit:',
            error
          );

          setSubmissionResult({
            status: 'ERROR',
            compileLog:
              error instanceof Error
                ? error.message
                : 'Không thể nộp bài.',
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
    submissionResult,
    loading,
    submit,
    clearPolling,
  };
};