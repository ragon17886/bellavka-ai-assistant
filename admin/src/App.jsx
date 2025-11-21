import React from 'react'
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom'
import AssistantsPage from './pages/AssistantsPage'
import DialogsPage from './pages/DialogsPage'
import './styles/App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <h1>Bellavka Admin</h1>
          <ul>
            <li><Link to="/">Ассистенты</Link></li>
            <li><Link to="/dialogs">Диалоги</Link></li>
          </ul>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<AssistantsPage />} />
            <Route path="/dialogs" element={<DialogsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App