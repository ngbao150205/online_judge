import { API_BASE_URL } from '../../../config/api';
import { apiFetch } from '../../../services/api';
const API_BASE = API_BASE_URL;

export interface SubmitCodeParams {
  problemId: string;
  language: string;
  sourceCode: string;
}

export const submitCode = async ({
  problemId,
  language,
  sourceCode,
}: SubmitCodeParams): Promise<string> => {
  const response = await apiFetch(
    `${API_BASE}/submissions`,
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

  const submissionId =
    data.submissionId ||
    data.data?.id ||
    data.id;

  if (!submissionId) {
    throw new Error(
      'Không tìm thấy submissionId.'
    );
  }

  return submissionId;
};

export const getSubmissionStatus = async (
  submissionId: string
) => {
  const response = await apiFetch(
    `${API_BASE}/submissions/${submissionId}`,
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
