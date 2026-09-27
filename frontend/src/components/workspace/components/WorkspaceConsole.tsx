import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Cpu,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react';

import type {
  RunResult,
  WorkspaceTab,
} from '../types';

import { ConsoleTabs } from './ConsoleTabs';

interface WorkspaceConsoleProps {

  isSandbox?: boolean;

  activeTab: WorkspaceTab;

  onTabChange: (
    tab: WorkspaceTab
  ) => void;

  customInput: string;

  publicInputs?: string[];

  onCustomInputChange: (
    value: string
  ) => void;

  runResult: RunResult | null;

  aiSuggestion: string;

  onAIDebug?: () => void;

  loading?: boolean;

}

const isSuccessStatus = (
  status?: string
) => {
  if (!status) return false;

  return [
    'COMPLETED',
    'SUCCESS',
    'ACCEPTED',
    'PASSED',
  ].includes(
    status.toUpperCase()
  );
};

const isErrorStatus = (
  status?: string
) => {
  if (!status) return false;

  return [
    'ERROR',
    'FAILED',
    'COMPILE_ERROR',
    'RUNTIME_ERROR',
    'TIMEOUT',
    'WRONG_ANSWER',
  ].includes(
    status.toUpperCase()
  );
};

export const WorkspaceConsole = ({
  isSandbox = false,
  activeTab,
  onTabChange,
  customInput,
  publicInputs = [],
  onCustomInputChange,
  runResult,
  aiSuggestion,
  onAIDebug,
  loading = false,
}: WorkspaceConsoleProps) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <ConsoleTabs
  isSandbox={isSandbox}
  activeTab={activeTab}
  onTabChange={onTabChange}
  onAIDebug={onAIDebug}
