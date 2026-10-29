import express from 'express'
import { getCommits, getFile, getRepository, getRepositoryDependencyAnalysis } from '../controllers/githubController.js'
import { requireAuth } from '../middleware/auth.js'
import { githubRateLimit } from '../middleware/rateLimiters.js'

const router = express.Router()

router.get('/:owner/:repo/commits', requireAuth, githubRateLimit, getCommits)
router.get('/:owner/:repo/file', requireAuth, githubRateLimit, getFile)
router.get('/:owner/:repo', requireAuth, githubRateLimit, getRepository)
router.get('/:owner/:repo/analysis', requireAuth, githubRateLimit, getRepositoryDependencyAnalysis)
export default router
