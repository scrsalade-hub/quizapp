import React from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { getStoredAdmin, clearAdmin } from './api.js';
import Login from './pages/Login.jsx';
import Topics from './pages/Topics.jsx';
import TopicEdit from './pages/TopicEdit.jsx';
import Users from './pages/Users.jsx';
import UserDetail from './pages/UserDetail.jsx';

function RequireAdmin({ children }) {
  const admin = getStoredAdmin();
  if (!admin?.token) return <Navigate to="/login" replace />;
  return children;
}

export function Header() {
  const navigate = useNavigate();
  const logout = () => {
    clearAdmin();
    navigate('/login');
  };
  return (
    <header className="app-header">
      <Link className="brand" to="/topics"><span>Quiz</span>Admin</Link>
      <nav>
        <Link to="/topics">Topics</Link>
        <Link to="/users">Users</Link>
        <button className="linklike" onClick={logout}>Logout</button>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/topics" element={<RequireAdmin><Topics /></RequireAdmin>} />
      <Route path="/topics/new" element={<RequireAdmin><TopicEdit /></RequireAdmin>} />
      <Route path="/topics/:id/edit" element={<RequireAdmin><TopicEdit /></RequireAdmin>} />
      <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
      <Route path="/users/:id" element={<RequireAdmin><UserDetail /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/topics" replace />} />
    </Routes>
  );
}
