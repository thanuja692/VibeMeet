import Logout from './Logout'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="app-navbar" aria-label="Main navigation">
      <div className="navbar-actions">
        <Logout />
      </div>
    </nav>
  )
}

export default Navbar
