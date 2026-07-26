import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingScreen } from '@/components/ui/Feedback'
import { useAuth } from '@/features/auth/AuthProvider'
import { isValidEmail } from '@/lib/utils'

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-3 py-14 sm:px-4">
      <div className="mb-6 text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="brand-gradient grid size-10 place-items-center rounded-xl font-display text-lg font-bold text-white">
            U
          </span>
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      <Card elevation="raised">{children}</Card>
      {footer && <div className="mt-5 text-center text-sm text-[var(--text-muted)]">{footer}</div>}
    </div>
  )
}

function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] transition-opacity neu-raised disabled:opacity-50"
    >
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
        />
      </svg>
      Continue with Google
    </button>
  )
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--glass-edge-lo)]" />
      <span className="text-xs text-[var(--text-muted)]">or</span>
      <span className="h-px flex-1 bg-[var(--glass-edge-lo)]" />
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
    >
      {message}
    </p>
  )
}

// ---------------------------------------------------------------------

export function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = params.get('next') ?? '/account/orders'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signInWithPassword(email, password)
      navigate(decodeURIComponent(next), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.')
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track your orders."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-[var(--text-primary)] underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton onClick={() => void signInWithGoogle()} disabled={busy} />
      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <div>
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="mt-1.5 text-right">
            <Link to="/forgot-password" className="text-xs text-[var(--text-muted)] hover:underline">
              Forgot your password?
            </Link>
          </div>
        </div>

        <FormError message={error} />

        <Button type="submit" fullWidth size="lg" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}

// ---------------------------------------------------------------------

export function SignupPage() {
  const { signUpWithPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const next: Record<string, string> = {}
    if (fullName.trim().length < 2) next.fullName = 'Please enter your name.'
    if (!isValidEmail(email)) next.email = 'Please enter a valid email address.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const { needsConfirmation } = await signUpWithPassword(email, password, fullName)
      if (needsConfirmation) setSent(true)
      else navigate('/account/orders', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--success)]/15">
            <Mail className="size-6 text-[var(--success)]" aria-hidden />
          </div>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
            account.
          </p>
          <Link to="/login" className="mt-5 inline-block text-sm underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="You need an account so you can track your orders."
      footer={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-medium text-[var(--text-primary)] underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton onClick={() => void signInWithGoogle()} disabled={busy} />
      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          placeholder="Your name"
        />
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
          placeholder="••••••••"
        />

        <FormError message={error} />

        <Button type="submit" fullWidth size="lg" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}

// ---------------------------------------------------------------------

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will email you a link to set a new one."
      footer={
        <Link to="/login" className="underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-10 text-[var(--success)]" aria-hidden />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <FormError message={error} />
          <Button type="submit" fullWidth size="lg" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

// ---------------------------------------------------------------------

export function ResetPasswordPage() {
  const { updatePassword, status } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')

    setBusy(true)
    try {
      await updatePassword(password)
      navigate('/account/orders', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password.')
      setBusy(false)
    }
  }

  // Supabase puts the user in a recovery session via the emailed link;
  // without it there is nothing to update.
  if (status === 'loading') return <LoadingScreen />

  return (
    <AuthShell title="Set a new password">
      {status === 'unauthenticated' ? (
        <div className="text-center text-sm text-[var(--text-secondary)]">
          <p>This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="mt-3 inline-block underline">
            Request a new one
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 8 characters."
          />
          <Input
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <FormError message={error} />
          <Button type="submit" fullWidth size="lg" loading={busy}>
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

// ---------------------------------------------------------------------

export function AuthCallbackPage() {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // detectSessionInUrl handles the token exchange; just wait for it.
    if (status === 'authenticated') navigate('/account/orders', { replace: true })
    if (status === 'unauthenticated') navigate('/login', { replace: true })
  }, [status, navigate])

  return <LoadingScreen label="Signing you in" />
}
