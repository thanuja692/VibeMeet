import { useEffect, useRef, useState } from "react"
import "../../public/ChatWindow.css"

function ChatWindow({
  socket,
  isHost,
  onClose,
  connected,
  messages,
  pinnedMessages
}) {

  const [message, setMessage] = useState("")

  // which message's ... menu is currently open
  const [openMenuId, setOpenMenuId] = useState(null)

  // which pinned message is currently displayed
  const [currentPinnedIndex, setCurrentPinnedIndex] =
    useState(0)

  // used temporarily to highlight a message
  const [highlightedMessageId, setHighlightedMessageId] =
    useState(null)

  const listRef = useRef(null)
  const inputRef = useRef(null)


  // ------------------------------------
  // FOCUS INPUT
  // ------------------------------------

  useEffect(() => {
    inputRef.current?.focus()
  }, [])


  // ------------------------------------
  // SCROLL TO NEWEST MESSAGE
  // ------------------------------------

  useEffect(() => {

    if (listRef.current) {

      listRef.current.scrollTop =
        listRef.current.scrollHeight

    }

  }, [messages])


  // ------------------------------------
  // KEEP PIN INDEX VALID
  // ------------------------------------

  useEffect(() => {

    if (pinnedMessages.length === 0) {

      setCurrentPinnedIndex(0)
      return

    }

    if (
      currentPinnedIndex >=
      pinnedMessages.length
    ) {

      setCurrentPinnedIndex(0)

    }

  }, [
    pinnedMessages,
    currentPinnedIndex
  ])


  // ------------------------------------
  // SEND MESSAGE
  // ------------------------------------

  const sendMessage = () => {

    const trimmedMessage =
      message.trim()

    if (!trimmedMessage) {
      return
    }

    if (!socket?.connected) {
      return
    }

    socket.emit(
      "chat-message",
      trimmedMessage,
      isHost
        ? "Host"
        : "Participant"
    )

    setMessage("")

  }


  // ------------------------------------
  // CHECK IF MESSAGE IS PINNED
  // ------------------------------------

  const isMessagePinned = (
    messageId
  ) => {

    return pinnedMessages.some(
      (msg) =>
        msg.id === messageId
    )

  }


  // ------------------------------------
  // PIN / UNPIN MESSAGE
  // ------------------------------------

  const togglePin = (msg) => {

    if (!socket?.connected) {
      return
    }

    const pinned =
      isMessagePinned(msg.id)


    if (pinned) {

      socket.emit(
        "unpin-message",
        msg.id
      )

    }

    else {

      if (pinnedMessages.length >= 5) {

        alert(
          "You can pin only 5 messages."
        )

        return
      }

      socket.emit(
        "pin-message",
        msg.id
      )

    }

    setOpenMenuId(null)

  }


  // ------------------------------------
  // GO TO ORIGINAL MESSAGE
  // ------------------------------------

  const scrollToMessage = (
    messageId
  ) => {

    const element =
      document.getElementById(
        `message-${messageId}`
      )

    if (!element) {
      return
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    })

    setHighlightedMessageId(
      messageId
    )

    setTimeout(() => {

      setHighlightedMessageId(
        null
      )

    }, 1500)

  }


  // ------------------------------------
  // NEXT PINNED MESSAGE
  // ------------------------------------

  const showNextPinnedMessage = () => {

    if (
      pinnedMessages.length <= 1
    ) {
      return
    }

    setCurrentPinnedIndex(
      (prev) =>
        (prev + 1) %
        pinnedMessages.length
    )

  }


  const currentPinnedMessage =
    pinnedMessages[
      currentPinnedIndex
    ]


  return (

    <aside
      className="chat-window"
      id="meeting-chat"
      aria-labelledby="chat-title"

      onKeyDown={(event) => {

        if (
          event.key === "Escape"
        ) {

          if (openMenuId) {

            setOpenMenuId(null)

          }

          else {

            onClose()

          }

        }

      }}
    >

      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <header className="chat-header">

        <div>

          <h2 id="chat-title">
            Meeting chat
          </h2>

          <p>
            Messages are visible to
            everyone in this meeting
          </p>

        </div>


        <button
          type="button"
          className="chat-close"
          onClick={onClose}
          aria-label="Close chat"
          title="Close chat"
        >
          &times;
        </button>

      </header>


      <div className="chat-legend">

        <span>Host</span>

        <span>
          Participant
        </span>

      </div>


      {/* -------------------------------- */}
      {/* PINNED MESSAGE BAR */}
      {/* -------------------------------- */}

      {currentPinnedMessage && (

        <div className="chat-pinned-bar">

          <button
            type="button"
            className="chat-pinned-main"

            onClick={() =>
              scrollToMessage(
                currentPinnedMessage.id
              )
            }
          >

            <span className="chat-pin-icon">
              📌
            </span>


            <span className="chat-pinned-content">

              <strong>
                {currentPinnedMessage.sender}
              </strong>

              <span className="chat-pinned-text">

                {
                  currentPinnedMessage.data
                }

              </span>

            </span>

          </button>


          <button
            type="button"
            className="chat-pinned-next"
            onClick={
              showNextPinnedMessage
            }
            title="Show next pinned message"
          >

            <span>
              {currentPinnedIndex + 1}
              /
              {pinnedMessages.length}
            </span>

            <span>
              ↓
            </span>

          </button>

        </div>

      )}


      {/* -------------------------------- */}
      {/* CHAT MESSAGES */}
      {/* -------------------------------- */}

      <div
        className="chat-messages"
        ref={listRef}
        role="log"
        aria-label="Meeting messages"
        aria-live="polite"
        tabIndex={0}
      >

        {messages.length === 0 ? (

          <div className="chat-empty">

            <strong>
              Start the conversation
            </strong>

            <p>
              Say hello or share a
              thought with everyone.
            </p>

          </div>

        ) : (

          messages.map((msg) => {

            const pinned =
              isMessagePinned(
                msg.id
              )

            return (

              <div
                key={msg.id}

                id={`message-${msg.id}`}

                className={`
                  chat-message
                  ${
                    msg.sender === "Host"
                      ? "chat-host"
                      : "chat-participant"
                  }
                  ${
                    msg.isOwn
                      ? "chat-own"
                      : ""
                  }
                  ${
                    highlightedMessageId
                      === msg.id
                      ? "chat-message-highlight"
                      : ""
                  }
                `}
              >

                {/* MESSAGE HEADER */}

                <div className="chat-message-header">

                  <span className="chat-sender">

                    {
                      msg.sender === "Host"
                        ? "Host"
                        : "Participant"
                    }

                    {
                      msg.isOwn
                        ? " · You"
                        : ""
                    }

                    {
                      pinned
                        ? " · 📌"
                        : ""
                    }

                  </span>


                  {/* THREE DOT MENU */}

                  <div className="chat-message-menu-wrapper">

                    <button
                      type="button"
                      className="chat-message-menu-button"

                      onClick={() => {

                        setOpenMenuId(
                          (prev) =>
                            prev === msg.id
                              ? null
                              : msg.id
                        )

                      }}

                      aria-label="Message options"
                      title="Message options"
                    >

                      ⋯

                    </button>


                    {
                      openMenuId ===
                      msg.id
                      && (

                      <div className="chat-message-menu">

                        <button
                          type="button"

                          onClick={() =>
                            togglePin(msg)
                          }
                        >

                          {
                            pinned
                              ? "Unpin message"
                              : "Pin message"
                          }

                        </button>

                      </div>

                    )}

                  </div>

                </div>


                {/* MESSAGE */}

                <p className="chat-bubble">
                  {msg.data}
                </p>

              </div>

            )

          })

        )}

      </div>


      {/* -------------------------------- */}
      {/* MESSAGE INPUT */}
      {/* -------------------------------- */}

      <form
        className="chat-composer"

        onSubmit={(event) => {

          event.preventDefault()

          sendMessage()

        }}
      >

        <div className="chat-input-row">

       <textarea
  ref={inputRef}
  aria-label="Message"
  placeholder="Write a message…"
  value={message}

  onChange={(event) =>
    setMessage(event.target.value)
  }

  onKeyDown={(event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault()
      sendMessage()
    }
  }}
/>


          <button
            type="submit"
            className="chat-send"

            disabled={
              !connected ||
              !message.trim()
            }

            aria-label="Send message"
            title="Send message"
          >

            <svg
              className="chat-send-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >

              <path
                d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"
              />

            </svg>

          </button>

        </div>


        <p>

          {
            connected
              ? "Press Enter to send"
              : "Waiting for connection…"
          }

        </p>

      </form>

    </aside>

  )

}

export default ChatWindow