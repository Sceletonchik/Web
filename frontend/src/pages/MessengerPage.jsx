import useStore from '../store'
import { useSync } from '../hooks/useSync'
import Sidebar from '../components/Sidebar'
import ChatPanel from '../components/ChatPanel'
import * as mx from '../api/matrix'

export default function MessengerPage() {
  const { homeserver, accessToken, userId, clearAuth } = useStore()

  // Boot sync loop
  mx.setConfig(homeserver, accessToken, userId)
  useSync()

  async function handleLogout() {
    try { await mx.logout() } catch {}
    clearAuth()
  }

  return (
    <div className="h-full flex bg-slate-900 text-slate-100">
      <Sidebar onLogout={handleLogout} />
      <ChatPanel />
    </div>
  )
}
