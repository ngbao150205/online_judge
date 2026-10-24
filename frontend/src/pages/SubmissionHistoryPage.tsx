import { API_BASE_URL } from '../config/api';
import { useState } from 'react';
import SubmissionHistory from '../components/SubmissionHistory';
import PlaygroundHistory from '../components/PlaygroundHistory';
import { useLanguage } from '../context/LanguageContext';

export default function SubmissionHistoryPage() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'playground'>('submissions');
  const { t } = useLanguage() as any;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => setActiveTab('submissions')} className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === 'submissions' ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-slate-500'}`}>
          {t('Bài nộp chính thức', 'Official submissions')}
        </button>
        <button type="button" onClick={() => setActiveTab('playground')} className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === 'playground' ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-slate-500'}`}>
          Playground
        </button>
      </div>
      {activeTab === 'submissions'
        ? <SubmissionHistory apiBaseUrl={API_BASE_URL} />
        : <PlaygroundHistory />}
    </div>
  );
}
