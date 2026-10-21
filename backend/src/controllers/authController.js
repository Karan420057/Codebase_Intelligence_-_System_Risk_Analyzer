import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { regenerateSession, toPublicUser, validateEmail, validateNewPassword, validatePassword } from '../utils/auth.js'
import { sessionCookieName, cookieOptions } from '../middleware/session.js'
import { writeAuditLog } from "../utils/audit.js";

export async function register(request, response) {
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
  }  catch (error) {
    if (error.code === 11000) {
      response.status(409).json({
        error: 'An account with this email already exists.',
      })
      return
    }
    throw error
  }

  // Create a notification for each configured main administrator.
  const adminEmails = [
    process.env.BOOTSTRAP_ADMIN_EMAIL,
    process.env.BOOTSTRAP_ADMIN_EMAIL_2,
  ]
    .filter(Boolean)
    .map((email) => email.trim().toLowerCase())

  try {
    const admins = await User.find({
      role: 'admin',
      email: { $in: adminEmails },
    }).select('_id email')

    console.log('New user registered:', user.email)
    console.log('Configured admin emails:', adminEmails)
    console.log(
      'Admin accounts found for notifications:',
      admins.map((admin) => admin.email),
    )

    if (admins.length > 0) {
      const createdNotifications = await Notification.insertMany(
        admins.map((admin) => ({
          recipient: admin._id,
          actor: user._id,
          type: 'user_registered',
          title: "New account registered",
          message: `${user.name} created an account.`,
        })),
      )

      console.log('Notifications created:', createdNotifications.length)
    } else {
      console.warn('No configured admin accounts were found.')
    }
  } catch (error) {
    console.error('Registration notification failed:', error.message)
  }

  await regenerateSession(request, user.id)
  response.status(201).json({ user: toPublicUser(user) })
}

export async function login(request, response) {
  const { email, password } = request.body ?? {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!validateEmail(normalizedEmail) || !validatePassword(password)) {
    response.status(400).json({ error: 'Enter a valid email and password of at most 72 UTF-8 bytes.' })
    return
  }

  const user = await User.findOne({ email: normalizedEmail })
  .select("+passwordHash");

  const passwordMatches = user && await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    try {
      await writeAuditLog({
        action: "login_failed",
        outcome: "failure",
        targetUser: user?._id ?? null,
        targetEmail: normalizedEmail,
        reason: "Invalid credentials.",
        request,
      });
    } catch (error) {
      console.error("Failed to record login failure:", error.message);
    }

    response.status(401).json({
      error: "Email or password is incorrect.",
    });
    return;
  }

  if (user.status === "suspended" || user.status === "terminated") {
    try {
      await writeAuditLog({
        actor: user._id,
        targetUser: user._id,
        targetEmail: user.email,
        action: "blocked_login",
        outcome: "denied",
        reason: `Account status: ${user.status}.`,
        request,
      });
    } catch (error) {
      console.error("Failed to record blocked login:", error.message);
    }

    response.status(403).json({
      error:
        user.status === "suspended"
          ? "This account is suspended. Contact an administrator."
          : "This account has been terminated.",
      code: `ACCOUNT_${user.status.toUpperCase()}`,
    });
    return;
  }

  await regenerateSession(request, user.id);
  response.json({ user: toPublicUser(user) });
}

export function logout(request, response, next) {
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
}

export function currentUser(request, response) {
  response.json({ user: toPublicUser(request.user) })
}
