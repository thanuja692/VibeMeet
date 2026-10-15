```jsx
import { useEffect, useRef, useState } from 'react'
import {
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom'
import { io } from 'socket.io-client'

function MeetingPage() {

  const { roomId } = useParams()

  const location = useLocation()
  const navigate = useNavigate()

  const isHost = location.state?.isHost

  const localVideoRef = useRef(null)

  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [mediaError, setMediaError] = useState('')

  useEffect(() => {

    let localStream

    // -----------------------------
    // 1. START CAMERA + MICROPHONE
    // -----------------------------
    const startMedia = async () => {

      try {

        localStream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          })

        console.log(
          "Camera and microphone stream:",
          localStream
        )

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream
        }

      } catch (error) {

        console.error(
          "Camera/Microphone error:",
          error
        )

        setMediaError(
          "Unable to access camera or microphone"
        )
      }
    }

    startMedia()


    // -----------------------------
    // 2. CONNECT TO SOCKET.IO
    // -----------------------------
    const socket =
      io(import.meta.env.VITE_BACKEND_URL)


    socket.on("connect", () => {

      console.log(
        "Connected with socket ID:",
        socket.id
      )

      setConnected(true)


      // Host creates a new room
      if (isHost) {

        console.log(
          "Creating room:",
          roomId
        )

        socket.emit(
          "create-room",
          roomId
        )

      }

      // Normal user joins existing room
      else {

        console.log(
          "Joining room:",
          roomId
        )

        socket.emit(
          "join-call",
          roomId
        )
      }
    })


    // -----------------------------
    // 3. ROOM CREATED
    // -----------------------------
    socket.on(
      "room-created",
      (createdRoomId) => {

        console.log(
          "Room successfully created:",
          createdRoomId
        )

      }
    )


    // -----------------------------
    // 4. ROOM ERROR
    // -----------------------------
    socket.on(
      "room-error",
      (message) => {

        console.log(
          "Room error:",
          message
        )

        alert(message)

        navigate("/")
      }
    )


    // -----------------------------
    // 5. NEW USER JOINED
    // -----------------------------
    socket.on(
      "new-user",
      (newUserId, users) => {

        console.log(
          "New user:",
          newUserId
        )

        console.log(
          "Users in room:",
          users
        )

        setParticipants(users)
      }
    )


    // -----------------------------
    // 6. USER LEFT
    // -----------------------------
    socket.on(
      "user-left",
      (socketId) => {

        console.log(
          "User left:",
          socketId
        )

        setParticipants(
          (prev) =>
            prev.filter(
              (id) => id !== socketId
            )
        )
      }
    )


    // -----------------------------
    // 7. SOCKET DISCONNECTED
    // -----------------------------
    socket.on(
      "disconnect",
      () => {

        console.log(
          "Disconnected from server"
        )

        setConnected(false)
      }
    )


    // -----------------------------
    // 8. CLEANUP
    // -----------------------------
    return () => {

      // disconnect socket
      socket.disconnect()


      // stop camera and microphone
      if (localStream) {

        localStream
          .getTracks()
          .forEach((track) => {

            track.stop()

          })
      }
    }

  }, [roomId, isHost, navigate])


  return (
    <div>

      <h1>Meeting Room</h1>

      <p>
        Room ID: {roomId}
      </p>


      <p>
        Status:
        {connected
          ? " Connected"
          : " Disconnected"}
      </p>


      <p>
        Participants:
        {participants.length}
      </p>


      {mediaError && (
        <p>
          {mediaError}
        </p>
      )}


      <h2>Your Camera</h2>

      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "400px",
          maxWidth: "100%",
          background: "black"
        }}
      />

    </div>
  )
}

export default MeetingPage
```
