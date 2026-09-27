import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useLocation,
} from 'react-router-dom';

import type {
  Problem,
  SubmissionResult,
  WorkspaceTab,
} from '../types';

import {
  useCodeExecution,
} from '../hooks/useCodeExecution';

import {
  useSubmission,
} from '../hooks/useSubmission';

import {
  explainCode,
} from '../services/aiService';

import {
  WorkspaceLayout,
} from '../components/WorkspaceLayout';

import {
  ProblemDrawer,
} from '../components/ProblemDrawer';

interface ProblemWorkspaceProps {
  problem: Problem;
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

const getCodeTemplate = (
  problem: Problem,
  language: string
) => {
  const templates =
    parseJSON<
      Record<string, string>
    >(problem.codeTemplates);

  if (!templates) {
    return '';
  }

  return (
    templates[language] ||
    templates[
      language.toLowerCase()
    ] ||
    ''
  );
};

export const ProblemWorkspace = ({
  problem,
}: ProblemWorkspaceProps) => {
  const navigate =
    useNavigate();

  const location = useLocation();

    const fromRoadmap =
    location.state?.fromRoadmap;

    const roadmapId =
    location.state?.roadmapId;

  const [language, setLanguage] =
    useState('cpp');

  const [code, setCode] =
    useState('');

  const [customInput, setCustomInput] =
    useState('');

  const publicInputs = useMemo(() => {
  const testcases =
    Array.isArray(problem.testcases)
      ? problem.testcases
      : parseJSON<any[]>(
          problem.sampleTestcases
        ) || [];

  return testcases
    .filter((test) => !test.isHidden)
    .map(
      (test) =>
        test.inputData ||
        test.input ||
        ''
    );
}, [problem]);

  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>('input');

  const [aiSuggestion, setAiSuggestion] =
    useState('');

  const [aiLoading, setAiLoading] =
    useState(false);

  const [
    showProblemDrawer,
    setShowProblemDrawer,
  ] = useState(false);

  const [
    resultSource,
    setResultSource,
  ] = useState<
    'run' | 'submit'
  >('run');

  const {
  runResult,
  loading: runLoading,
  runProblemCode,
} = useCodeExecution();

  const {
    submissionResult,
    loading: submissionLoading,
    submit,
  } = useSubmission();

  /**
   * Load code template khi problem thay đổi.
   */
  useEffect(() => {
    const template =
      getCodeTemplate(
        problem,
        language
      );

    setCode(template);

    /**
     * Lấy testcase đầu tiên
     * làm custom input mặc định.
     */
    const testcases =
      Array.isArray(
        problem.testcases
      ) &&
      problem.testcases.length > 0
        ? problem.testcases
        : parseJSON<any[]>(
            problem.sampleTestcases
          );

    if (
      testcases &&
      testcases.length > 0
    ) {
      setCustomInput(
        testcases[0]?.inputData ||
          ''
      );
    } else {
      setCustomInput('');
    }

    setAiSuggestion('');
    setActiveTab('input');
  }, [problem]);

  /**
   * Đổi ngôn ngữ.
   */
  const handleLanguageChange = (
    newLanguage: string
  ) => {
    setLanguage(newLanguage);

    const template =
      getCodeTemplate(
        problem,
        newLanguage
      );

    setCode(template);
  };

  /**
   * Chạy code custom input.
   */
  const handleRun = async () => {
  setResultSource('run');
  setActiveTab('result');

  await runProblemCode({
    problemId: problem.id,
    language,
    sourceCode: code,
  });
};

  /**
   * Submit chính thức.
   */
  const handleSubmit = async () => {
    setResultSource('submit');

    setActiveTab('result');

    await submit({
      problemId: problem.id,
      language,
      sourceCode: code,
    });
  };

  /**
   * AI debug.
   */
  const handleAIDebug = async () => {
    setActiveTab('ai');

    if (aiLoading) {
      return;
    }

    setAiLoading(true);

    try {
      const errorMessage =
        runResult?.stdout ||
        submissionResult?.compileLog ||
        'Không có thông tin lỗi execution';

      const suggestion =
        await explainCode({
          sourceCode: code,
          language,
          errorMessage,
        });

      setAiSuggestion(
        suggestion
      );
    } catch (error) {
      console.error(
        'Lỗi AI:',
        error
      );

      setAiSuggestion(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối Trợ Giảng AI.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * Kết quả hiển thị trong console.
   */
  const displayResult =
  useMemo(() => {

    if (resultSource === 'submit') {

      if (!submissionResult) {
        return null;
      }

      return {
        ...submissionResult,

        stdout:
          submissionResult.compileLog ||
          submissionResult.stdout ||
          '',
      };
    }

    return runResult;

  }, [
    resultSource,
    runResult,
    submissionResult,
  ]);

  /**
   * Loading chung.
   */
  const loading =
    runLoading ||
    submissionLoading ||
    aiLoading;

  return (
    <>
      <WorkspaceLayout
        isSandbox={false}
        title={problem.title}
        language={language}
        code={code}
        customInput={customInput}
        publicInputs={publicInputs}
        activeTab={activeTab}
        runResult={displayResult}
        aiSuggestion={
          aiSuggestion
        }
        loading={loading}
        onLanguageChange={
          handleLanguageChange
        }
        onCodeChange={setCode}
        onCustomInputChange={
          setCustomInput
        }
        onTabChange={
          setActiveTab
        }
        onRun={handleRun}
        onSubmit={
          handleSubmit
        }
        onAIDebug={
          handleAIDebug
        }
        onOpenProblem={() =>
          setShowProblemDrawer(
            true
          )
        }
        onBack={() => {
            if (fromRoadmap && roadmapId) {
                navigate(`/roadmaps/${roadmapId}`);
                return;
            }

            navigate('/problems', {
                state: {
                openDetailSlug: problem.slug,
                },
            });
            }}
      />

      <ProblemDrawer
        problem={problem}
        open={
          showProblemDrawer
        }
        onClose={() =>
          setShowProblemDrawer(
            false
          )
        }
      />
    </>
  );
};

export default ProblemWorkspace;