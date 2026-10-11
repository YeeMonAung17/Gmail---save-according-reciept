export class ApiError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(
      `Cannot reach the backend. Check that it is running.${error instanceof Error && error.name === 'AbortError' ? ' The request was cancelled.' : ''}`,
    );
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'The backend returned an unreadable response. Please try again.',
    );
  }
  if (!response.ok) {
    const details = data as {
      message?: string;
      fields?: Record<string, string>;
    };
    throw new ApiError(
      details.message || 'The request failed. Please try again.',
      details.fields,
    );
  }
  return data as T;
}
