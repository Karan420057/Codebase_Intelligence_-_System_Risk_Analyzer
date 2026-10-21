import { GithubApiError } from '../services/github.js'

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error)
    return
  }

  if (error.status === 400 && error.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Request body must contain valid JSON.' })
    return
  }

  if (error instanceof GithubApiError) {
    if (error.status >= 500) console.error('GitHub API request failed:', error.message)
    response.status(error.status).json({ error: error.message })
    return
  }

  console.error('API request failed:', error.message)
  response.status(500).json({ error: 'An unexpected server error occurred.' })
}
