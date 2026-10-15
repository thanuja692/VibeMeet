import React, { useRef, useState } from "react"
import "../../public/AiAssistant.css"
import api from "../api"
import { useAuth0 } from "@auth0/auth0-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function AiAssistant({ messages, setMessages, onClose, teachingMode = false, teachingSource = null }) {
    const [message, setMessage] = useState("")
     const {getAccessTokenSilently}=useAuth0()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const [panelWidth, setPanelWidth] = useState(420)
    const [isResizing, setIsResizing] = useState(false)
    const resizeStart = useRef(null)

    const resizePanel = (width) => {
        setPanelWidth(Math.min(window.innerWidth, Math.max(320, width)))
    }

    const stopResizing = (event) => {
        resizeStart.current = null
        setIsResizing(false)
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
    }

    const inputRef = useRef(null)
    const inputFileRef = useRef(null)

    const [imagePreview, setImagePreview] = useState("")
    const [selectedImage, setSelectedImage] = useState(null)
 
    const handleImageChange = (event) => {
        const file = event.target.files[0]

        if (!file) {
            return
        }

        setSelectedImage(file)

        const reader = new FileReader()

        reader.onload = () => {
            setImagePreview(reader.result)
        }

        reader.readAsDataURL(file)
    }

    const removeImage = () => {
        setSelectedImage(null)
        setImagePreview("")

        if (inputFileRef.current) {
            inputFileRef.current.value = ""
        }
    }

    const sendMessage = async () => {
        const trimmed = message.trim()
      

        if ((trimmed === "" && !selectedImage) || loading) {
            return
        }

        const userMessage = {
            role: "user",
            content: trimmed,
            image: imagePreview || null
        }

        setMessages((prev) => [...prev, userMessage])

        setLoading(true)
        setError(false)
        setMessage("")

        const formData = new FormData()
        formData.append("message", trimmed)
        if (teachingMode) {
            formData.append("teachingMode", "true")
            if (teachingSource?.type === "text") formData.append("teachingSource", teachingSource.content)
            if (teachingSource?.type === "image") {
                const [metadata, base64] = teachingSource.content.split(",")
                const mimeType = metadata.match(/data:(.*?);base64/)?.[1] || "image/png"
                const binary = atob(base64)
                const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
                formData.append("teachingImage", new Blob([bytes], { type: mimeType }), "lesson-image")
            }
        }

        if (selectedImage) {
            formData.append("image", selectedImage)
        }

        try {
          const token = await getAccessTokenSilently()

const response = await api.post("/users/aiChat", formData, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

            const aiMessage = {
                role: "assistant",
                content: response.data.assistantResponse,
                image: null
            }

            setMessages((prev) => [...prev, aiMessage])

            setMessage("")
            removeImage()
        } catch (err) {
            console.error(err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className={`ai-panel${isResizing ? " ai-panel-resizing" : ""}`}
            style={{ width: `min(${panelWidth}px, 100vw)` }}
        >
            <div
                className="ai-resize-handle"
                role="separator"
                aria-label="Resize Millie chat"
                aria-orientation="vertical"
                aria-valuemin={320}
                aria-valuenow={panelWidth}
                tabIndex={0}
                title="Drag to resize chat"
                onPointerDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    resizeStart.current = {
                        x: event.clientX,
                        width: event.currentTarget.parentElement.getBoundingClientRect().width,
                    }
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setIsResizing(true)
                }}
                onPointerMove={(event) => {
                    if (!resizeStart.current) return
                    resizePanel(resizeStart.current.width + resizeStart.current.x - event.clientX)
                }}
                onPointerUp={stopResizing}
                onPointerCancel={stopResizing}
                onLostPointerCapture={() => {
                    resizeStart.current = null
                    setIsResizing(false)
                }}
                onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
                    event.preventDefault()
                    const width = event.currentTarget.parentElement.getBoundingClientRect().width
                    resizePanel(width + (event.key === "ArrowLeft" ? 32 : -32))
                }}
            />
            <div className="ai-header">
                <h3>Chat with Millie</h3>
                <button type="button" aria-label="Close Millie chat" onClick={onClose}>&times;</button>
            </div>

            <div className="ai-messages">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={
                            msg.role === "user"
                                ? "user-ai-message"
                                : "assistant-ai-message"
                        }
                    >
                        {msg.image && (
                            <img
                                src={msg.image}
                                alt="Uploaded"
                                className="chat-image"
                            />
                        )}

                        {msg.content && (msg.role=="assistant")?(<div className="ai-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {msg.content}
      </ReactMarkdown>
    </div>):(<p>{msg.content}</p>)}
                    </div>
                ))}

                {loading && (
                    <div className="assistant-ai-message">
                        Thinking...
                    </div>
                )}

                {error && (
                    <div className="assistant-ai-message">
                        Something went wrong
                    </div>
                )}
            </div>

            <div className="ai-composer">
            {imagePreview && (
                <div className="ai-image-preview">
                    <img
                        src={imagePreview}
                        alt="Selected"
                    />

                    <button type="button" aria-label="Remove attached image" onClick={removeImage}>
                        ×
                    </button>
                </div>
            )}

            <input
                type="file"
                ref={inputFileRef}
                onChange={handleImageChange}
                accept="image/*"
                hidden
            />

            <button
                type="button"
                className="ai-attach"
                aria-label="Attach an image"
                onClick={() =>
                    inputFileRef.current?.click()
                }
            >
                +
            </button>

            <textarea
                value={message}
                placeholder="Message Millie..."
                aria-label="Message Millie"
                ref={inputRef}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                    }
                }}
            />

            <button
                type="button"
                className="ai-send"
                onClick={sendMessage}
                disabled={loading}
            >
                Send
            </button>
            </div>
        </div>
    )
}

export default AiAssistant
