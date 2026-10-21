import express from 'express'
import { listRepositories } from '../controllers/repositoryController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, listRepositories)

export default router
