import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HashRouter } from 'react-router-dom'; // альтернатива для GitHub Pages
import AssistantsPage from './pages/AssistantsPage';
import DialogsPage from './pages/DialogsPage';
import './styles/App.css';

function App() {
  return (
    <HashRouter>
      <div className="app">
        <nav className="sidebar">
          <h1>Bellavka Admin</h1>
          <ul>
            <li><Link to="/assistants">Ассистенты</Link></li>
            <li><Link to="/dialogs">Диалоги</Link></li>
          </ul>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<AssistantsPage />} />
            <Route path="/assistants" element={<AssistantsPage />} />
            <Route path="/dialogs" element={<DialogsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;