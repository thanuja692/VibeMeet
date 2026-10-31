import { useCallback, useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import exportAttendanceXlsx from "../utils/exportAttendanceXlsx"
import "./MeetingsDashboard.css"

const formatDate = (value) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—"

const formatDuration = (seconds) => {
  const minutes = Math.max(0, Math.floor((seconds || 0) / 60))
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

function MeetingsDashboard({ tab }) {
  const { getAccessTokenSilently } = useAuth0()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [busyRoomId, setBusyRoomId] = useState("")
  const [attendanceNotice, setAttendanceNotice] = useState("")
  const [isClearingAttendance, setIsClearingAttendance] = useState(false)
  const [attendanceDeleteTarget, setAttendanceDeleteTarget] = useState(null)

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = await getAccessTokenSilently()
      const response = await api.get("/users/meetings", { headers: { Authorization: `Bearer ${token}` } })
      setMeetings(response.data.meetings || [])
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Could not load your meetings.")
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently])

  useEffect(() => { loadMeetings() }, [loadMeetings, tab])

  const upcoming = meetings.filter((meeting) => meeting.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
  const teachingHistory = meetings.filter((meeting) => meeting.teachingMode && meeting.status !== "scheduled")
    .sort((a, b) => new Date(b.startedAt || b.scheduledAt || b.createdAt) - new Date(a.startedAt || a.scheduledAt || a.createdAt))

  const startScheduledMeeting = async (meeting) => {
    if (new Date(meeting.scheduledAt) > new Date()) return
    setBusyRoomId(meeting.roomId)
    setError("")
    try {
      const token = await getAccessTokenSilently()
      const response = await api.patch(`/users/meetings/${encodeURIComponent(meeting.roomId)}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      navigate(`/meeting/${meeting.roomId}`, { state: { isHost: true, teachingMode: meeting.teachingMode, teachingSource: response.data.meeting.teachingSource, meetingTitle: meeting.title } })
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Could not start this meeting.")
    } finally {
      setBusyRoomId("")
    }
  }

  const openAttendance = async (meeting) => {
    setSelectedMeeting(meeting)
    setReport(null)
    setReportLoading(true)
    setError("")
    try {
      const token = await getAccessTokenSilently()
      const response = await api.get(`/users/meetings/${encodeURIComponent(meeting.roomId)}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setReport(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Could not load the attendance report.")
    } finally {
      setReportLoading(false)
    }
  }

  const reportByRoom = async (roomId) => {
    const meeting = teachingHistory.find((item) => item.roomId === roomId)
    if (meeting) await openAttendance(meeting)
  }

  const clearSelectedAttendance = () => {
    if (selectedMeeting) setAttendanceDeleteTarget(selectedMeeting.roomId)
  }

  const clearAllAttendance = () => setAttendanceDeleteTarget("all")

  const confirmDeleteAttendance = async () => {
    if (!attendanceDeleteTarget) return
    setIsClearingAttendance(true)
    setError("")
    setAttendanceNotice("")
    try {
      const token = await getAccessTokenSilently()
      if (attendanceDeleteTarget === "all") {
        const response = await api.delete("/users/meetings/attendance", { headers: { Authorization: `Bearer ${token}` } })
        setReport((current) => current ? { ...current, sessions: [], studentCount: 0, sessionCount: 0 } : current)
        setMeetings((current) => current.map((meeting) => meeting.teachingMode ? { ...meeting, studentCount: 0 } : meeting))
        setAttendanceNotice(response.data.deletedParticipants
          ? `Deleted attendance for ${response.data.deletedParticipants} participant records across your teaching sessions.`
          : "There were no saved attendance records to delete.")
      } else {
        const response = await api.delete(`/users/meetings/${encodeURIComponent(attendanceDeleteTarget)}/attendance`, { headers: { Authorization: `Bearer ${token}` } })
        setReport((current) => current?.meeting.roomId === attendanceDeleteTarget ? { ...current, sessions: [], studentCount: 0, sessionCount: 0 } : current)
        setMeetings((current) => current.map((meeting) => meeting.roomId === attendanceDeleteTarget ? { ...meeting, studentCount: 0 } : meeting))
        setAttendanceNotice(response.data.deletedParticipants
          ? `Deleted attendance for ${response.data.deletedParticipants} participants in this session.`
          : "There were no saved attendance records for this session.")
      }
      setAttendanceDeleteTarget(null)
    } catch (requestError) {
      setError(requestError.response?.data?.msg || requestError.message || "Could not delete attendance.")
    } finally {
      setIsClearingAttendance(false)
    }
  }

  if (loading) return <section className="meetings-dashboard dashboard-full-panel"><p role="status">Loading your meetings…</p></section>

  return (
    <section className="meetings-dashboard dashboard-full-panel">
      {error && <p className="meetings-error" role="alert">{error}</p>}
      {attendanceNotice && <p className="attendance-notice" role="status">{attendanceNotice}</p>}
      {attendanceDeleteTarget && <div className="attendance-delete-backdrop">
        <section className="attendance-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="attendance-delete-title">
          <span aria-hidden="true">!</span>
          <h2 id="attendance-delete-title">Delete attendance?</h2>
          <p>{attendanceDeleteTarget === "all" ? "This will clear saved attendance from every teaching session." : `This will clear attendance for ${selectedMeeting?.title || "this teaching session"}.`}</p>
          <div>
            <button type="button" className="attendance-delete-cancel" onClick={() => setAttendanceDeleteTarget(null)} disabled={isClearingAttendance}>Cancel</button>
            <button type="button" className="attendance-delete-confirm" onClick={confirmDeleteAttendance} disabled={isClearingAttendance}>{isClearingAttendance ? "Deleting…" : "Delete attendance"}</button>
          </div>
        </section>
      </div>}
      {tab === "upcoming" ? (
        <div className="upcoming-meetings" aria-label="Scheduled meetings">
          {upcoming.length === 0 ? <div className="meetings-empty"><span aria-hidden="true">▦</span><strong>No meetings scheduled</strong><p>When you schedule a session, it will appear here.</p></div> : upcoming.map((meeting) => {
            const startsAt = new Date(meeting.scheduledAt)
            const ready = startsAt <= new Date()
            return <article className="scheduled-meeting-card" key={meeting.roomId}>
              <div className="scheduled-date"><strong>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(startsAt)}</strong><b>{startsAt.getDate()}</b><span>{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(startsAt)}</span></div>
              <div className="scheduled-details"><div className="scheduled-title-row"><h2>{meeting.title}</h2>{meeting.teachingMode && <span className="meeting-type-pill">Teaching</span>}</div><p>{formatDate(meeting.scheduledAt)}</p><small>Room {meeting.roomId.slice(0, 8)}</small></div>
              <button type="button" className="scheduled-start-button" disabled={!ready || busyRoomId === meeting.roomId} onClick={() => startScheduledMeeting(meeting)}>{busyRoomId === meeting.roomId ? "Starting…" : ready ? "Start meeting" : "Not yet"}</button>
            </article>
          })}
        </div>
      ) : (
        <div className="attendance-layout">
          <div className="attendance-meeting-list">
            <div className="attendance-list-heading"><strong>Teaching sessions</strong><span>{teachingHistory.length}</span><button type="button" className="attendance-clear-all" onClick={clearAllAttendance} disabled={isClearingAttendance}>Clear all</button></div>
            {teachingHistory.length === 0 ? <div className="meetings-empty compact"><strong>No class reports yet</strong><p>Attendance reports will appear after students join a teaching session.</p></div> : teachingHistory.map((meeting) => (
              <button type="button" key={meeting.roomId} className={`attendance-meeting-item${selectedMeeting?.roomId === meeting.roomId ? " is-selected" : ""}`} onClick={() => openAttendance(meeting)}>
                <strong>{meeting.title}</strong><span>{formatDate(meeting.startedAt || meeting.scheduledAt || meeting.createdAt)}</span><small>{meeting.studentCount || 0} students · {meeting.status === "live" ? "In progress" : "Ended"}</small>
              </button>
            ))}
          </div>

          <div className="attendance-report">
            {!selectedMeeting ? <div className="meetings-empty"><span aria-hidden="true">✓</span><strong>Select a class session</strong><p>Choose a session to see its student attendance.</p></div> : reportLoading ? <p role="status">Loading attendance…</p> : report && <>
              <div className="attendance-report-heading">
                <div><span className="host-setup-eyebrow">ATTENDANCE REPORT</span><h2>{report.meeting.title}</h2><p>{formatDate(report.meeting.startedAt || report.meeting.scheduledAt)}{report.meeting.status === "live" ? " · In progress" : " · Ended"}</p></div>
                <div className="attendance-report-actions">
                <button type="button" className="attendance-delete-button" onClick={clearSelectedAttendance} disabled={isClearingAttendance}>Delete attendance</button>
                <button type="button" className="attendance-export-button" onClick={() => exportAttendanceXlsx(report)} disabled={!report.sessions.length}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></svg> Download Excel
                </button>
                </div>
              </div>
              <div className="attendance-summary">
                <div><span>Students attended</span><strong>{report.studentCount}</strong></div>
                <div><span>Call joins</span><strong>{report.sessionCount}</strong></div>
                <div><span>Longest participant stay</span><strong>{formatDuration(report.sessions.reduce((longest, session) => Math.max(longest, session.durationSeconds), 0))}</strong></div>
              </div>
              <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead><tr><th>Participant</th><th>First joined</th><th>Last left</th><th>Longest session</th><th>Joins</th><th>Status</th></tr></thead>
                  <tbody>{report.sessions.length === 0 ? <tr><td colSpan="6" className="attendance-table-empty">No students have joined this session yet.</td></tr> : report.sessions.map((session, index) => <tr key={`${session.email}-${session.joinedAt}-${index}`}>
                    <td><strong>{session.studentName}</strong>{session.email && <small>{session.email}</small>}</td>
                    <td>{formatDate(session.joinedAt)}</td><td>{session.leftAt ? formatDate(session.leftAt) : "Still in call"}</td><td>{formatDuration(session.durationSeconds)}</td><td>{session.joinCount}</td>
                    <td><span className={`attendance-status${session.leftAt ? " is-left" : " is-present"}`}>{session.leftAt ? "Left" : "Present"}</span></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <p className="attendance-note">Each participant appears once. Join time is their first arrival, leave time is their latest departure, and duration shows their longest single visit.</p>
            </>}
          </div>
        </div>
      )}
    </section>
  )
}

export default MeetingsDashboard
