import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import api from "../api"
import "./Host.css"

const MAX_SOURCE_SIZE = 4 * 1024 * 1024
const toLocalInputValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

function Host() {
  const navigate = useNavigate()
  const { getAccessTokenSilently } = useAuth0()
  const fileInput = useRef(null)
  const [mode, setMode] = useState("meeting")
  const [source, setSource] = useState(null)
  const [error, setError] = useState("")
  const [isReading, setIsReading] = useState(false)
  const [title, setTitle] = useState("")
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(() => {
    const local = new Date(Date.now() + 60 * 60 * 1000)
    local.setMinutes(Math.ceil(local.getMinutes() / 5) * 5, 0, 0)
    return toLocalInputValue(local)
  })
  const [isSavingMeeting, setIsSavingMeeting] = useState(false)
  const [scheduledMeeting, setScheduledMeeting] = useState(null)

  const chooseSource = async (event) => {
    const file = event.target.files?.[0]
    setError("")
    if (!file) return
    if (file.size > MAX_SOURCE_SIZE) {
      setError("Please choose a file smaller than 4 MB.")
      event.target.value = ""
      return
    }

    try {
      setIsReading(true)
      const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type)
      if (file.type.startsWith("image/") && !isImage) {
        setError("Choose a JPG, PNG, or WebP image.")
        event.target.value = ""
        return
      }
      const extension = file.name.split(".").pop()?.toLowerCase()
      if (!isImage && !file.type.startsWith("text/") && !["txt", "md", "csv", "json", "html", "xml", "pdf", "pptx", "docx"].includes(extension)) {
        setError("Choose an image, PDF, PowerPoint (.pptx), Word (.docx), or text file.")
        event.target.value = ""
        return
      }
      let content
      if (isImage) {
        content = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
      } else if (extension === "pdf") {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString()
        const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
        const pages = await Promise.all(Array.from({ length: document.numPages }, async (_, index) => {
          const page = await document.getPage(index + 1)
          const text = await page.getTextContent()
          return text.items.map((item) => item.str).join(" ")
        }))
        content = pages.map((text, index) => `Page ${index + 1}: ${text}`).join("\n")
      } else if (extension === "docx") {
        const { default: mammoth } = await import("mammoth/mammoth.browser")
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
        content = result.value
      } else if (extension === "pptx") {
        const { default: JSZip } = await import("jszip")
        const archive = await JSZip.loadAsync(await file.arrayBuffer())
        const slidePaths = Object.keys(archive.files)
          .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
          .sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]))
        const slides = await Promise.all(slidePaths.map(async (path, index) => {
          const xml = new DOMParser().parseFromString(await archive.file(path).async("text"), "application/xml")
          const text = Array.from(xml.getElementsByTagName("a:t"), (node) => node.textContent).join(" ")
          return `Slide ${index + 1}: ${text}`
        }))
        content = slides.join("\n")
      } else {
        content = await file.text()
      }
      if (!content.trim()) throw new Error("No readable text was found in this file.")
      setSource({ name: file.name, type: isImage ? "image" : "text", content })
    } catch {
      setError("This file could not be read. Check that it is a supported, unprotected file and try again.")
    } finally {
      setIsReading(false)
    }
  }

  const createMeeting = async (startAt = null) => {
    if (isReading || isSavingMeeting) return
    setError("")
    if (startAt && new Date(startAt) <= new Date()) {
      setError("Choose a date and time in the future.")
      return
    }
    const roomId = crypto.randomUUID()
    setIsSavingMeeting(true)
    try {
      const token = await getAccessTokenSilently()
      const response = await api.post("/users/meetings", {
        roomId,
        title: title.trim() || (mode === "teaching" ? "Class session" : "Meeting"),
        teachingMode: mode === "teaching",
        scheduledAt: startAt ? new Date(startAt).toISOString() : null,
        teachingSource: mode === "teaching" ? source : null,
      }, { headers: { Authorization: `Bearer ${token}` } })
      if (startAt) {
        setScheduledMeeting(response.data.meeting)
        setScheduleOpen(false)
      } else {
        navigate(`/meeting/${roomId}`, {
          state: { isHost: true, teachingMode: mode === "teaching", teachingSource: source, meetingTitle: response.data.meeting.title },
        })
      }
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Could not save this meeting. Please try again.")
    } finally {
      setIsSavingMeeting(false)
    }
  }

  const copyScheduledLink = async () => {
    if (!scheduledMeeting) return
    await navigator.clipboard.writeText(`${window.location.origin}/meeting/${scheduledMeeting.roomId}`)
  }

  return (
    <section className="host-setup" aria-labelledby="host-setup-title">
      <div className="host-setup-heading">
        <div className="host-heading-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 6-3v10l-6-3z"/></svg>
        </div>
        <div><span className="host-setup-eyebrow">GET STARTED</span><h1 id="host-setup-title">Host a meeting</h1><p>Pick a format. You can invite people as soon as your room opens.</p></div>
      </div>

      <label className="host-title-field">
        <span>Meeting name <small>Optional</small></span>
        <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder={mode === "teaching" ? "e.g. Biology · Cell structure" : "e.g. Weekly team check-in"} />
      </label>

      <fieldset className="host-mode-options">
        <legend>Choose a meeting mode</legend>
        <label className={`host-mode-card${mode === "meeting" ? " is-selected" : ""}`}>
          <input type="radio" name="meeting-mode" value="meeting" checked={mode === "meeting"} onChange={() => setMode("meeting")} />
          <span className="host-mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6"/></svg></span>
          <span className="host-mode-copy"><strong>Meeting</strong><small>Open conversation and collaboration</small></span>
        </label>
        <label className={`host-mode-card${mode === "teaching" ? " is-selected" : ""}`}>
          <input type="radio" name="meeting-mode" value="teaching" checked={mode === "teaching"} onChange={() => setMode("teaching")} />
          <span className="host-mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2ZM8 7h8M8 11h6"/></svg></span>
          <span className="host-mode-copy"><strong>Teaching mode</strong><small>Millie follows your lesson and examples</small></span>
        </label>
      </fieldset>

      {mode === "teaching" && (
        <section className="host-source-card" aria-labelledby="host-source-title">
          <div>
            <h2 id="host-source-title">Add lesson material <span>Optional</span></h2>
            <p>Millie will use your examples and lesson notes when answering students.</p>
          </div>
          <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.pptx,.docx,text/*,.txt,.md,.csv,.json,.html,.xml" hidden onChange={chooseSource} />
          {isReading ? (
            <div className="host-source-reading" role="status"><span className="host-reading-spinner" aria-hidden="true" />Reading your lesson material…</div>
          ) : source ? (
            <div className="host-source-selected" role="status">
              <span className="host-source-file-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg></span><span>{source.name}</span>
              <button type="button" onClick={() => { setSource(null); if (fileInput.current) fileInput.current.value = "" }}>Remove</button>
            </div>
          ) : (
            <button className="host-upload-button" type="button" onClick={() => fileInput.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/></svg> Add lesson material
            </button>
          )}
          <small className="host-source-hint">JPG, PNG, WebP, PDF, PPTX, DOCX, or text files up to 4 MB. You can also start without lesson material.</small>
        </section>
      )}

      {scheduleOpen && !scheduledMeeting && (
        <section className="host-schedule-form" aria-labelledby="host-schedule-title">
          <h2 id="host-schedule-title">Choose a date and time</h2>
          <label htmlFor="meeting-scheduled-at">Starts at</label>
          <input id="meeting-scheduled-at" type="datetime-local" min={toLocalInputValue(new Date())} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          <small>Times are shown in your local time zone.</small>
          <button type="button" className="host-confirm-schedule" onClick={() => createMeeting(scheduledAt)} disabled={isSavingMeeting || isReading}>{isSavingMeeting ? "Saving schedule…" : "Confirm schedule"}</button>
        </section>
      )}

      {scheduledMeeting && (
        <section className="host-schedule-success" role="status">
          <strong>Meeting scheduled</strong>
          <span>{scheduledMeeting.title} · {new Date(scheduledMeeting.scheduledAt).toLocaleString()}</span>
          <button type="button" onClick={copyScheduledLink}>Copy invite link</button>
          <button type="button" onClick={() => setScheduledMeeting(null)}>Schedule another</button>
        </section>
      )}

      {error && <p className="host-source-error" role="alert">{error}</p>}

      {!scheduledMeeting && <div className="host-actions">
        <button className="host-start-button" type="button" onClick={() => createMeeting()} disabled={isReading || isSavingMeeting}>
          {isSavingMeeting ? "Starting…" : "Start now"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </button>
        {!scheduleOpen && <button className="host-schedule-toggle" type="button" onClick={() => setScheduleOpen(true)} disabled={isReading || isSavingMeeting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 14v4m-2-2h4"/></svg> Schedule
        </button>}
      </div>}
    </section>
  )
}

export default Host
