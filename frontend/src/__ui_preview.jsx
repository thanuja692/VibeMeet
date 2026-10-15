import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Auth0Provider } from "@auth0/auth0-react"
import { DashBoardProvider } from "./context/DashboardContext"
import HomePage from "./components/HomePage"
import Navbar from "./components/Navbar"
import "./index.css"
import "./App.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Auth0Provider domain="preview.us.auth0.com" clientId="vibemeet-preview" authorizationParams={{ redirect_uri: window.location.origin }}>
      <DashBoardProvider>
        <Navbar />
        <HomePage />
      </DashBoardProvider>
    </Auth0Provider>
  </StrictMode>,
)
