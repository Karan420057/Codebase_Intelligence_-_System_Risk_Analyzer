import 'dotenv/config'
import mongoose from 'mongoose'
import { createApp } from './app.js'
import { bootstrapAdmin } from './services/bootstrapAdmin.js'

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
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

  const app = createApp(mongoose.connection.getClient(), sessionSecret)
  app.listen(port, () => {
    console.log(`Codebase Intelligence API listening on port ${port}`)
  })
}

startServer().catch(async (error) => {
  console.error('Unable to start the API server:', error.message)
  await mongoose.disconnect()
  process.exitCode = 1
})
