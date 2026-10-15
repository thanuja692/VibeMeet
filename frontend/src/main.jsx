import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Auth0Provider } from '@auth0/auth0-react'
import { DashBoardProvider } from './context/DashboardContext.jsx'
import { BrowserRouter } from 'react-router-dom'
createRoot(document.getElementById('root')).render(
  <StrictMode>
   <BrowserRouter>
    <DashBoardProvider>
      <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      cacheLocation="localstorage"
      useRefreshTokensFallback={true}
      authorizationParams={{
         redirect_uri: window.location.origin,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  scope: 'openid profile email',
      }}>
     <App />
    </Auth0Provider>
    </DashBoardProvider>
   </BrowserRouter>
    
   
  </StrictMode>,
)
