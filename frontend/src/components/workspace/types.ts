export interface Testcase {
  id?: string;
  inputData: string;
  expectedOutput: string;
  orderIndex?: number;
  explanation?: string;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;

  timeLimit: number;
  memoryLimit: number;

  description: string;

  inputFormat?: string;
  outputFormat?: string;

  testcases?: Testcase[];

  /**
   * Một số API có thể trả sampleTestcases
   * dưới dạng JSON string.
   */
  sampleTestcases?: Testcase[] | string;

  /**
   * codeTemplates có thể là:
   * {
   *   cpp: "...",
   *   java: "...",
   *   python: "..."
   * }
   *
   * hoặc JSON string.
   */
  codeTemplates?: Record<string, string> | string;
}
export interface ProblemRunTestcaseResult {
  id?: string;
  testcaseId?: string;
  number: number;
  status: string;

  executionTime?: number;

input?: string | null;

  output?: string | null;

  error?: string | null;

  errorLog?: string | null;

  isHidden?: boolean;
}

export interface RunResult {
  status: string;

  stdout?: string;
  output?: string;
  stderr?: string;
  error?: string;

  executionTime?: string;
  memoryUsed?: string;

  total?: number;
  completed?: number;
  passed?: number;
  failed?: number;

  results?: ProblemRunTestcaseResult[];
}

export interface SubmissionTestcaseResult {
  id?: string;
  testcaseId?: string;
  number: number;
  status: string;

  input?: string;
  expectedOutput?: string;

  executionTime?: number;

  output?: string | null;

  error?: string | null;

  errorLog?: string | null;

  isHidden?: boolean;
}

export interface SubmissionResult {
  status: string;

  stdout?: string;

  compileLog?: string;

  totalTime?: string;

  maxMemory?: string;


  // thêm cho submit chính thức
  results?: SubmissionTestcaseResult[];

  total?: number;

  completed?: number;

  passed?: number;

  failed?: number;
}

export type WorkspaceTab = 'input' | 'result' | 'ai';

export type WorkspaceMode = 'sandbox' | 'problem';

export type SupportedLanguage =
  | 'cpp'
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | string;