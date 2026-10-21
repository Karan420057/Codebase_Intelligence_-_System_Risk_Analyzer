import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'
import githubRoutes from './routes/githubRoutes.js'
import repositoryRoutes from './routes/repositoryRoutes.js'
import { createSessionMiddleware } from './middleware/session.js'
import { errorHandler } from './middleware/errorHandler.js'
import notificationRoutes from './routes/notificationRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js'

export function createApp(mongoClient, sessionSecret) {
  const app = express()

  app.disable('x-powered-by')
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  app.use(helmet())
  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10kb' }))
  app.use(createSessionMiddleware(mongoClient, sessionSecret))

  app.use('/api/auth', authRoutes)
  app.use('/api/repositories', repositoryRoutes)
  app.use('/api/github', githubRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use(errorHandler)

  return app
}
