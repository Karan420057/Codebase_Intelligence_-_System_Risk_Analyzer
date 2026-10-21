const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function toPublicUser(user) {
  return {
    id: String(user._id ?? user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status ?? "active",
  };
}

export function validateEmail(email) {
  return typeof email === 'string'
    && email.length <= 254
    && emailPattern.test(email.trim())
}

export function validatePassword(password) {
  return typeof password === 'string'
    && Buffer.byteLength(password, 'utf8') <= 72
}

export function validateNewPassword(password) {
  return validatePassword(password) && Array.from(password).length >= 12
}

export function regenerateSession(request, userId) {
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
