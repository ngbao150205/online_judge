const API_BASE = 'http://localhost:5001/api';

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
  const token =
    localStorage.getItem('token');

  const response = await fetch(
    `${API_BASE}/ai/explain`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
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