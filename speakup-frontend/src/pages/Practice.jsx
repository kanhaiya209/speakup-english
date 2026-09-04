import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import RecentSessions from '../components/voice/RecentSessions'
import VoiceConversation from '../components/voice/VoiceConversation'

export default function Practice() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Practice</h1>
          <p className="mt-2 text-sm text-muted">
            Talk to your AI tutor out loud. Speaking is the only way to get better at speaking.
          </p>
        </header>

        <div className="space-y-6">
          <VoiceConversation onLeave={() => navigate('/home')} />
          <RecentSessions />
        </div>
      </main>
    </div>
  )
}
