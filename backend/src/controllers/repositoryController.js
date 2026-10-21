import Repository from '../models/Repository.js'

export async function listRepositories(request, response) {
  const repositories = await Repository.find({ userId: request.user.id })
    .sort({ updatedAt: -1 })
    .select('githubId owner name fullName url description private defaultBranch language stars contributorCount forks watchers openIssues size pushedAt topics updatedAt')
    .lean()

  response.json({
    repositories: repositories.map((repository) => ({
      id: repository.githubId,
      owner: repository.owner,
      name: repository.name,
      fullName: repository.fullName,
      url: repository.url,
      description: repository.description,
      private: repository.private,
      defaultBranch: repository.defaultBranch,
      language: repository.language,
      stars: repository.stars,
      contributorCount: repository.contributorCount,
      forks: repository.forks,
      watchers: repository.watchers,
      openIssues: repository.openIssues,
      size: repository.size,
      pushedAt: repository.pushedAt,
      topics: repository.topics,
      savedAt: repository.updatedAt,
    })),
  })
}
