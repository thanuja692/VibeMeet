import { useContext } from "react"
import { DashboardContext } from "../context/DashboardContext"
import Sidebar from "./Sidebar"
import Host from "./Host"
import Join from "./Join"
import MeetingsDashboard from "./MeetingsDashboard"
import "./Workspace.css"

const pageCopy = {
  home: ["Your meeting space", "Start a room, set up a class, or join with an invite link."],
  upcoming: ["Upcoming meetings", "Your scheduled sessions, in your local time."],
  attendance: ["Class attendance", "Review who joined each teaching session and how long they stayed connected."],
}

function VideoComponent() {
  const { activeTab, setActiveTab } = useContext(DashboardContext)
  const [title, description] = pageCopy[activeTab] || pageCopy.home

  return (
    <div className="dashboard vibemeet-workspace">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-page-heading">
          <span>VIBEMEET WORKSPACE</span>
          <h1>{activeTab === "home" ? "Your meeting space" : title}</h1>
          <p>{description}</p>
        </header>
        {activeTab === "home" ? <>
          <section className="workspace-shortcuts" aria-label="Your meeting features">
            <button type="button" className="workspace-shortcut is-current" onClick={() => setActiveTab("home")}>
              <span className="workspace-shortcut-icon" aria-hidden="true">＋</span>
              <strong>Create or join</strong><small>Start a meeting or join with an invite.</small>
            </button>
            <button type="button" className="workspace-shortcut" onClick={() => setActiveTab("upcoming")}>
              <span className="workspace-shortcut-icon" aria-hidden="true">▦</span>
              <strong>Upcoming</strong><small>View your scheduled meetings.</small>
            </button>
            <button type="button" className="workspace-shortcut" onClick={() => setActiveTab("attendance")}>
              <span className="workspace-shortcut-icon" aria-hidden="true">✓</span>
              <strong>Attendance</strong><small>Review teaching session attendance.</small>
            </button>
          </section>
          <section className="workspace-quick-actions" aria-label="Start a meeting">
            <h2>Host a meeting</h2>
            <p>Choose meeting or teaching mode, add lesson material, or schedule a session.</p>
            <Host />
          </section>
          <aside className="workspace-join-rail" aria-label="Join a meeting">
            <Join />
          </aside>
        </> : <MeetingsDashboard tab={activeTab} />}
      </main>
    </div>
  )
}

export default VideoComponent
