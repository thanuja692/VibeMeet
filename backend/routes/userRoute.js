import express from "express"
import { aiChat, saveUser } from "../controllers/userController.js"
import { checkJwt } from "../middlewares/authMiddleware.js"
import { receiveImage } from "../middlewares/receiveImage.js"
import {
  createMeeting,
  endMeeting,
  getAttendance,
  joinAttendance,
  listMeetings,
  startMeeting,
} from "../controllers/meetingController.js"

export const router = express.Router()

router.post("/profile", checkJwt, saveUser)
router.post("/aiChat",checkJwt,receiveImage,aiChat)
router.post("/meetings", checkJwt, createMeeting)
router.get("/meetings", checkJwt, listMeetings)
router.patch("/meetings/:roomId/start", checkJwt, startMeeting)
router.patch("/meetings/:roomId/end", checkJwt, endMeeting)
router.post("/meetings/:roomId/attendance/join", checkJwt, joinAttendance)
router.get("/meetings/:roomId/attendance", checkJwt, getAttendance)
