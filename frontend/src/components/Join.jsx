import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Join() {
  let [roomId,setRoomId]=useState('')
  const [error,setError]=useState("")
  const navigate=useNavigate()

  const handleJoin=()=>{
     const trimmedRoomId=roomId.trim()
     if(!trimmedRoomId){
      return
     }
     let meetingId = trimmedRoomId
     try {
       const inviteUrl = new URL(trimmedRoomId)
       const match = inviteUrl.pathname.match(/\/meeting\/([^/]+)/)
       if (match) meetingId = decodeURIComponent(match[1])
       else if (/^https?:\/\//i.test(trimmedRoomId)) {
         setError("That link does not look like a VibeMeet invite.")
         return
       }
     } catch {
       // A room ID can be entered directly as well as a full invite URL.
     }
     setError("")
  navigate(`/meeting/${encodeURIComponent(meetingId)}`,{state:{isHost:false}})
  }
  return (
    <div className="join-card">
      <h1>Join meeting</h1>
      <input 
      placeholder='Paste an invite link or enter a room ID'
      type='text'
      value={roomId}
      aria-label="Meeting link or room ID"
      onKeyDown={(event)=>{if(event.key==="Enter") handleJoin()}}
      onChange={(e)=>setRoomId(e.target.value)}
      />
      {error && <p className="join-error" role="alert">{error}</p>}

      <button type="button" onClick={handleJoin}>Join</button>
      
    </div>
  )
}

export default Join
