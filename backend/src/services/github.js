const githubApiUrl = 'https://api.github.com'

export class GithubApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'GithubApiError'
    this.status = status
  }
}

export function isGithubName(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && /^[\w.-]+$/.test(value)
}

async function githubRequest(path) {
  let response
  try {
    response = await fetch(`${githubApiUrl}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Codebase-Intelligence',
        ...(process.env.GITHUB_TOKEN?.trim()
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
          : {}),
      },
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new GithubApiError('Unable to connect to GitHub. Please try again.', 502)
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new GithubApiError('GitHub returned an invalid response.', 502)
  }

  if (!response.ok) {
    const isRateLimited = response.status === 429
      || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
    const status = isRateLimited ? 429 : response.status === 404 ? 404 : 502
    const message = response.status === 404
      ? 'Repository or file not found. Private repositories require a valid GITHUB_TOKEN.'
      : isRateLimited
        ? 'GitHub API rate limit reached. Please try again later.'
        : `GitHub request failed: ${payload.message || response.statusText}`
    throw new GithubApiError(message, status)
  }

  return { payload, headers: response.headers }
}

export async function fetchGithubCommits(owner, repo, page) {
  const { payload, headers } = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=20&page=${page}`,
  )
  const commits = payload.map((item) => ({
    sha: item.sha,
    message: item.commit.message,
    authorName: item.commit.author?.name || item.committer?.login || 'Unknown author',
    authorLogin: item.author?.login || null,
    authorAvatar: item.author?.avatar_url || null,
    date: item.commit.author?.date || null,
    url: item.html_url,
  }))

  return {
    commits,
    hasMore: headers.get('link')?.includes('rel="next"') || false,
  }
}

async function fetchGithubContributorCount(owner, repo) {
  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const { payload, headers } = await githubRequest(
    `${repositoryPath}/contributors?per_page=1&anon=true`,
  )
  if (!Array.isArray(payload)) {
    throw new GithubApiError('GitHub returned an invalid contributors response.', 502)
  }

  const lastPageLink = headers.get('link')
    ?.split(',')
    .find((link) => /;\s*rel="last"/.test(link))
  const lastPage = lastPageLink?.match(/[?&]page=(\d+)/)
  if (lastPage) return Number(lastPage[1])

  const hasNextPage = headers.get('link')?.includes('rel="next"')
  if (hasNextPage) {
    throw new GithubApiError('GitHub did not return the total contributor count.', 502)
  }

  return payload.length
}

export async function fetchGithubRepository(owner, repo) {
  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const { payload: repository } = await githubRequest(repositoryPath)
  const branchPath = `${repositoryPath}/branches/${encodeURIComponent(repository.default_branch)}`
  const [{ payload: branch }, { commits, hasMore }, contributorCount] = await Promise.all([
    githubRequest(branchPath),
    fetchGithubCommits(owner, repo, 1),
    fetchGithubContributorCount(owner, repo),
  ])
  const treeSha = branch.commit?.commit?.tree?.sha
  if (!treeSha) {
    throw new GithubApiError('GitHub did not return the repository file tree.', 502)
  }

  const { payload: tree } = await githubRequest(
    `${repositoryPath}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`,
  )

  return {
    repository: {
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      url: repository.html_url,
      homepage: repository.homepage,
      owner: {
        login: repository.owner.login,
        avatarUrl: repository.owner.avatar_url,
        url: repository.owner.html_url,
      },
      private: repository.private,
      archived: repository.archived,
      defaultBranch: repository.default_branch,
      language: repository.language,
      stars: repository.stargazers_count,
      contributorCount,
      watchers: repository.watchers_count,
      forks: repository.forks_count,
      openIssues: repository.open_issues_count,
      size: repository.size,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
      pushedAt: repository.pushed_at,
      license: repository.license
        ? { name: repository.license.name, spdxId: repository.license.spdx_id }
        : null,
      topics: repository.topics || [],
    },
    files: (tree.tree || [])
      .filter((item) => item.type === 'blob')
      .map((item) => ({
        path: item.path,
        sha: item.sha,
        size: item.size,
      })),
    filesTruncated: tree.truncated || false,
    commits,
    hasMoreCommits: hasMore,
  }
}

export async function fetchGithubFile(owner, repo, path, ref) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const query = new URLSearchParams()
  if (ref) query.set('ref', ref)
  const { payload: file } = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}${query.size ? `?${query}` : ''}`,
  )
  if (Array.isArray(file) || file.type !== 'file') {
    throw new GithubApiError('The selected path is not a file.', 400)
  }
  if (file.encoding !== 'base64' || typeof file.content !== 'string') {
    throw new GithubApiError('GitHub cannot provide a preview for this file.', 413)
  }

  const content = Buffer.from(file.content, 'base64')
  const isBinary = content.includes(0)
  return {
    path: file.path,
    size: file.size,
    url: file.html_url,
    isBinary,
    content: isBinary ? null : content.toString('utf8'),
  }
}
