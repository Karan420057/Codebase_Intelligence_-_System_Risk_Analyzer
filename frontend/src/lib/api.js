export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

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
