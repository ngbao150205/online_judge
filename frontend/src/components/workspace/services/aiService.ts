import { API_BASE_URL } from '../../../config/api';
import { apiFetch } from '../../../services/api';
const API_BASE = API_BASE_URL;

interface ExplainCodeParams {
  sourceCode: string;
  language: string;
  errorMessage: string;
}

export const explainCode = async ({
  sourceCode,
  language,
  errorMessage,
}: ExplainCodeParams): Promise<string> => {
  const response = await apiFetch(
    `${API_BASE}/ai/explain`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceCode,
        language,
        errorMessage,
      }),
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Lỗi AI (${response.status})`
    );
  }

  return (
    data?.data?.suggestion ||
    data?.suggestion ||
    ''
  );
};
