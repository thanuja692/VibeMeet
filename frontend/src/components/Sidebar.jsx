import { useContext } from "react"
import { DashboardContext } from "../context/DashboardContext"
import "./Sidebar.css"

const items = [
  { id: "home", label: "Create or join", icon: "＋" },
  { id: "upcoming", label: "Upcoming", icon: "▦" },
  { id: "attendance", label: "Attendance", icon: "✓" },
]

function Sidebar() {
  const { activeTab, setActiveTab } = useContext(DashboardContext)
  return (
    <aside className="sidebar" aria-label="Meeting dashboard">
      <a href="/" className="workspace-brand" aria-label="VibeMeet home">
        <span className="workspace-brand-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="13" height="14" rx="3"/><path d="m15.5 10 6-3v10l-6-3z"/></svg></span>
        <span>VibeMeet</span>
      </a>
      <span className="sidebar-kicker">YOUR WORKSPACE</span>
      <nav className="sidebar-nav" aria-label="Meeting sections">
        {items.map((item) => (
          <button key={item.id} type="button" className={activeTab === item.id ? "is-active" : ""} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => setActiveTab(item.id)}>
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
