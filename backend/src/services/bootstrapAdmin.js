import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { validateEmail, validateNewPassword } from '../utils/auth.js'

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export async function bootstrapAdmin() {
  const admins = [
    {
      email: requiredEnvironmentValue('BOOTSTRAP_ADMIN_EMAIL').toLowerCase(),
      password: requiredEnvironmentValue('BOOTSTRAP_ADMIN_PASSWORD'),
    },
    {
      email: requiredEnvironmentValue('BOOTSTRAP_ADMIN_EMAIL_2').toLowerCase(),
      password: requiredEnvironmentValue('BOOTSTRAP_ADMIN_PASSWORD_2'),
    },
  ]

  if (admins[0].email === admins[1].email) {
    throw new Error('The two admin emails must be different.')
  }

  for (const admin of admins) {
    if (!validateEmail(admin.email) || !validateNewPassword(admin.password)) {
      throw new Error(`Invalid bootstrap admin configuration for ${admin.email}.`)
    }

    const existingUser = await User.findOne({ email: admin.email })
    if (existingUser) {
      if (existingUser.role !== 'admin') {
        throw new Error(
          `The configured admin email ${admin.email} belongs to a non-admin account.`,
        )
      }
      continue
    }

    const passwordHash = await bcrypt.hash(admin.password, 12)
    await User.create({
      name: 'Administrator',
      email: admin.email,
      passwordHash,
      role: 'admin',
    })

    console.log(`Created bootstrap admin: ${admin.email}`)
  }
}
