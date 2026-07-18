import { useState } from 'react'
import Camera from './components/Camera.tsx'
import SessionsView from './components/SessionsView.tsx'

function App() {
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  const [view, setView] = useState<'camera' | 'analytics'>('camera')

  return (
    <div className="app">
      <header>
        <h1>PostureDot</h1>
        <p>Real-time body data harvester</p>
      </header>
      <nav className="tabs">
        <button className={view === 'camera' ? 'active' : ''} onClick={() => setView('camera')}>Camera</button>
        <button className={view === 'analytics' ? 'active' : ''} onClick={() => setView('analytics')}>Analytics</button>
      </nav>
      <main>
        {view === 'camera' ? <Camera sessionId={sessionId} /> : <SessionsView sessionId={sessionId} />}
      </main>
      <footer>
        <button onClick={() => setSessionId(crypto.randomUUID())}>New Session</button>
        <span>Session: {sessionId.slice(0, 8)}</span>
      </footer>
    </div>
  )
}

export default App
