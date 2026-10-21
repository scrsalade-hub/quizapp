import React from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { getStoredUser, clearUser } from './api.js';
import Login from './pages/Login.jsx';
import Topics from './pages/Topics.jsx';
import Quiz from './pages/Quiz.jsx';
import Results from './pages/Results.jsx';
import History from './pages/History.jsx';

function RequireAuth({ children }) {
  const user = getStoredUser();
  if (!user?.token) return <Navigate to="/login" replace />;
  return children;
}

export function Header() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const logout = () => {
    clearUser();
    navigate('/login');
  };
  return (
    <header className="app-header">
      <Link className="brand" to="/topics"><span>Quiz</span>App</Link>
      <nav>
        {user && <span className="who">{user.user?.name}</span>}
        <Link to="/history">My History</Link>
        <button className="linklike" onClick={logout}>Logout</button>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/topics" element={<RequireAuth><Topics /></RequireAuth>} />
      <Route path="/quiz/:topicId" element={<RequireAuth><Quiz /></RequireAuth>} />
      <Route path="/results" element={<RequireAuth><Results /></RequireAuth>} />
      <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/topics" replace />} />
    </Routes>
  );
}
