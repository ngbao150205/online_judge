const API_BASE = 'http://localhost:5001/api';

export interface SubmitCodeParams {
  problemId: string;
  language: string;
  sourceCode: string;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

export const submitCode = async ({
  problemId,
  language,
  sourceCode,
}: SubmitCodeParams): Promise<string> => {
  const response = await fetch(
    `${API_BASE}/submissions`,
    {
      method: 'POST',
      headers: getHeaders(),
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
  const response = await fetch(
    `${API_BASE}/submissions/${submissionId}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
};