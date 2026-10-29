const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...options.headers,
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (error) {
    console.error('[API network error]', {
      url: `${API_BASE_URL}${path}`,
      method: options.method || 'GET',
      message: error.message,
    });

    throw new ApiError(
      `Cannot reach the API for ${options.method || 'GET'} ${path}. Check that the backend is running and the API URL/CORS configuration is correct.`,
      0,
    );
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('The server returned an invalid response.', response.status)
  }

  if (!response.ok) {
    throw new ApiError(payload.error || 'The request could not be completed.', response.status)
  }

  return payload
}
