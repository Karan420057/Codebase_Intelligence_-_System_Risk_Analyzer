import 'dotenv/config'
import bcrypt from 'bcryptjs'
import MongoStore from 'connect-mongo'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import session from 'express-session'
import helmet from 'helmet'
import mongoose from 'mongoose'
import {
  fetchGithubCommits,
  fetchGithubFile,
  fetchGithubRepository,
  GithubApiError,
  isGithubName,
} from './services/github.js'
import Repository from './models/Repository.js'
import User from './models/User.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const sessionCookieName = 'ci.sid'
const sessionMaxAge = 8 * 60 * 60 * 1000
function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

function validateEmail(email) {
  return typeof email === 'string'
    && email.length <= 254
    && emailPattern.test(email.trim())
}

function validatePassword(password) {
  return typeof password === 'string' && Buffer.byteLength(password, 'utf8') <= 72
}

function validateNewPassword(password) {
  return validatePassword(password) && Array.from(password).length >= 12
}

function regenerateSession(request, userId) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError)
        return
      }

      request.session.userId = userId
      request.session.save((saveError) => {
        if (saveError) {
          reject(saveError)
          return
        }
        resolve()
      })
    })
  })
}

async function bootstrapAdmin() {
  const email = requiredEnvironmentValue('BOOTSTRAP_ADMIN_EMAIL').toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD

  if (!password?.trim()) {
    throw new Error('Missing required environment variable: BOOTSTRAP_ADMIN_PASSWORD')
  }

  if (!validateEmail(email) || !validateNewPassword(password)) {
    throw new Error(
      'Bootstrap admin email must be valid and password must be 12-72 UTF-8 bytes.',
    )
  }

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    if (existingUser.role !== 'admin') {
      throw new Error(
        'Bootstrap admin email belongs to a non-admin account; choose a different email.',
      )
    }
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ name: 'Administrator', email, passwordHash, role: 'admin' })
}

async function startServer() {
  const mongoUri = process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017/'
  const sessionSecret = requiredEnvironmentValue('SESSION_SECRET')
  const port = Number(process.env.PORT || 4000)

  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.')
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.')
  }

  await mongoose.connect(mongoUri)
  await bootstrapAdmin()

  const app = express()
  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: 'sessions',
    ttl: sessionMaxAge / 1000,
  })
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }

  app.disable('x-powered-by')
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }
  app.use(helmet())
  app.use(express.json({ limit: '10kb' }))
  app.use(
    session({
      name: sessionCookieName,
      secret: sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: { ...cookieOptions, maxAge: sessionMaxAge },
    }),
  )

  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Try again later.' },
  })
  const githubRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many GitHub requests. Try again in a minute.' },
  })

  app.post('/api/auth/register', authRateLimit, async (request, response) => {
    const { name, email, password } = request.body ?? {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName = typeof name === 'string' ? name.trim() : ''

    if (
      normalizedName.length < 2
      || normalizedName.length > 80
      || !validateEmail(normalizedEmail)
      || !validateNewPassword(password)
    ) {
      response.status(400).json({
        error: 'Provide a name, a valid email, and a password of 12-72 UTF-8 bytes.',
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    let user
    try {
      user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: 'user',
      })
    } catch (error) {
      if (error.code === 11000) {
        response.status(409).json({ error: 'An account with this email already exists.' })
        return
      }
      throw error
    }

    await regenerateSession(request, user.id)
    response.status(201).json({ user: toPublicUser(user) })
  })

  app.post('/api/auth/login', authRateLimit, async (request, response) => {
    const { email, password } = request.body ?? {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!validateEmail(normalizedEmail) || !validatePassword(password)) {
      response.status(400).json({ error: 'Enter a valid email and password of at most 72 UTF-8 bytes.' })
      return
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash')
    const passwordMatches = user && await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatches) {
      response.status(401).json({ error: 'Email or password is incorrect.' })
      return
    }

    await regenerateSession(request, user.id)
    response.json({ user: toPublicUser(user) })
  })

  app.post('/api/auth/logout', (request, response, next) => {
    if (!request.session) {
      response.clearCookie(sessionCookieName, cookieOptions).json({ success: true })
      return
    }

    request.session.destroy((error) => {
      if (error) {
        next(error)
        return
      }
      response.clearCookie(sessionCookieName, cookieOptions).json({ success: true })
    })
  })

  async function requireAuth(request, response, next) {
    const userId = request.session?.userId
    if (!userId) {
      response.status(401).json({ error: 'Authentication is required.' })
      return
    }

    const user = await User.findById(userId)
    if (!user) {
      response.status(401).json({ error: 'Authentication is required.' })
      return
    }

    request.user = user
    next()
  }

  function requireRole(role) {
    return (request, response, next) => {
      if (request.user.role !== role) {
        response.status(403).json({ error: 'You do not have permission to access this resource.' })
        return
      }
      next()
    }
  }

  app.get('/api/auth/me', requireAuth, (request, response) => {
    response.json({ user: toPublicUser(request.user) })
  })

  app.get('/api/repositories', requireAuth, async (request, response) => {
    const repositories = await Repository.find({ userId: request.user.id })
      .sort({ updatedAt: -1 })
      .select('githubId owner name fullName url description private defaultBranch language stars forks watchers openIssues size pushedAt topics updatedAt')
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
        forks: repository.forks,
        watchers: repository.watchers,
        openIssues: repository.openIssues,
        size: repository.size,
        pushedAt: repository.pushedAt,
        topics: repository.topics,
        savedAt: repository.updatedAt,
      })),
    })
  })

  app.get('/api/github/:owner/:repo', requireAuth, githubRateLimit, async (request, response) => {
    const { owner, repo } = request.params
    if (!isGithubName(owner) || !isGithubName(repo)) {
      response.status(400).json({ error: 'Enter a valid GitHub owner and repository name.' })
      return
    }

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
  })

  app.get(
    '/api/github/:owner/:repo/commits',
    requireAuth,
    githubRateLimit,
    async (request, response) => {
      const { owner, repo } = request.params
      const page = Number(request.query.page)
      if (!isGithubName(owner) || !isGithubName(repo)) {
        response.status(400).json({ error: 'Enter a valid GitHub owner and repository name.' })
        return
      }
      if (!Number.isInteger(page) || page < 2 || page > 1000) {
        response.status(400).json({ error: 'Commit page must be a number between 2 and 1000.' })
        return
      }

      response.json(await fetchGithubCommits(owner, repo, page))
    },
  )

  app.get(
    '/api/github/:owner/:repo/file',
    requireAuth,
    githubRateLimit,
    async (request, response) => {
      const { owner, repo } = request.params
      const path = request.query.path
      const ref = request.query.ref
      if (!isGithubName(owner) || !isGithubName(repo)) {
        response.status(400).json({ error: 'Enter a valid GitHub owner and repository name.' })
        return
      }
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
    },
  )

  app.get(
    '/api/admin/users',
    requireAuth,
    requireRole('admin'),
    async (request, response) => {
      const users = await User.find()
        .select('name email role')
        .sort({ createdAt: -1 })
      response.json({ users: users.map(toPublicUser) })
    },
  )

  app.use((error, request, response, next) => {
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
  })

  app.listen(port, () => {
    console.log(`Codebase Intelligence API listening on port ${port}`)
  })
}

startServer().catch(async (error) => {
  console.error('Unable to start the API server:', error.message)
  await mongoose.disconnect()
  process.exitCode = 1
})
