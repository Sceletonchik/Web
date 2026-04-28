import { useEffect } from 'react'
import useStore from '../store'
import { useSocket } from '../hooks/useSocket'
import * as api from '../api'
import Sidebar from '../components/Sidebar'
import ChatPanel from '../components/ChatPanel'

export default function MessengerPage() {
  const { token, userId, clearAuth, setConversations } = useStore()
  api.setToken(token)
  useSocket()

  useEffect(() => {
    api.getConversations().then(setConversations).catch(() => {})
  }, [])

  async function handleLogout() {
    clearAuth()
  }

  return (
    <div className="h-full flex bg-slate-900 text-slate-100">
      <Sidebar onLogout={handleLogout} />
      <ChatPanel />
    </div>
  )
}
