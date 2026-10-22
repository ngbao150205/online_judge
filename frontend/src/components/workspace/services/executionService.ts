import { API_BASE_URL } from '../../../config/api';
import { apiFetch } from '../../../services/api';
const API_BASE = API_BASE_URL;

export interface RunCodeParams {
  problemId?: string;
  language: string;
  sourceCode: string;
  customInput: string;
}

export const runCode = async ({
  problemId,
  language,
  sourceCode,
  customInput,
}: RunCodeParams): Promise<string> => {
  const response = await apiFetch(
    `${API_BASE}/submissions/run`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId,
        language,
        sourceCode,
        customInput,
      }),
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Lỗi máy chủ (${response.status})`
    );
  }

  const runId =
    data.runId ||
    data.data?.runId;

  if (!runId) {
    throw new Error(
      'Không tìm thấy runId.'
    );
  }

  return runId;
};

export interface RunProblemParams {
  problemId: string;
  language: string;
  sourceCode: string;
}

export const runProblem = async ({
  problemId,
  language,
  sourceCode,
}: RunProblemParams): Promise<string> => {
  const response = await apiFetch(
    `${API_BASE}/submissions/run-problem`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId,
        language,
        sourceCode,
      }),
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Lỗi máy chủ (${response.status})`
    );
  }

  const runId =
    data.runId ||
    data.data?.runId;

  if (!runId) {
    throw new Error(
      'Không tìm thấy runId.'
    );
  }

  return runId;
};

export const getRunStatus = async (
  runId: string
) => {
  const response = await apiFetch(
    `${API_BASE}/submissions/run-status/${runId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
};
