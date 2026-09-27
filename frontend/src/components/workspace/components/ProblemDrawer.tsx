import {
  Clock3,
  Cpu,
  X,
} from 'lucide-react';

import type {
  Problem,
  Testcase,
} from '../types';

interface ProblemDrawerProps {
  problem: Problem;

  open: boolean;

  onClose: () => void;
}

const parseJSON = <T,>(
  value: T | string | undefined
): T | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const getTestcases = (
  problem: Problem
): Testcase[] => {
  if (
    Array.isArray(problem.testcases) &&
    problem.testcases.length > 0
  ) {
    return problem.testcases;
  }

  const samples = parseJSON<
    Testcase[]
  >(problem.sampleTestcases);

  if (
    Array.isArray(samples)
  ) {
    return samples;
  }

  return [];
};

const getDifficultyClass = (
  difficulty?: string
) => {
  switch (
    difficulty?.toLowerCase()
  ) {
    case 'easy':
    case 'dễ':
      return 'bg-green-100 text-green-700';

    case 'medium':
    case 'trung bình':
      return 'bg-yellow-100 text-yellow-700';

    case 'hard':
    case 'khó':
      return 'bg-red-100 text-red-700';

    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const ProblemDrawer = ({
  problem,
  open,
  onClose,
}: ProblemDrawerProps) => {
  if (!open) {
    return null;
  }

  const testcases =
    getTestcases(problem);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 z-50 h-screen w-full max-w-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-14 shrink-0 border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {problem.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDifficultyClass(
                problem.difficulty
              )}`}
            >
              {problem.difficulty}
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
              <Clock3 size={13} />
              {problem.timeLimit} ms
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
              <Cpu size={13} />
              {problem.memoryLimit} MB
            </span>
          </div>

          {/* Description */}
          <section className="mb-7">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Đề bài
            </h3>

            <div className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">
              {problem.description ||
                'Không có mô tả.'}
            </div>
          </section>

          {/* Input */}
          {problem.inputFormat && (
            <section className="mb-7">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Input
              </h3>

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {problem.inputFormat}
              </div>
            </section>
          )}

          {/* Output */}
          {problem.outputFormat && (
            <section className="mb-7">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Output
              </h3>

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {problem.outputFormat}
              </div>
            </section>
          )}

          {/* Examples */}
          {testcases.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Ví dụ
              </h3>

              <div className="space-y-4">
                {testcases.map(
                  (
                    testcase,
                    index
                  ) => (
                    <div
                      key={
                        testcase.id ||
                        index
                      }
                      className="rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-700">
                          Ví dụ {index + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-3 border-b md:border-b-0 md:border-r border-gray-200">
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            Input
                          </div>

                          <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                            {testcase.inputData ||
                              '(empty)'}
                          </pre>
                        </div>

                        <div className="p-3">
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            Output
                          </div>

                          <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                            {testcase.expectedOutput ||
                              '(empty)'}
                          </pre>
                        </div>
                      </div>

                      {testcase.explanation && (
                        <div className="px-3 py-3 border-t border-gray-200 bg-gray-50">
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Giải thích
                          </div>

                          <div className="text-xs text-gray-700 leading-5 whitespace-pre-wrap">
                            {
                              testcase.explanation
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </div>
      </aside>
    </>
  );
};

export default ProblemDrawer;