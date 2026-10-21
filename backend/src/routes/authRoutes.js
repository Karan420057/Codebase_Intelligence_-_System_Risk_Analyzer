import express from 'express'
import { currentUser, login, logout, register } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { authRateLimit } from '../middleware/rateLimiters.js'

const router = express.Router()

router.post('/register', authRateLimit, register)
router.post('/login', authRateLimit, login)
router.post('/logout', logout)
router.get('/me', requireAuth, currentUser)

export default router
