import { Meeting } from "../models/meetingModel.js"
import { User } from "../models/userModel.js"

const currentUserId = (req) => req.auth?.payload?.sub
const cleanText = (value, maxLength, fallback = "") =>
  typeof value === "string" ? value.trim().slice(0, maxLength) || fallback : fallback

export const createMeeting = async (req, res) => {
  const hostAuth0Id = currentUserId(req)
  const { roomId, title, teachingMode, scheduledAt, teachingSource } = req.body || {}
  if (!hostAuth0Id || typeof roomId !== "string" || !roomId.trim()) {
    return res.status(400).json({ msg: "A meeting room ID is required." })
  }

  const date = scheduledAt ? new Date(scheduledAt) : null
  if (scheduledAt && (!Number.isFinite(date.getTime()) || date <= new Date())) {
    return res.status(400).json({ msg: "Choose a future date and time." })
  }

  try {
    const meeting = await Meeting.create({
      roomId: roomId.trim(),
      hostAuth0Id,
      title: cleanText(title, 120, teachingMode ? "Class session" : "Meeting"),
      teachingMode: teachingMode === true,
      teachingSource: teachingMode === true && teachingSource?.content ? teachingSource : null,
      status: date ? "scheduled" : "live",
      scheduledAt: date,
      startedAt: date ? null : new Date(),
    })
    return res.status(201).json({ meeting: meeting.toObject() })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ msg: "This meeting link is already in use. Please try again." })
    console.error("Meeting creation failed:", error.message)
    return res.status(500).json({ msg: "Unable to create this meeting." })
  }
}

export const listMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ hostAuth0Id: currentUserId(req) }).select("-teachingSource")
      .sort({ scheduledAt: -1, createdAt: -1 })
      .lean()
    const summaries = meetings.map(({ attendees = [], ...meeting }) => ({
      ...meeting,
      studentCount: new Set(attendees.map((attendee) => attendee.auth0Id)).size,
    }))
    return res.json({ meetings: summaries })
  } catch (error) {
    console.error("Meeting list failed:", error.message)
    return res.status(500).json({ msg: "Unable to load your meetings." })
  }
}

export const startMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId, hostAuth0Id: currentUserId(req) })
    if (!meeting) return res.status(404).json({ msg: "Meeting not found." })
    if (meeting.status === "ended") return res.status(409).json({ msg: "This meeting has already ended." })
    if (meeting.status === "scheduled" && meeting.scheduledAt > new Date()) {
      return res.status(409).json({ msg: "This meeting is scheduled for a later time." })
    }
    if (meeting.status !== "live") {
      meeting.status = "live"
      meeting.startedAt = new Date()
      meeting.endedAt = null
      await meeting.save()
    }
    return res.json({ meeting: meeting.toObject() })
  } catch (error) {
    console.error("Meeting start failed:", error.message)
    return res.status(500).json({ msg: "Unable to start this meeting." })
  }
}

export const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId, hostAuth0Id: currentUserId(req) })
    if (!meeting) return res.status(404).json({ msg: "Meeting not found." })
    const endedAt = meeting.endedAt || new Date()
    meeting.status = "ended"
    meeting.endedAt = endedAt
    for (const attendee of meeting.attendees) {
      for (const session of attendee.sessions) {
        if (!session.leftAt) {
          session.leftAt = endedAt
          session.durationSeconds = Math.max(0, Math.floor((endedAt - session.joinedAt) / 1000))
        }
      }
    }
    await meeting.save()
    return res.json({ meeting: meeting.toObject() })
  } catch (error) {
    console.error("Meeting end failed:", error.message)
    return res.status(500).json({ msg: "Unable to finish this meeting." })
  }
}

export const joinAttendance = async (req, res) => {
  const auth0Id = currentUserId(req)
  const { socketId } = req.body || {}
  if (!auth0Id || typeof socketId !== "string" || !socketId.trim()) {
    return res.status(400).json({ msg: "A connected participant is required." })
  }
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId, status: "live", teachingMode: true })
    if (!meeting) return res.status(404).json({ msg: "This teaching session is not available for attendance." })
    if (meeting.hostAuth0Id === auth0Id) return res.json({ tracked: false })

    let attendee = meeting.attendees.find((entry) => entry.auth0Id === auth0Id)
    if (!attendee) {
      const profile = await User.findOne({ auth0Id }).lean()
      attendee = {
        auth0Id,
        name: cleanText(profile?.name || req.body?.name, 120, "Student"),
        email: cleanText(profile?.email || req.body?.email, 254),
        sessions: [],
      }
      meeting.attendees.push(attendee)
      attendee = meeting.attendees[meeting.attendees.length - 1]
    }

    const existingSession = attendee.sessions.find((session) => session.socketId === socketId)
    if (!existingSession) {
      attendee.sessions.push({ socketId: socketId.trim(), joinedAt: new Date(), leftAt: null, durationSeconds: 0 })
      await meeting.save()
    }
    return res.json({ tracked: true })
  } catch (error) {
    console.error("Attendance join failed:", error.message)
    return res.status(500).json({ msg: "Unable to record attendance." })
  }
}

export const getAttendance = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
      hostAuth0Id: currentUserId(req),
      teachingMode: true,
    }).lean()
    if (!meeting) return res.status(404).json({ msg: "Teaching meeting not found." })

    const now = new Date()
    const sessions = []
    for (const attendee of meeting.attendees || []) {
      for (const session of attendee.sessions || []) {
        const leftAt = session.leftAt || (meeting.status === "ended" ? meeting.endedAt : null)
        const elapsed = leftAt
          ? session.durationSeconds || Math.floor((new Date(leftAt) - new Date(session.joinedAt)) / 1000)
          : Math.floor((now - new Date(session.joinedAt)) / 1000)
        sessions.push({
          studentName: attendee.name,
          email: attendee.email,
          joinedAt: session.joinedAt,
          leftAt,
          durationSeconds: Math.max(0, elapsed),
        })
      }
    }
    sessions.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))
    return res.json({
      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        status: meeting.status,
        scheduledAt: meeting.scheduledAt,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
      },
      studentCount: new Set((meeting.attendees || []).map((attendee) => attendee.auth0Id)).size,
      sessionCount: sessions.length,
      sessions,
    })
  } catch (error) {
    console.error("Attendance report failed:", error.message)
    return res.status(500).json({ msg: "Unable to load this attendance report." })
  }
}

export const closeAttendanceSession = async (socketId) => {
  try {
    const meeting = await Meeting.findOne({
      status: "live",
      "attendees.sessions.socketId": socketId,
      "attendees.sessions.leftAt": null,
    })
    if (!meeting) return
    const leftAt = new Date()
    let changed = false
    for (const attendee of meeting.attendees) {
      const session = attendee.sessions.find((entry) => entry.socketId === socketId && !entry.leftAt)
      if (!session) continue
      session.leftAt = leftAt
      session.durationSeconds = Math.max(0, Math.floor((leftAt - session.joinedAt) / 1000))
      changed = true
    }
    if (changed) await meeting.save()
  } catch (error) {
    console.error("Attendance disconnect update failed:", error.message)
  }
}
