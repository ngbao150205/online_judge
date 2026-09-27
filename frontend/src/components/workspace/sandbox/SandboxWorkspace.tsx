import {
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import type {
  WorkspaceTab,
} from '../types';

import {
  useCodeExecution,
} from '../hooks/useCodeExecution';

import {
  explainCode,
} from '../services/aiService';

import {
  WorkspaceLayout,
} from '../components/WorkspaceLayout';



export const SandboxWorkspace =
  () => {
    const navigate =
      useNavigate();

    const [
      language,
      setLanguage,
    ] = useState('cpp');

    const [code, setCode] =
      useState(''
      );

    const [
      customInput,
      setCustomInput,
    ] = useState('');

    const [
      activeTab,
      setActiveTab,
    ] = useState<WorkspaceTab>(
      'input'
    );

    const [
      aiSuggestion,
      setAiSuggestion,
    ] = useState('');

    const [
      aiLoading,
      setAiLoading,
    ] = useState(false);

    const {
      runResult,
      loading: runLoading,
      runCustomCode,
    } = useCodeExecution();

    const handleLanguageChange = (
      newLanguage: string
    ) => {
      setLanguage(
        newLanguage
      );
    };

    const handleRun = async () => {
      setActiveTab(
        'result'
      );

      await runCustomCode({
        /**
         * Sandbox không có problemId.
         */
        problemId: undefined,

        language,

        sourceCode: code,

        customInput,
      });
    };

    const handleAIDebug =
      async () => {
        setActiveTab('ai');

        if (aiLoading) {
          return;
        }

        setAiLoading(true);

        try {
          const suggestion =
            await explainCode({
              sourceCode: code,
              language,
              errorMessage:
                runResult?.stdout ||
                'Không có thông tin lỗi execution',
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

    return (
      <WorkspaceLayout
        isSandbox={true}
        title=""
        language={language}
        code={code}
        customInput={customInput}
        activeTab={activeTab}
        runResult={runResult}
        aiSuggestion={
          aiSuggestion
        }
        loading={
          runLoading ||
          aiLoading
        }
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
        onAIDebug={
          handleAIDebug
        }
        onBack={() =>
          navigate('/problems')
        }
      />
    );
  };

export default SandboxWorkspace;