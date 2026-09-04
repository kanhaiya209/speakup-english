import { createSlice } from '@reduxjs/toolkit'

/**
 * The part of the voice module that outlives the Practice page: the session that was just
 * saved, and the learner's recent session list.
 *
 * Everything that changes many times a second — recogniser state, interim transcript, which
 * turn it is — stays in the component as local state and refs. Pushing that through Redux
 * would re-render the whole tree on every syllable and buy nothing.
 */

const HISTORY_LIMIT = 10

/**
 * Drops the transcript, the message array and the per-session analysis; the list only ever
 * renders the summary fields, and `fluencyScore` is the flat copy the backend stores at the
 * document root for exactly that purpose.
 */
function toSummary(session) {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSeconds: session.durationSeconds,
    messageCount: session.messageCount,
    userTurnCount: session.userTurnCount,
    userWordCount: session.userWordCount,
    status: session.status,
    recordingKind: session.recordingKind,
    mode: session.mode,
    fluencyScore: session.fluencyScore,
  }
}

const initialState = {
  lastSession: null,
  history: [],
  historyLoaded: false,
}

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    sessionSaved: (state, action) => {
      const session = action.payload
      if (!session) return
      state.lastSession = session

      // A session the learner never spoke in is not saved on the backend either.
      if (session.status !== 'completed') return
      state.history = [
        toSummary(session),
        ...state.history.filter((entry) => entry.sessionId !== session.sessionId),
      ].slice(0, HISTORY_LIMIT)
      state.historyLoaded = true
    },
    historyReceived: (state, action) => {
      state.history = (action.payload || []).slice(0, HISTORY_LIMIT)
      state.historyLoaded = true
    },
    /**
     * Marks the cached list stale. Used when a session was closed by leaving the page, so the
     * saved record exists on the server but never came back through `sessionSaved`.
     */
    historyInvalidated: (state) => {
      state.historyLoaded = false
    },
    clearLastSession: (state) => {
      state.lastSession = null
    },
  },
  extraReducers: (builder) => {
    // One tab, two learners: never let a signed-out user's sessions show up for the next.
    builder.addCase('auth/logout', () => initialState)
  },
})

export const { sessionSaved, historyReceived, historyInvalidated, clearLastSession } =
  voiceSlice.actions
export default voiceSlice.reducer
