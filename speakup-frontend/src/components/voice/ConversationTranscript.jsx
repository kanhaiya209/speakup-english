import { useEffect, useRef } from 'react'

/** How close to the bottom counts as "following along" for auto-scroll purposes. */
const STICK_THRESHOLD_PX = 48

/**
 * The live transcript.
 *
 * Finalised turns are plain text and never change once written. The interim line — what the
 * recogniser thinks is being said right now — is visually separate: italic and in the faint
 * token, so it reads as provisional rather than as something the learner actually said.
 *
 * Scrolling follows new messages only while the learner is already at the bottom; reading
 * back through the conversation is not interrupted.
 */
export default function ConversationTranscript({ messages, interim, isListening }) {
  const scrollRef = useRef(null)
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    const node = scrollRef.current
    if (!node || !stickToBottomRef.current) return
    node.scrollTop = node.scrollHeight
  }, [messages, interim])

  const handleScroll = () => {
    const node = scrollRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    stickToBottomRef.current = distanceFromBottom <= STICK_THRESHOLD_PX
  }

  const isEmpty = messages.length === 0 && !interim

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="max-h-96 overflow-y-auto"
      role="log"
      aria-live="polite"
      aria-label="Conversation transcript"
    >
      {isEmpty ? (
        <p className="text-sm text-muted">
          The conversation will appear here as you and the tutor speak.
        </p>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="grid gap-1 sm:grid-cols-[5.5rem_1fr] sm:gap-4">
              <p className="text-xs text-muted sm:pt-0.5">
                {message.role === 'user' ? 'You' : 'AI Tutor'}
              </p>
              <div>
                <p className="text-sm leading-relaxed text-fg">{message.content}</p>
                {message.kind === 'nudge' && (
                  <p className="mt-1 text-xs text-faint">Prompted after a pause</p>
                )}
              </div>
            </div>
          ))}

          {interim && (
            <div className="grid gap-1 sm:grid-cols-[5.5rem_1fr] sm:gap-4">
              <p className="text-xs text-faint sm:pt-0.5">You</p>
              <p className="text-sm leading-relaxed text-faint italic">{interim}</p>
            </div>
          )}

          {!interim && isListening && (
            <p className="text-xs text-faint">Listening — start speaking whenever you are ready.</p>
          )}
        </div>
      )}
    </div>
  )
}
