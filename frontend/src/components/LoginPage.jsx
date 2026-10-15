import { useAuth0 } from '@auth0/auth0-react'

function LoginPage({ onSignIn, isSigningIn = false }) {
  const { loginWithRedirect } = useAuth0()

  const signIn = () => loginWithRedirect({
    appState: { returnTo: `${window.location.pathname}${window.location.search}` },
    authorizationParams: { prompt: 'login' },
  })

  return (
    <div className="auth-panel">
      <span className="auth-kicker">YOUR VIBEMEET ACCOUNT</span>
      <h2>Welcome back.</h2>
      <p>Sign in to catch up with your people. They're only a call away.</p>
      <button className="auth-primary" disabled={isSigningIn} onClick={onSignIn || signIn}>
        Sign in to VibeMeet <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}

export default LoginPage
