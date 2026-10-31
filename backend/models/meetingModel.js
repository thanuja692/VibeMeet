import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  joinedAt: { type: Date, required: true },
  leftAt: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 },
}, { _id: false })

const attendeeSchema = new mongoose.Schema({
  auth0Id: { type: String, required: true },
  name: { type: String, default: "Student" },
  email: { type: String, default: "" },
  sessions: { type: [sessionSchema], default: [] },
}, { _id: false })

const meetingSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  hostAuth0Id: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  teachingMode: { type: Boolean, default: false },
  teachingSource: { type: mongoose.Schema.Types.Mixed, default: null },
  status: { type: String, enum: ["scheduled", "live", "ended"], required: true },
  scheduledAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  attendanceVersion: { type: Number, default: 2 },
  attendees: { type: [attendeeSchema], default: [] },
}, { timestamps: true })

meetingSchema.index({ hostAuth0Id: 1, scheduledAt: 1 })

export const Meeting = mongoose.model("Meeting", meetingSchema)
