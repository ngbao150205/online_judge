import type {
  RunResult,
  SubmissionResult,
  WorkspaceTab,
} from '../types';

import { WorkspaceHeader } from './WorkspaceHeader';
import { CodeEditor } from './CodeEditor';
import { WorkspaceConsole } from './WorkspaceConsole';

interface WorkspaceLayoutProps {
  isSandbox?: boolean;
  title: string;

  language: string;

  code: string;

  customInput: string;
  publicInputs?: string[];

  activeTab: WorkspaceTab;

  runResult:
    | RunResult
    | SubmissionResult
    | null;

  aiSuggestion: string;

  loading?: boolean;

  onLanguageChange: (
    language: string
  ) => void;

  onCodeChange: (
    code: string
  ) => void;

  onCustomInputChange: (
    value: string
  ) => void;

  onTabChange: (
    tab: WorkspaceTab
  ) => void;

  onRun: () => void;

  onSubmit?: () => void;

  onAIDebug?: () => void;

  onOpenProblem?: () => void;

  onBack: () => void;
}

export const WorkspaceLayout = ({
  isSandbox = false,
  title,
  language,
  code,
  customInput,
  publicInputs = [],
  activeTab,
  runResult,
  aiSuggestion,
  loading = false,
  onLanguageChange,
  onCodeChange,
  onCustomInputChange,
  onTabChange,
  onRun,
  onSubmit,
  onAIDebug,
  onOpenProblem,
  onBack,
}: WorkspaceLayoutProps) => {
  return (
    <div className="h-screen w-full bg-gray-100 flex flex-col overflow-hidden">
      <WorkspaceHeader
        isSandbox={isSandbox}
        title={title}
        language={language}
        loading={loading}
        onLanguageChange={
          onLanguageChange
        }
        onRun={onRun}
        onSubmit={onSubmit}
        onOpenProblem={
          onOpenProblem
        }
        onBack={onBack}
      />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Editor */}
        <section className="w-full lg:w-1/2 h-1/2 lg:h-full min-h-0 border-b lg:border-b-0 lg:border-r border-gray-200">
          <CodeEditor
            language={language}
            value={code}
            onChange={onCodeChange}
          />
        </section>

        {/* Console */}
        <section className="w-full lg:w-1/2 h-1/2 lg:h-full min-h-0">
          <WorkspaceConsole
            isSandbox={isSandbox}
            activeTab={activeTab}
            onTabChange={onTabChange}
            customInput={customInput}
            publicInputs={publicInputs}
            onCustomInputChange={
                onCustomInputChange
            }
            runResult={runResult}
            aiSuggestion={aiSuggestion}
            onAIDebug={onAIDebug}
            loading={loading}
            />
        </section>
      </main>
    </div>
  );
};

export default WorkspaceLayout;