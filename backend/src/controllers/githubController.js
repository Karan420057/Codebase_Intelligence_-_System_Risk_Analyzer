import Repository from '../models/Repository.js'
import {
  fetchGithubCommits,
  fetchGithubFile,
  fetchGithubRepository,
  isGithubName,
} from '../services/github.js'

function validateRepositoryName(owner, repo, response) {
  if (!isGithubName(owner) || !isGithubName(repo)) {
    response.status(400).json({ error: 'Enter a valid GitHub owner and repository name.' })
    return false
  }
  return true
}

export async function getRepository(request, response) {
  const { owner, repo } = request.params
  if (!validateRepositoryName(owner, repo, response)) return

  const result = await fetchGithubRepository(owner, repo)
  await Repository.findOneAndUpdate(
    { userId: request.user.id, githubId: result.repository.id },
    {
      $set: {
        owner: result.repository.owner.login,
        name: result.repository.name,
        fullName: result.repository.fullName,
        url: result.repository.url,
        description: result.repository.description || '',
        private: result.repository.private,
        defaultBranch: result.repository.defaultBranch,
        language: result.repository.language,
        stars: result.repository.stars,
        contributorCount: result.repository.contributorCount,
        forks: result.repository.forks,
        watchers: result.repository.watchers,
        openIssues: result.repository.openIssues,
        size: result.repository.size,
        pushedAt: result.repository.pushedAt,
        topics: result.repository.topics,
      },
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  )
  response.json(result)
}

export async function getCommits(request, response) {
  const { owner, repo } = request.params
  const page = Number(request.query.page)
  if (!validateRepositoryName(owner, repo, response)) return
  if (!Number.isInteger(page) || page < 2 || page > 1000) {
    response.status(400).json({ error: 'Commit page must be a number between 2 and 1000.' })
    return
  }

  response.json(await fetchGithubCommits(owner, repo, page))
}

export async function getFile(request, response) {
  const { owner, repo } = request.params
  const { path, ref } = request.query
  if (!validateRepositoryName(owner, repo, response)) return
  if (
    typeof path !== 'string'
    || !path
    || path.length > 1024
    || path.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    response.status(400).json({ error: 'Select a valid repository file.' })
    return
  }
  if (ref !== undefined && (typeof ref !== 'string' || ref.length > 255)) {
    response.status(400).json({ error: 'Select a valid repository branch.' })
    return
  }

  response.json(await fetchGithubFile(owner, repo, path, ref))
}
