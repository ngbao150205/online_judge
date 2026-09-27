import {
  Bot,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

import type {
  WorkspaceTab,
} from '../types';

interface ConsoleTabsProps {
  isSandbox?: boolean;

  activeTab: WorkspaceTab;

  onTabChange: (
    tab: WorkspaceTab
  ) => void;

  onAIDebug?: () => void;
}

export const ConsoleTabs = ({
  isSandbox = false,
  activeTab,
  onTabChange,
  onAIDebug,
}: ConsoleTabsProps) => {
  return (
    <div className="h-11 shrink-0 border-b border-gray-200 bg-white flex items-center px-2">
      {isSandbox && (
  <button
    type="button"
    onClick={() =>
      onTabChange('input')
    }
    className={`
      h-full px-3 flex items-center gap-2
      text-sm font-medium border-b-2
      transition
      ${
        activeTab === 'input'
          ? 'border-black text-black'
          : 'border-transparent text-gray-500 hover:text-gray-900'
      }
    `}
  >
    <Terminal size={15} />
    Custom Input
  </button>
)}

      <button
        type="button"
        onClick={() =>
          onTabChange('result')
        }
        className={`
          h-full px-3 flex items-center gap-2
          text-sm font-medium border-b-2
          transition
          ${
            activeTab === 'result'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }
        `}
      >
        <CheckCircle2 size={15} />
        Kết Quả Thực Thi
      </button>

      <button
        type="button"
        onClick={() => {
          if (onAIDebug) {
            onAIDebug();
          } else {
            onTabChange('ai');
          }
        }}
        className={`
          h-full px-3 flex items-center gap-2
          text-sm font-medium border-b-2
          transition
          ${
            activeTab === 'ai'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }
        `}
      >
        <Bot size={15} />
        Trợ Giảng AI
      </button>
    </div>
  );
};

export default ConsoleTabs;