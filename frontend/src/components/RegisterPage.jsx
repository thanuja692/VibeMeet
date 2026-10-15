import { useAuth0 } from '@auth0/auth0-react'

function RegisterPage() {
  const { loginWithRedirect } = useAuth0()

  const handleRegister = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
        prompt: 'login',
      },
    })
  }

  return (
    <div className="auth-panel">
      <span className="auth-kicker">MAKE YOURSELF AT HOME</span>
      <h2>Let's get acquainted.</h2>
      <p>Create an account. Bring your people together. Start with a hello.</p>
      <button className="auth-primary" onClick={handleRegister}>Join VibeMeet <span aria-hidden="true">→</span></button>
    </div>
  )
}

export default RegisterPage
