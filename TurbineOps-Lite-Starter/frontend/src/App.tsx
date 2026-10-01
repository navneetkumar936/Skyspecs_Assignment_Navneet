import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './auth';
import Login from './pages/Login';
import Inspections from './pages/Inspections';
import InspectionDetail from './pages/InspectionDetail';
import Turbines from './pages/Turbines';
import FindingsSearch from './pages/FindingsSearch';

function Guard({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, logout } = useAuth();
  return (
    <>
      {user && (
        <nav>
          <NavLink to="/">Inspections</NavLink>
          <NavLink to="/turbines">Turbines</NavLink>
          <span className="spacer" />
          <span>{user.name} ({user.role})</span>
          <button onClick={logout}>Log out</button>
        </nav>
      )}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Inspections /></Guard>} />
          <Route path="/inspections/:id" element={<Guard><InspectionDetail /></Guard>} />
          <Route path="/turbines" element={<Guard><Turbines /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}