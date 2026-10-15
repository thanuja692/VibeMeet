import { useEffect, useRef, useState } from "react"
import {
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom"

import { io } from "socket.io-client"
import { useAuth0 } from "@auth0/auth0-react"
import api from "../api"
import ChatWindow from "./ChatWindow"
import AiAssistant from "./AiAssistant"

function MediaStatus({ muted, videoOff }) {
  return (
    <div className="meeting-media-status" role="status">
      <span className={muted ? "media-disabled" : ""}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="13" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
        </svg>
        {muted ? "Muted" : "Mic on"}
      </span>
      <span className={videoOff ? "media-disabled" : ""}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="6" width="13" height="12" rx="3" />
          <path d="m15 10 7-4v12l-7-4z" />
        </svg>
        {videoOff ? "Camera off" : "Camera on"}
      </span>
    </div>
  )
}

function RemoteParticipant({ participant, placeholderImage, onVideoReady }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = participant.stream || null
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [participant.stream])

  return (
    <section className="meeting-video meeting-remote-tile" aria-label="Participant camera">
      <video ref={videoRef} onPlaying={() => onVideoReady(participant.id)} autoPlay playsInline />
      {(participant.videoOff || !participant.videoReady) && <img className="meeting-placeholder" src={placeholderImage} alt={participant.videoOff ? "Participant camera is off" : "Waiting for participant camera"} />}
      <MediaStatus muted={participant.muted} videoOff={participant.videoOff} />
      <span className="meeting-participant-label">Guest {participant.id.slice(0, 5)}</span>
    </section>
  )
}

