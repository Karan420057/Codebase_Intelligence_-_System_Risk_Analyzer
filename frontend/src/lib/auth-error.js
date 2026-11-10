export function getAuthErrorMessage(error, action) {
  const status = error?.status
  const code = error?.code

  // Network or connection problem
  if (status === 0) {
    return "We couldn't connect to the sign-in service. Please check your internet connection and try again."
  }

  // Invalid form information
  if (status === 400) {
    return action === 'register'
      ? 'Please check your name, email address, and password. Make sure all details meet the required format.'
      : 'Please enter a valid email address and password.'
  }

  // Incorrect login credentials
  if (status === 401) {
    return 'The email address or password you entered is incorrect. Please check your details and try again.'
  }

  // Account access restrictions
  if (status === 403) {
    if (code === 'ACCOUNT_SUSPENDED') {
      return 'Your account is currently suspended. Please contact an administrator for assistance.'
    }

    if (code === 'ACCOUNT_TERMINATED') {
      return 'Your account is no longer active. Please contact an administrator if you need assistance.'
    }

    return "You don't currently have permission to access your account."
  }

  // Existing account
  if (status === 409) {
    return 'An account with this email address already exists. Try signing in instead.'
  }

  // Too many attempts
  if (status === 429) {
    return "You've made too many attempts. Please wait a little while before trying again."
  }

  // Backend/server error
  if (status >= 500) {
    return "Something went wrong on our side. Please try again in a few moments."
  }

  // Fallback
  return action === 'register'
    ? "We couldn't create your account right now. Please try again."
    : "We couldn't sign you in right now. Please try again."
}