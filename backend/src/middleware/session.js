import MongoStore from 'connect-mongo'
import session from 'express-session'

const sessionMaxAge = 8 * 60 * 60 * 1000
export const sessionCookieName = 'ci.sid'
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function createSessionMiddleware(mongoClient, sessionSecret) {
  const sessionStore = MongoStore.create({
    client: mongoClient,
    collectionName: 'sessions',
    ttl: sessionMaxAge / 1000,
  })

  return session({
    name: sessionCookieName,
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { ...cookieOptions, maxAge: sessionMaxAge },
  })
}
