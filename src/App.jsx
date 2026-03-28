import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import QuizPage from './pages/QuizPage.jsx'
import GamePage from './pages/GamePage.jsx'

function ProtectedGame() {
  const won = localStorage.getItem('hbdw_quiz_won') === 'true'
  return won ? <GamePage /> : <Navigate to="/quiz" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/game" element={<ProtectedGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
