const githubApiUrl = 'https://api.github.com'
const githubRawUrl = 'https://raw.githubusercontent.com'
const sourceExtensions = new Set([
  '.c', '.cc', '.clj', '.cpp', '.cs', '.css', '.cxx', '.dart', '.elm', '.ex',
  '.exs', '.go', '.graphql', '.h', '.hpp', '.hrl', '.hs', '.html', '.java',
  '.jl', '.js', '.jsx', '.kt', '.lua', '.m', '.mdx', '.mm', '.php', '.pl',
  '.pm', '.py', '.r', '.rb', '.rs', '.scala', '.sc', '.sh', '.sql', '.svelte',
  '.swift', '.tf', '.ts', '.tsx', '.vue',
])
const generatedDirectories = new Set([
  '.angular', '.git', '.next', '.nuxt', '.svelte-kit', '.venv', '__pycache__',
  'bin', 'build', 'coverage', 'dist', 'node_modules', 'obj', 'out', 'target',
  'vendor', 'venv',
])
const lineCountConcurrency = 8

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

function isSourceFile(path) {
  const segments = path.toLowerCase().split('/')
  const filename = segments.at(-1)
  const extension = filename.slice(filename.lastIndexOf('.'))

  return !segments.some((segment) => generatedDirectories.has(segment))
    && !filename.includes('.min.')
    && !filename.includes('.generated.')
    && sourceExtensions.has(extension)
}

function countPhysicalLines(content) {
  if (!content) return 0

  const lineBreaks = content.match(/\r\n|\n|\r/g)?.length || 0
  const endsWithLineBreak = /(?:\r\n|\n|\r)$/.test(content)
  return lineBreaks + (endsWithLineBreak ? 0 : 1)
}

async function fetchGithubSourceLineCount(owner, repo, ref, files) {
  const sourceFiles = files.filter((file) => isSourceFile(file.path))
  let nextFileIndex = 0
  let lineCount = 0
  let lineCountError = null

  async function countNextFiles() {
    while (nextFileIndex < sourceFiles.length && !lineCountError) {
      const file = sourceFiles[nextFileIndex]
      nextFileIndex += 1
      const encodedPath = file.path.split('/').map(encodeURIComponent).join('/')

      try {
        const response = await fetch(
          `${githubRawUrl}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${encodedPath}`,
          {
            headers: {
              'User-Agent': 'Codebase-Intelligence',
              ...(process.env.GITHUB_TOKEN?.trim()
                ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
                : {}),
            },
            signal: AbortSignal.timeout(15000),
          },
        )
        if (!response.ok) {
          throw new GithubApiError('Unable to calculate source LOC for the repository.', 502)
        }

        const content = await response.text()
        lineCount += countPhysicalLines(content)
      } catch (error) {
        lineCountError = error instanceof GithubApiError
          ? error
          : new GithubApiError('Unable to calculate source LOC for the repository.', 502)
      }
    }
  }

  const workerCount = Math.min(lineCountConcurrency, sourceFiles.length)
  await Promise.all(Array.from({ length: workerCount }, () => countNextFiles()))
  if (lineCountError) throw lineCountError
  return lineCount
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
  const files = (tree.tree || [])
    .filter((item) => item.type === 'blob')
    .map((item) => ({
      path: item.path,
      sha: item.sha,
      size: item.size,
    }))

  let loc = null
  let locError = null
  if (tree.truncated) {
    locError = 'GitHub shortened the repository file tree, so source LOC cannot be calculated.'
  } else {
    try {
      loc = await fetchGithubSourceLineCount(owner, repo, branch.commit.sha, files)
    } catch (error) {
      locError = error instanceof Error
        ? error.message
        : 'Unable to calculate source LOC for the repository.'
    }
  }

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
    files,
    filesTruncated: tree.truncated || false,
    loc,
    locError,
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