function MeetingPage() {

  const { getAccessTokenSilently, user } = useAuth0()

  const { roomId } = useParams()

  const location = useLocation()
  const navigate = useNavigate()

  const isHost = location.state?.isHost
  const [teachingMode, setTeachingMode] = useState(location.state?.teachingMode === true)
  const [teachingSource, setTeachingSource] = useState(location.state?.teachingSource || null)
  const teachingContextRef = useRef({ teachingMode, teachingSource })
  teachingContextRef.current = { teachingMode, teachingSource }

  const [connected, setConnected] = useState(false)
  const [chatSocket, setChatSocket] = useState(null)
  const [messages, setMessages] = useState([])
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [participants, setParticipants] = useState([])
  const [mediaError, setMediaError] = useState("")
  const [isMuted,setIsMuted]=useState(false)
  const [isVideoOff,setIsVideoOff]=useState(false)
  const hasOtherParticipant = participants.length > 1
  const [remoteParticipants, setRemoteParticipants] = useState([])
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)
  const copySequence = useRef(0)
  const [isScreenSharing,setIsScreenSharing]=useState(false)
  const screenStreamRef=useRef(null)
  const screenSharePendingRef = useRef(false)
  const [isAllowedToUseAi,setIsAllowedToUseAi]=useState(null)
  const aiPermissionDialog = useRef(null)

  const answerAiPermission = (allowed) => {
    setIsAllowedToUseAi(allowed)
    socketRef.current?.emit("set-ai-permission", allowed)
    aiPermissionDialog.current?.close()
  }
    const [aiMessages,setAiMessages]=useState([
              {
                  role:"assistant",
                  content: location.state?.teachingMode
                    ? "Hi, I’m Millie. Ask me about today’s lesson and I’ll follow your teacher’s material and examples."
                    : "Hi I am Millie. How can I help you"
              },
          ])
            const [isAiOpen,setIsAiOpen]=useState(false)
  const stopScreenShare = async () => {
    const screenStream = screenStreamRef.current
    if (!screenStream) return

    screenStreamRef.current = null
    screenStream.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    setIsScreenSharing(false)

    const localStream = localStreamRef.current
    const cameraTrack = localStream?.getVideoTracks()[0]
    const cameraOff = !cameraTrack || cameraTrack.readyState === "ended" || !cameraTrack.enabled
    socketRef.current?.emit("video-state", cameraOff)
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }

    try {
      const senderUpdates = [...peerConnectionsRef.current.values()].map((connection) => {
        const sender = connection.getSenders().find((item) => item.track?.kind === "video")
        return sender && cameraTrack ? sender.replaceTrack(cameraTrack) : Promise.resolve()
      })
      await Promise.all(senderUpdates)
    } catch (error) {
      setMediaError("Screen sharing stopped, but the camera could not be restored.")
      console.error("Camera restore failed:", error)
    }
  }
  const handleAiOpen = () => {
  if (isHost) {
    setIsAiOpen(true)
    return
  }

  if (isAllowedToUseAi === true) {
    setIsAiOpen(true)
    return
  }

  if (isAllowedToUseAi === false) {
    alert("The host has disabled AI assistant access for participants.")
    return
  }

  alert("AI permission has not been set by the host yet.")
}

  const startScreenShare = async () => {
    const localStream = localStreamRef.current
    if (!localStream || screenStreamRef.current || screenSharePendingRef.current) return
    screenSharePendingRef.current = true
    let screenStream
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      // The user may leave the meeting while the browser picker is open.
      if (localStreamRef.current !== localStream) {
        screenStream.getTracks().forEach((track) => track.stop())
        return
      }
      const screenTrack = screenStream.getVideoTracks()[0]
      await Promise.all([...peerConnectionsRef.current.values()].map((connection) => {
        const sender = connection.getSenders().find((item) => item.track?.kind === "video")
        return sender ? sender.replaceTrack(screenTrack) : Promise.resolve()
      }))

      if (localStreamRef.current !== localStream) {
        screenStream.getTracks().forEach((track) => track.stop())
        return
      }
      screenStreamRef.current = screenStream
      screenTrack.onended = stopScreenShare
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
      setIsScreenSharing(true)
      // video-state describes whether the outgoing video should be hidden.
      socketRef.current?.emit("video-state", false)
      setMediaError("")
    } catch (error) {
      screenStream?.getTracks().forEach((track) => track.stop())
      if (error.name !== "NotAllowedError") {
        setMediaError("Unable to share your screen. Please try again.")
      }
      console.error("Screen sharing failed:", error)
    } finally {
      screenSharePendingRef.current = false
    }
  }

  useEffect(() => {
    if (!copyStatus || copyStatus.error) return
    const timer = setTimeout(() => setCopyStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [copyStatus])
  let [showChatWindow,setShowChatWindow]=useState(false)
  const chatToggleRef = useRef(null)
  const closeChat = () => {
    setShowChatWindow(false)
    chatToggleRef.current?.focus()
  }
  const placeholderImage = `${import.meta.env.BASE_URL}placeholderImg.png`

  const copyMeetingLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meeting/${roomId}`)
      setCopyStatus({ id: ++copySequence.current, error: false })
    } catch {
      setCopyStatus({ id: ++copySequence.current, error: true })
    }
  }

  const localVideoRef = useRef(null)
  const socketRef=useRef(null)
  const localStreamRef=useRef(null)
  const peerConnectionsRef = useRef(new Map())
  const pendingCandidatesRef = useRef(new Map())
  const attendanceSocketRef = useRef(null)
  const updateRemoteParticipant = (id, changes) => {
    setRemoteParticipants((current) => {
      const existing = current.find((participant) => participant.id === id)
      const updated = {
        id,
        stream: null,
        videoOff: false,
        muted: false,
        videoReady: false,
        ...existing,
        ...changes,
      }
      return existing
        ? current.map((participant) => participant.id === id ? updated : participant)
        : [...current, updated]
    })
  }

    const toggleMute=()=>{
      const stream=localStreamRef.current
      if(!stream){
        return
      }
      let newMutedState=!isMuted
      stream.getAudioTracks().forEach((track)=>{
        track.enabled=!newMutedState
      })

      setIsMuted(newMutedState)
      socketRef.current?.emit("mute-state", newMutedState)
    }

    const toggleVideo = async () => {
  const stream = localStreamRef.current
  if (!stream) return

  if (!isVideoOff) {
    // Stop camera capture; microphone keeps working.
    stream.getVideoTracks().forEach((track) => {
      track.stop()
    })

    setIsVideoOff(true)
    socketRef.current?.emit("video-state", !screenStreamRef.current)
    return
  }

  let newTrack

  try {
    // A stopped track cannot restart, so request a new one.
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    })

    newTrack = cameraStream.getVideoTracks()[0]

    // Release the new camera if the call ended while waiting.
    if (localStreamRef.current !== stream) {
      newTrack.stop()
      return
    }

    if (!screenStreamRef.current) {
      await Promise.all([...peerConnectionsRef.current.values()].map((connection) => {
        const sender = connection.getSenders().find((item) => item.track?.kind === "video")
        return sender ? sender.replaceTrack(newTrack) : Promise.resolve()
      }))
    }

    // Update the existing stream used by the local preview.
    stream.getVideoTracks().forEach((track) => {
      stream.removeTrack(track)
    })
    stream.addTrack(newTrack)

    if (localVideoRef.current && !screenStreamRef.current) {
      localVideoRef.current.srcObject = stream
    }

    setMediaError("")
    setIsVideoOff(false)
    socketRef.current?.emit("video-state", false)
  } catch (error) {
    newTrack?.stop()
    setMediaError("Unable to turn the camera on. Check camera permissions.")
    console.error("Camera restart failed:", error)
  }
}

    const endCall=async()=>{
     if (isHost) {
       try {
         const token = await getAccessTokenSilently()
         await api.patch(`/users/meetings/${encodeURIComponent(roomId)}/end`, {}, {
           headers: { Authorization: `Bearer ${token}` },
         })
         socketRef.current?.emit("end-meeting")
       } catch (error) {
         console.error("Could not finish the meeting record:", error.response?.data?.msg || error.message)
       }
     }
     screenStreamRef.current?.getTracks().forEach((track) => {
       track.onended = null
       track.stop()
     })
     screenStreamRef.current = null
     if(localStreamRef.current)
      { localStreamRef.current.getTracks()
      .forEach((track)=>{
        track.stop()
      })
      localStreamRef.current=null
     
    }
     if(socketRef.current){ 
      
      socketRef.current.disconnect()
      socketRef.current=null
    
    }

    peerConnectionsRef.current.forEach((connection) => connection.close())
    peerConnectionsRef.current.clear()
     navigate("/")

    }

  useEffect(() => {

    let localStream = null
    let cancelled = false


    // -----------------------------------------
    // SOCKET
    // -----------------------------------------

    const socket = io(
      import.meta.env.VITE_BACKEND_URL,
      {
        autoConnect: false
      }
    )
    socketRef.current=socket

    // Keep chat history and listeners alive while the chat panel is closed.
    setMessages([])
    setPinnedMessages([])

    const handleChatMessage = (
      receivedMessage
    ) => {

      const newMessage = {

        ...receivedMessage,

        isOwn:
          receivedMessage.socketId ===
          socket.id

      }

      setMessages((prev) => [
        ...prev,
        newMessage
      ])

    }


    const handlePinnedMessage = (
      pinnedMessage
    ) => {

      setPinnedMessages((prev) => {

        // avoid duplicate pins
        const alreadyPinned =
          prev.some(
            (msg) =>
              msg.id === pinnedMessage.id
          )

        if (alreadyPinned) {
          return prev
        }

        return [
          ...prev,
          pinnedMessage
        ]

      })

    }


    const handleUnpinnedMessage = (
      messageId
    ) => {

      setPinnedMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== messageId
        )
      )

    }


    // useful when a participant joins later
    const handlePinnedMessages = (
      pinned
    ) => {

      setPinnedMessages(
        Array.isArray(pinned)
          ? pinned
          : []
      )

    }


    socket.on(
      "chat-message",
      handleChatMessage
    )

    socket.on(
      "message-pinned",
      handlePinnedMessage
    )

    socket.on(
      "message-unpinned",
      handleUnpinnedMessage
    )

    socket.on(
      "pinned-messages",
      handlePinnedMessages
    )
        socket.on("ai-permission", (allowed) => {

    setIsAllowedToUseAi(allowed)

    if (!allowed) {
        setIsAiOpen(false)
    }
   
})

    socket.on("video-state", (participantId, videoOff) => {
      if (participantId !== socket.id) updateRemoteParticipant(participantId, { videoOff })
    })
    socket.on("mute-state", (participantId, muted) => {
      if (participantId !== socket.id) updateRemoteParticipant(participantId, { muted })
    })
      

    // -----------------------------------------
    // CREATE WEBRTC CONNECTION
    // -----------------------------------------

    const createPeerConnection = (remoteSocketId) => {

      const existingConnection = peerConnectionsRef.current.get(remoteSocketId)
      if (existingConnection) return existingConnection

      console.log(
        "Creating peer connection with:",
        remoteSocketId
      )


      const peerConnection =
        new RTCPeerConnection({

          iceServers: [
            {
              urls:
                "stun:stun.l.google.com:19302"
            }
          ]

        })


      peerConnectionsRef.current.set(remoteSocketId, peerConnection)
      updateRemoteParticipant(remoteSocketId, {})


      // -----------------------------------------
      // SEND MY CAMERA + MICROPHONE
      // -----------------------------------------

      localStream
        .getTracks()
        .forEach((track) => {

          peerConnection.addTrack(
            track.kind === "video" ? (screenStreamRef.current?.getVideoTracks()[0] || track) : track,
            localStream
          )

        })


      // -----------------------------------------
      // RECEIVE REMOTE CAMERA + MICROPHONE
      // -----------------------------------------

      peerConnection.ontrack =
        (event) => {

          console.log(
            "Remote stream received"
          )

          const stream = event.streams[0] || new MediaStream([event.track])
          updateRemoteParticipant(remoteSocketId, { stream })

        }


      // -----------------------------------------
      // SEND ICE CANDIDATES
      // -----------------------------------------

      peerConnection.onicecandidate =
        (event) => {

          if (event.candidate) {

            console.log(
              "Sending ICE candidate"
            )


            socket.emit(
              "signal",
              remoteSocketId,
              {
                type: "candidate",
                candidate:
                  event.candidate
              }
            )

          }

        }


      return peerConnection
    }



    // -----------------------------------------
    // CAMERA + MICROPHONE
    // -----------------------------------------

    const startStream = async () => {

      try {

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              video: true,
              audio: true
            })


        if (cancelled) {

          stream
            .getTracks()
            .forEach((track) => {

              track.stop()

            })

          return false
        }


        localStream = stream
        localStreamRef.current=localStream


        console.log(
          "Camera and microphone stream:",
          localStream
        )


        if (localVideoRef.current) {

          localVideoRef.current.srcObject =
            localStream

        }


        return true

      }

      catch (err) {

        if (cancelled) {
          return false
        }


        console.error(
          "Camera/Microphone error:",
          err
        )


        const messages = {

          NotAllowedError:
            "Please allow camera and microphone access.",

          NotFoundError:
            "Camera or microphone was not found.",

          NotReadableError:
            "Unable to access your camera or microphone. Check whether another app is using them."

        }


        setMediaError(
          messages[err.name] ||
          "Unable to start camera or microphone."
        )


        return false
      }

    }



    // -----------------------------------------
    // SOCKET CONNECTED
    // -----------------------------------------

    socket.on(
      "connect",
      () => {

        console.log(
          "Connected with socket ID:",
          socket.id
        )


        setChatSocket(socket)
        setConnected(true)


        if (isHost) {

          console.log(
            "Creating room:",
            roomId
          )


          socket.emit(
            "create-room",
            roomId,
            teachingContextRef.current
          )

        }

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

      }
    )

    socket.on("teaching-context", (context) => {
      setTeachingMode(context?.teachingMode === true)
      setTeachingSource(context?.teachingSource || null)
      if (context?.teachingMode) {
        setAiMessages((current) => current.length === 1 && current[0].role === "assistant"
          ? [{ ...current[0], content: "Hi, I’m Millie. Ask me about today’s lesson and I’ll follow your teacher’s material and examples." }]
          : current)
        if (!isHost && attendanceSocketRef.current !== socket.id) {
          attendanceSocketRef.current = socket.id
          getAccessTokenSilently().then((token) => api.post(
            `/users/meetings/${encodeURIComponent(roomId)}/attendance/join`,
            { socketId: socket.id, name: user?.name || user?.nickname || "Student", email: user?.email || "" },
            { headers: { Authorization: `Bearer ${token}` } },
          )).catch((error) => {
            attendanceSocketRef.current = null
            console.error("Could not record class attendance:", error.response?.data?.msg || error.message)
          })
        }
      }
    })

    socket.on("meeting-ended", () => {
      if (!isHost) void endCall()
    })


    // -----------------------------------------
    // ROOM CREATED
    // -----------------------------------------

    socket.on(
      "room-created",
      (createdRoomId) => {

        console.log(
          "Room successfully created:",
          createdRoomId
        )
        aiPermissionDialog.current?.showModal()

      }
    )



    // -----------------------------------------
    // ROOM ERROR
    // -----------------------------------------

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



    // -----------------------------------------
    // NEW USER
    // -----------------------------------------

    socket.on(
      "new-user",
      async (newUserId, users) => {

        console.log(
          "New user:",
          newUserId
        )

        console.log(
          "Users:",
          users
        )


        setParticipants([...users])
        // Publish the current tracks, including when joining or reconnecting.
        socket.emit("mute-state", localStream.getAudioTracks().every(track => !track.enabled))
        socket.emit("video-state", !screenStreamRef.current && localStream.getVideoTracks().every(track => track.readyState === "ended" || !track.enabled))


        // The server also sends new-user
        // to the newly joined user.
        //
        // That user should NOT create
        // an offer to itself.

        if (newUserId === socket.id) {
          return
        }


        try {

          const peerConnection =
            createPeerConnection(
              newUserId
            )


          // -----------------------------
          // CREATE OFFER
          // -----------------------------

          const offer =
            await peerConnection
              .createOffer()


          await peerConnection
            .setLocalDescription(
              offer
            )


          console.log(
            "Sending offer to:",
            newUserId
          )


          socket.emit(
            "signal",
            newUserId,
            {
              type: "offer",
              offer: offer
            }
          )

        }

        catch (error) {

          console.error(
            "Offer creation error:",
            error
          )

        }

      }
    )



    // -----------------------------------------
    // WEBRTC SIGNALING
    // -----------------------------------------

    socket.on(
      "signal",
      async (fromId, message) => {

        console.log(
          "Signal received:",
          message.type,
          "from:",
          fromId
        )


        try {

          // =============================
          // OFFER RECEIVED
          // =============================

          if (
            message.type === "offer"
          ) {

            console.log(
              "Offer received from:",
              fromId
            )


            const peerConnection =
              createPeerConnection(
                fromId
              )


            // Other person's offer
            await peerConnection
              .setRemoteDescription(
                message.offer
              )
            const queuedCandidates = pendingCandidatesRef.current.get(fromId) || []
            pendingCandidatesRef.current.delete(fromId)
            for (const candidate of queuedCandidates) await peerConnection.addIceCandidate(candidate)


            // Create my response
            const answer =
              await peerConnection
                .createAnswer()


            await peerConnection
              .setLocalDescription(
                answer
              )


            console.log(
              "Sending answer to:",
              fromId
            )


            socket.emit(
              "signal",
              fromId,
              {
                type: "answer",
                answer: answer
              }
            )

          }



          // =============================
          // ANSWER RECEIVED
          // =============================

          else if (
            message.type === "answer"
          ) {

            console.log(
              "Answer received from:",
              fromId
            )


            const peerConnection = peerConnectionsRef.current.get(fromId)
            if (peerConnection) {
              await peerConnection.setRemoteDescription(message.answer)
              const queuedCandidates = pendingCandidatesRef.current.get(fromId) || []
              pendingCandidatesRef.current.delete(fromId)
              for (const candidate of queuedCandidates) await peerConnection.addIceCandidate(candidate)
            }

          }



          // =============================
          // ICE CANDIDATE RECEIVED
          // =============================

          else if (
            message.type ===
            "candidate"
          ) {

            console.log(
              "ICE candidate received from:",
              fromId
            )


            const peerConnection = peerConnectionsRef.current.get(fromId)
            if (peerConnection?.remoteDescription) {
              await peerConnection.addIceCandidate(message.candidate)
            } else {
              const queued = pendingCandidatesRef.current.get(fromId) || []
              queued.push(message.candidate)
              pendingCandidatesRef.current.set(fromId, queued)
            }

          }

        }

        catch (error) {

          console.error(
            "WebRTC signaling error:",
            error
          )

        }

      }
    )



    // -----------------------------------------
    // USER LEFT
    // -----------------------------------------

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
              (id) =>
                id !== socketId
            )
        )


        peerConnectionsRef.current.get(socketId)?.close()
        peerConnectionsRef.current.delete(socketId)
        pendingCandidatesRef.current.delete(socketId)
        setRemoteParticipants((current) => current.filter((participant) => participant.id !== socketId))

      }
    )



    // -----------------------------------------
    // SOCKET DISCONNECTED
    // -----------------------------------------

    socket.on(
      "disconnect",
      () => {

        console.log(
          "Disconnected from server"
        )

        setConnected(false)
        attendanceSocketRef.current = null

      }
    )



    // -----------------------------------------
    // START EVERYTHING
    // -----------------------------------------

    const startMeeting = async () => {

      const mediaStarted =
        await startStream()


      if (
        !mediaStarted ||
        cancelled
      ) {
        return
      }


      // Only connect to socket AFTER
      // camera/mic is ready.

      socket.connect()

    }


    startMeeting()



    // -----------------------------------------
    // CLEANUP
    // -----------------------------------------

    return () => {

      cancelled = true
      socket.off(
        "chat-message",
        handleChatMessage
      )

      socket.off(
        "message-pinned",
        handlePinnedMessage
      )

      socket.off(
        "message-unpinned",
        handleUnpinnedMessage
      )

      socket.off(
        "pinned-messages",
        handlePinnedMessages
      )

      screenStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null
        track.stop()
      })
      screenStreamRef.current = null
      localStreamRef.current = null


      socket.disconnect()


      peerConnectionsRef.current.forEach((connection) => connection.close())
      peerConnectionsRef.current.clear()
      pendingCandidatesRef.current.clear()


      if (localStream) {

        localStream
          .getTracks()
          .forEach((track) => {

            track.stop()

          })

      }

    }

  }, [roomId, isHost, navigate, getAccessTokenSilently, user])



  return (

    <div className={`meeting ${hasOtherParticipant ? "meeting-split" : "meeting-solo"}`}>

      <header className="meeting-header">
        <div className="meeting-title-group">
          <span className={`meeting-connection-dot${connected ? " is-connected" : ""}`} aria-hidden="true" />
          <div><h1>{location.state?.meetingTitle || "Meeting room"}</h1><span>{connected ? "Connected" : "Connecting to your meeting…"}</span></div>
        </div>
        <div className="meeting-header-actions">
          <span className="meeting-participant-count" aria-label={`${participants.length} participants`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6" /></svg>
            {participants.length}
          </span>
          {isHost && <>
            <span className="meeting-room-code">Room <strong>{roomId.slice(0, 8)}</strong></span>
            <button type="button" className="meeting-copy" onClick={copyMeetingLink} aria-label="Copy meeting invite link" title="Copy meeting invite link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
              <span>Invite</span>
            </button>
          </>}
        </div>
      </header>

      {mediaError && <p className="meeting-media-error" role="alert">{mediaError}</p>}

      <div className="meeting-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {copyStatus && (
          <div key={copyStatus.id} className={`meeting-toast${copyStatus.error ? " meeting-toast-error" : ""}`}>
            <span className="meeting-toast-icon" aria-hidden="true">{copyStatus.error ? "!" : "🎉"}</span>
            <div className="meeting-toast-message">
              <strong>{copyStatus.error ? "Couldn't copy the invite link" : "Meeting link copied!"}</strong>
              <span>{copyStatus.error ? "Copy the meeting URL from your browser to invite people." : "Paste it, invite your people, and let’s connect."}</span>
            </div>
            <button type="button" className="meeting-toast-close" aria-label="Dismiss notification" onClick={() => setCopyStatus(null)}>×</button>
            {!copyStatus.error && <span className="meeting-toast-progress" aria-hidden="true" />}
          </div>
        )}
      </div>


      <section className="meeting-stage" aria-label="Meeting participants" style={{ "--gallery-columns": Math.min(4, Math.ceil(Math.sqrt(remoteParticipants.length + 1))) }}>
        <section className={`meeting-video meeting-local-tile${isScreenSharing ? " is-screen-sharing" : ""}`} aria-label={isScreenSharing ? "Your shared screen" : "Your camera"}>
          <video ref={localVideoRef} onPlaying={() => setLocalVideoReady(true)} autoPlay muted playsInline />
          {(!isScreenSharing && isVideoOff || !localVideoReady) && <img className="meeting-placeholder" src={placeholderImage} alt={isVideoOff ? "Your camera is off" : "Waiting for your camera"} />}
          <MediaStatus muted={isMuted} videoOff={isVideoOff && !isScreenSharing} />
          <span className="meeting-participant-label">You{isScreenSharing ? " · Sharing screen" : ""}</span>
        </section>
        {remoteParticipants.map((participant) => (
          <RemoteParticipant key={participant.id} participant={participant} placeholderImage={placeholderImage} onVideoReady={(id) => setRemoteParticipants((current) => current.map((item) => item.id === id ? { ...item, videoReady: true } : item))} />
        ))}
      </section>
    <div className="meeting-controls">

  <button
    type="button"
    title={isMuted ? "Unmute microphone" : "Mute microphone"}
    onClick={toggleMute}
  >
    {isMuted && <span className="meeting-control-slash" aria-hidden="true" />}
    {isMuted
      ? "Unmute"
      : "Mute"}
  </button>


  <button
    type="button"
    title={isVideoOff ? "Turn camera on" : "Turn camera off"}
    onClick={toggleVideo}
  >
    {isVideoOff && <span className="meeting-control-slash" aria-hidden="true" />}
    {isVideoOff
      ? "Turn Video On"
      : "Turn Video Off"}
  </button>
  <button
  ref={chatToggleRef}
  type="button"
  aria-expanded={showChatWindow}
  aria-controls="meeting-chat"
  onClick={() =>
    setShowChatWindow((prev) => !prev)
  }
>
  {showChatWindow
    ? "Close Chat"
    : "Chat"}
</button>

  <button
    type="button"
    className="meeting-millie"
    aria-label="Chat with Millie, your AI assistant"
    aria-expanded={isAiOpen}
    title="Chat with Millie"
    onClick={()=>handleAiOpen()}

  >
  AI Chat
  </button>

  <button
    type="button"
    className="meeting-screen-share"
    aria-pressed={isScreenSharing}
    title={isScreenSharing ? "Stop sharing your screen" : "Share your screen"}
    onClick={isScreenSharing ? stopScreenShare : startScreenShare}
  >
    {isScreenSharing ? "Stop Sharing" : "Share Screen"}
  </button>

  <button
    onClick={endCall}
  >
    End Call
  </button>

</div>

  {isAiOpen && <AiAssistant onClose={()=>setIsAiOpen(false)} messages={aiMessages} setMessages={setAiMessages} teachingMode={teachingMode} teachingSource={teachingSource} />}

      {showChatWindow && (
        <ChatWindow
          socket={chatSocket}
          isHost={isHost}
          onClose={closeChat}
          connected={connected}
          messages={messages}
          pinnedMessages={pinnedMessages}
        />
      )}


      <dialog
        ref={aiPermissionDialog}
        className="ai-permission-dialog"
        aria-labelledby="ai-permission-question"
        onCancel={(event) => event.preventDefault()}
      >
        <h2 id="ai-permission-question">Allow participants to use AI chatbot?</h2>
        <div>
          <button type="button" onClick={() => answerAiPermission(true)}>Yes</button>
          <button type="button" onClick={() => answerAiPermission(false)}>No</button>
        </div>
      </dialog>

    </div>

  )
}

export default MeetingPage
