import { useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/use-auth'

export default function AuthScreen({ mode }) {
  const { authenticate } = useAuth()
  const isRegistering = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await authenticate(isRegistering ? 'register' : 'login', {
        ...(isRegistering ? { name } : {}),
        email,
        password,
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="font-semibold">Codebase Intelligence</h1>
            <p className="text-sm text-muted-foreground">Software Risk Analysis Platform</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">
          {isRegistering ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRegistering
            ? 'Sign up to securely access your codebase workspace.'
            : 'Sign in to continue to your workspace.'}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Name</Label>
              <Input
                id="auth-name"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              minLength={isRegistering ? 12 : undefined}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {isRegistering && (
              <p className="text-xs text-muted-foreground">
                Use 12-72 characters.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <Button className="w-full gap-2" type="submit" disabled={submitting}>
            {submitting
              ? 'Please wait...'
              : isRegistering
                ? 'Create account'
                : 'Sign in'}
            {!submitting && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegistering ? 'Already have an account?' : 'New to Codebase Intelligence?'}{' '}
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href={isRegistering ? '/login' : '/signup'}
          >
            {isRegistering ? 'Sign in' : 'Create an account'}
          </a>
        </p>
      </section>
    </main>
  )
}
