import useStore from './store'
import AuthPage from './pages/AuthPage'
import MessengerPage from './pages/MessengerPage'

export default function App() {
  const accessToken = useStore(s => s.accessToken)
  return accessToken ? <MessengerPage /> : <AuthPage />
}
