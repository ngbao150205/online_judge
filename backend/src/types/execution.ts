import type { CheckerType } from '@prisma/client';

export interface ExecutionInput {
  problemId: string;
  language: 'python' | 'cpp';
  sourceCode: string;
}

export interface CustomRunInput extends Omit<ExecutionInput, 'problemId'> {
  problemId?: string | null;
  customInput?: string | null;
}

export interface JudgeJob {
  submissionId: string;
  problemId: string | null;
  testcaseId: string;
  submissionType: 'PLAYGROUND' | 'PROBLEM_TRIAL' | 'PROBLEM_SUBMIT';
  checkerType: CheckerType | '';
  language: string;
  code: string;
  input: string;
  expectedOutput: string;
  timeLimit: number;
  memoryLimit: number;
  isCustomInput?: boolean;
}