/>

      <div className="flex-1 min-h-0 overflow-auto">

        {/* =========================================
            CUSTOM INPUT
        ========================================= */}
        {activeTab === 'input' && isSandbox && (
  <div className="h-full p-4 flex flex-col">

    {/* TESTCASE PUBLIC */}
    {publicInputs.length > 0 && (
      <div className="mb-4 space-y-2">

        <h4 className="text-sm font-semibold text-gray-900">
          Testcase công khai
        </h4>

        <p className="text-xs text-gray-500">
          Click vào testcase để nạp nhanh input.
        </p>


        <div className="space-y-2">
          {publicInputs.map((input, index) => (
            <button
              key={index}
              type="button"
              onClick={() =>
                onCustomInputChange(input)
              }
              className="
              w-full
              text-left
              rounded-lg
              border
              border-gray-200
              bg-gray-50
              hover:bg-gray-100
              p-3
              transition
              "
            >

              <div className="
                text-xs
                font-semibold
                text-gray-500
                mb-1
              ">
                Input #{index + 1}
              </div>


              <pre
                className="
                font-mono
                text-sm
                text-gray-900
                whitespace-pre-wrap
                "
              >
                {input}
              </pre>

            </button>
          ))}
        </div>

      </div>
    )}


    {/* CUSTOM INPUT */}
    <div className="flex-1 flex flex-col">

      <div className="mb-3">

        <h3 className="text-sm font-semibold text-gray-900">
          Custom Input
        </h3>

        <p className="text-xs text-gray-500 mt-1">
          Nhập dữ liệu đầu vào để chạy thử chương trình.
        </p>

      </div>


      <textarea
        value={customInput}
        onChange={(event) =>
          onCustomInputChange(
            event.target.value
          )
        }
        spellCheck={false}
        className="
        flex-1
        min-h-[160px]
        w-full
        resize-none
        rounded-lg
        border
        border-gray-200
        bg-gray-50
        p-4
        font-mono
        text-sm
        text-gray-900
        outline-none
        focus:border-blue-500
        focus:bg-white
        transition
        "
      />

      <div className="mt-2 text-xs text-gray-400">
        Input sẽ được gửi trực tiếp tới chương trình khi bạn nhấn "Chạy thử".
      </div>

    </div>

  </div>
)}

        {/* =========================================
            RESULT
        ========================================= */}
        {activeTab === 'result' && (
          <div className="h-full p-4">

            {/* Loading */}
            {loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2
                    size={28}
                    className="animate-spin mx-auto text-gray-500"
                  />

                  <p className="mt-3 text-sm text-gray-600">
                    Đang thực thi chương trình...
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Vui lòng chờ kết quả.
                  </p>
                </div>
              </div>
            )}

            {/* Empty */}
            {!loading && !runResult && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <AlertCircle
                    size={32}
                    className="mx-auto mb-3"
                  />

                  <p className="text-sm">
                    Chưa có kết quả.
                  </p>

                  <p className="text-xs mt-1">
                    Nhấn "Chạy thử" để thực thi code.
                  </p>
                </div>
              </div>
            )}

            {/* Result */}
            {!loading && runResult && (
              <div className="space-y-4">

                {/* =========================================
                    OVERALL STATUS
                ========================================= */}
                <div className="flex items-center justify-between gap-4">

                  <div className="flex items-center gap-3">

                    {isSuccessStatus(
                      runResult.status
                    ) ? (
                      <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2
                          size={19}
                          className="text-green-600"
                        />
                      </div>
                    ) : isErrorStatus(
                        runResult.status
                      ) ? (
                        <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                          <XCircle
                            size={19}
                            className="text-red-600"
                          />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <AlertCircle
                            size={19}
                            className="text-gray-500"
                          />
                        </div>
                      )}

                    <div>
                      <div className="text-xs text-gray-500">
                        Trạng thái
                      </div>

                      <div className="text-sm font-semibold text-gray-900">
                        {runResult.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">

                    {runResult.executionTime && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock3 size={14} />
                        {runResult.executionTime}
                      </div>
                    )}

                    {runResult.memoryUsed && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Cpu size={14} />
                        {runResult.memoryUsed}
                      </div>
                    )}
                  </div>
                </div>

                {/* =========================================
                    PROBLEM TESTCASE SUMMARY
                ========================================= */}
                {runResult.results &&
                  runResult.results.length > 0 && (
                    <div className="rounded-lg border border-gray-200 overflow-hidden">

                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">

                          <span className="text-sm font-semibold text-gray-900">
                            Kết quả Testcase
                          </span>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-500">
                              {runResult.completed ?? 0}/
                              {runResult.total ??
                                runResult.results.length}
                            </span>

                            <span className="text-green-600 font-medium">
                              {runResult.passed ?? 0} passed
                            </span>

                            <span className="text-red-600 font-medium">
                              {runResult.failed ?? 0} failed
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {runResult.results.map(
                          (testcase, index) => {

                            const allPassed =
                            runResult.failed === 0 &&
                            runResult.completed === runResult.total;

                            const passed =
                              isSuccessStatus(
                                testcase.status
                              );

                            const failed =
                              isErrorStatus(
                                testcase.status
                              );

                            return (
                              <div
                                key={
                                  testcase.testcaseId ||
                                  index
                                }
                                className="px-4 py-3"
                              >
                                <div className="flex items-center justify-between gap-4">

                                  <div className="flex items-center gap-3">

                                    {passed ? (
                                      <CheckCircle2
                                        size={18}
                                        className="text-green-600 shrink-0"
                                      />
                                    ) : failed ? (
                                      <XCircle
                                        size={18}
                                        className="text-red-600 shrink-0"
                                      />
                                    ) : (
                                      <AlertCircle
                                        size={18}
                                        className="text-gray-400 shrink-0"
                                      />
                                    )}

                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        Testcase {index + 1}

                                        {testcase.isHidden && (
                                            <span className="
                                            ml-2
                                            text-xs
                                            text-gray-400
                                            ">
                                            (Hidden)
                                            </span>
                                        )}
                                        </div>

                                      <div className="text-xs text-gray-400 font-mono">
                                        {testcase.testcaseId}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">

                                    <span
                                      className={`text-xs font-semibold ${
                                        passed
                                          ? 'text-green-600'
                                          : failed
                                          ? 'text-red-600'
                                          : 'text-gray-500'
                                      }`}
                                    >
                                      {testcase.status}
                                    </span>

                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock3 size={13} />
                                      {testcase.executionTime} ms
                                    </span>
                                  </div>
                                </div>

                                {/* Testcase output/error */}
                                {testcase.input && (
                                <div className="mt-3 ml-7">

                                    <div className="text-xs font-semibold text-gray-600 mb-1">
                                    Input
                                    </div>

                                    <pre
                                    className="
                                    max-h-[120px]
                                    overflow-auto
                                    rounded-md
                                    bg-gray-100
                                    text-gray-900
                                    p-3
                                    font-mono
                                    text-xs
                                    whitespace-pre-wrap
                                    "
                                    >
                                    {testcase.input}
                                    </pre>

                                </div>
                                )}


                                {/* Testcase output/error */}
                                {
                                (
                                !testcase.isHidden ||
                                allPassed
                                ) &&
                                (
                                testcase.output ||
                                testcase.error ||
                                testcase.status === 'WA' ||
                                testcase.status === 'WRONG_ANSWER'
                                ) && (

                                <div className="mt-3 ml-7">

                                <div className="text-xs font-semibold text-gray-600 mb-1">
                                    {testcase.error
                                    ? 'Error'
                                    : 'Output'}
                                </div>


                                <pre
                                    className="
                                    max-h-[180px]
                                    overflow-auto
                                    rounded-md
                                    bg-gray-950
                                    text-gray-100
                                    p-3
                                    font-mono
                                    text-xs
                                    whitespace-pre-wrap
                                    "
                                >
                                    {
                                    testcase.error ||
                                    testcase.output ||
                                    '(Không có output)'
                                    }
                                </pre>

                                </div>

                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                {/* =========================================
                    NORMAL / SANDBOX OUTPUT
                ========================================= */}
                {(!runResult.results ||
                  runResult.results.length === 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        Output
                      </span>
                    </div>

                    <pre className="min-h-[140px] max-h-[450px] overflow-auto rounded-lg bg-gray-950 text-gray-100 p-4 font-mono text-sm whitespace-pre-wrap">
                      {runResult.stdout ||
                        '(Không có output)'}
                    </pre>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* =========================================
            AI
        ========================================= */}
        {activeTab === 'ai' && (
          <div className="h-full p-4 overflow-auto">

            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center">
                <Sparkles size={17} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Trợ Giảng AI
                </h3>

                <p className="text-xs text-gray-500">
                  Phân tích code và giải thích lỗi.
                </p>
              </div>
            </div>

            {!aiSuggestion && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-center">

                <Sparkles
                  size={28}
                  className="mx-auto text-gray-400 mb-3"
                />

                <p className="text-sm text-gray-600">
                  Chưa có phân tích từ AI.
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Chạy code trước rồi mở Trợ Giảng AI để phân tích.
                </p>
              </div>
            )}

            {aiSuggestion && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">

                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={15} />

                  <span className="text-sm font-semibold text-gray-900">
                    Gợi ý từ AI
                  </span>
                </div>

                <div className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">
                  {aiSuggestion}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkspaceConsole;