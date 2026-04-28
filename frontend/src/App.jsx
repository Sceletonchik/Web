import useStore from './store'
import AuthPage from './pages/AuthPage'
import MessengerPage from './pages/MessengerPage'

export default function App() {
  const token = useStore(s => s.token)
  return token ? <MessengerPage /> : <AuthPage />
}
