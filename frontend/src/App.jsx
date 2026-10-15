import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import HomePage from './components/HomePage'
import Navbar from './components/Navbar'
import useSaveUser from './hooks/useSaveUser'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import MeetingPage from './components/MeetingPage'
import AiAssistant from './components/AiAssistant'

function App() {
  const [showRegister, setShowRegister] = useState(false)
  const { isAuthenticated, isLoading, error } = useAuth0()
  const { profileError, isSaving, retry, requiresSignIn, isRedirecting } = useSaveUser()

  if (isLoading) return <p className="auth-status">Loading...</p>
  if (error) return <p className="auth-status auth-status-error">Authentication failed: {error.message}</p>
  if (isAuthenticated && !requiresSignIn) return (
  <>
    <Navbar />

    {isSaving ? (
      <p role="status">Preparing your account…</p>
    ) : profileError ? (
      <div className="auth-card" role="alert">
        <p>{profileError}</p>
        <button className="auth-primary" onClick={retry}>
          Try again
        </button>
      </div>
    ) : (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/meeting/:roomId" element={<MeetingPage />} />
        <Route path='/aiAssistant' element={<AiAssistant/>} />
      </Routes>
    )}
  </>
)

  return (
    <main className="auth-shell">
      <header className="auth-header">
        <a className="auth-brand" href="/" aria-label="VibeMeet home"><span className="brand-icon" aria-hidden="true">v</span>VibeMeet<span className="brand-dot">.</span></a>
      </header>
      <div className="auth-layout">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <h1 id="auth-story-title">Closer, even<br />from here.</h1>
        <section className="auth-card" aria-label={showRegister && !requiresSignIn ? 'Create your VibeMeet account' : 'Sign in to VibeMeet'}>
          {showRegister && !requiresSignIn ? <RegisterPage /> : (
            <LoginPage onSignIn={requiresSignIn ? retry : undefined} isSigningIn={isRedirecting} />
          )}

          {requiresSignIn && profileError && <p role="alert">{profileError}</p>}

          {!requiresSignIn && <>
          <div className="auth-divider" aria-hidden="true" />
          <p className="auth-switch-label">{showRegister ? 'Already have an account?' : 'First time here?'}</p>
          <button className="auth-switch" onClick={() => setShowRegister(!showRegister)}>
            {showRegister
              ? 'Sign in to your account'
              : 'Create an account'} <span aria-hidden="true">↗</span>
          </button>
          </>}
          <p className="auth-security"><span aria-hidden="true">◇</span> Secure sign-in, powered by Auth0</p>
        </section>
        </section>
        <figure className="auth-photo" aria-label="Friends connecting on VibeMeet">
          <img
            className="auth-phone auth-phone-first"
            src={`${import.meta.env.BASE_URL}frontpageImage.png`}
            alt="A woman smiling during a video call"
            width="941"
            height="1672"
            fetchPriority="high"
          />
          <img
            className="auth-phone auth-phone-second"
            src={`${import.meta.env.BASE_URL}frontPageImage2.png`}
            alt="Her friend smiling on the other end of the video call"
            width="941"
            height="1672"
          />
        </figure>
      </div>
    </main>
  )
}

export default App
