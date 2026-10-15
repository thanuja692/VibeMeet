import React, { useEffect, useRef, useState } from 'react'

function Simple() {
    const [connected,setConnected]=useState(false)
    const [participants,setParticipants]=useState([])
    const [mediaError,setMediaError]=useState(false)
    const remoteVideoRef=useRef(null)
    const localVideoRef=useRef(null)
    const peerConnectionRef=useRef(null)
    const [messages,setMessages]=[]
    const [message,setMessage]=useState("")
    const inputRef=useRef(null)
    const listRef=useRef(null)

    useEffect(()=>{
        if(inputRef){
            inputRef.current.focus()
        }

    },[])

    useEffect(()=>{
            if(listRef.current){
                listRef.current.scrollTop=listRef.current.scrollHeight
            }
    },[messages])

    

    useEffect(()=>{
        let localStream=null
        let cancelled=null
         const socket=io("socked id",{
        autoConnect:false
         })

   

    const createPeerConnection=(remoteSocketId)=>{

        const peerConnection=new RTCPeerConnection({
            iceServers:[
                {
                    urls:""
                }
            ]
        })

        peerConnectionRef.current=peerConnection
        // we will send ur data first

        localStream.getTracks().forEach((track)=>{
            peerConnection.addTrack(track,localStream)
        })
        //  we will receive their data

        peerConnection.ontrack=(event)=>{
            if(remoteVideoRef.current){
                remoteVideoRef.current.srcObject=event.streams[0]
            }
        }
            // when we select the ice candidate 
        peerConnection.onicecandidate=(event)=>{
            if(event.candidate){

                socket.emit("signal",remoteSocketId,{
                    type:"candidate",
                    candidate:event.candidate
                })
            }
        }

      
        return peerConnection
    }
const startStream=async()=>{
        try{
            const stream=await navigator.mediaDevices.getUserMedia({
                video:true,
                audio:true
            })

            if(cancelled){
                stream.getTracks().forEach((track)=>{
                    track.stop()
                })
                return false
            }
           localStream=stream 
           if(localVideoRef.current){
            localVideoRef.current.srcObject=localStream
           }


        }
        catch(err){
            console.log(err)
        }
    }
    socket.on("connect",()=>{
        setConnected(true)
        if(isHost){
                socket.emit("create-room",roomId)
        }
        else{
                socket.emit("join-room",roomId)
        }
    })

   
     },[])

     const toggleVideo=async()=>{

        if(!isVideoOff){
            stream.getVideoTracks().forEach((track)=>{
                track.stop()
            })
            setIsVideoOff(true)
                return
        }
        let newTrack
        if(!stream){
            return
        }
       cameraStream=await navigator.mediaDevices.getUserMedia({
            video:true,
            audio:true
        })
        newTrack=await cameraStream.getVideoTracks()[0]

        if(localStreamRef?.current!=stream){
            newTrack.stop()
            return
        }

        const videoSender=peerConnectionRef.current.getSenders()
        .find((sender)=>sender.track?.kind=="video")
        if(videoSender){
            await videoSender.replaceTrack(newTrack)
        }

        stream.getVideoTracks().forEach((track)=>{
            stream.removeTrack(track)
        })
        stream.addTrack(newTrack)
        localStreamRef.current=stream

     }
        
     const startStream=async()=>{

        try{
                const stream=await navigator.mediaDevices.getUserMedia({
                    audio:true,
                    video:true
                })
                

        }
        catch(err){

        }
     }

     Object.entries(connections)
     .reduce(([room,found],[roomKey,roomVal])=>{

        if(found==false && roomVal.includes(socket.id)){
            return [roomKey,found]
        }
        return [room,found]

     },["",false])
    
           const startScreenShare=async()=>{
            try{

                const shareStream=await navigator.mediaDevices.getDisplayMedia({
                    video:true
                })

                const shareTrack=shareStream.getTracks()[0]
                const videoSender=await peerConnectionRef.getSenders()
                .find((sender)=>sender?.track.kind=="video")

                if(videoSender){
                    videoSender.replaceTrack(shareTrack)
                }
                if(localVideoRef){
                    localVideoRef.current.srcObject=shareStream
                }

               shareTrack.onended=()=>{
                stopScreenShare()
               }


            }
            catch(err){
                console.log(err)
            }

           }

           const stopScreenShare=async()=>{
            try{
                    const videoStream=await navigator.mediaDevices.getDisplayMedia({
                        video:true
                    })
                    const videoTrack=videoStream.getTracks()[0]

                    const cameraSender=await peerConnectionRef.getSenders()
                    .find((sender))

                    if(cameraSender){
                        cameraSender.replaceTrack(videoTrack)
                    }
                    if(localVideoRef){
                        localVideoRef.current.srcObject=videoStream
                    }


            }
            catch(err){
                console.log(err)
            }
           }

           socket.on("pin-message",(messageId)=>{
            if(!messageId){
                return
            }
                    const [matchingRoom,found]=Object.entries(connections)
                    .reduce(([room,found],[roomKey,roomVal])=>{
                        if(!found && roomVal.includes(socket.id)){
                            return [roomKey,true]
                        }
                        return [room,found]

                    },["",false])

                    if(!found){
                        return
                    }

                    const message=messages[matchingRoom]?.find((msg)=>msg.id===messageId)
                    if(!message){
                        return
                    }

           })


   
  return (
    <div>
      
    </div>
  )
}

export default Simple
