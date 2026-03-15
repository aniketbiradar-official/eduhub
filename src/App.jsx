import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useRole } from './useRole'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function AppInner({ user }) {
  const { role, userData } = useRole(user)

  // Still loading role from Firestore
  if (role === null) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#080a0f', flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #6366f1', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading your profile...</div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" />} />
      <Route path="/*" element={<Dashboard user={user} role={role} userData={userData} />} />
    </Routes>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  // Auth loading
  if (user === undefined) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#080a0f',
    }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/*" element={user ? <AppInner user={user} /> : <Navigate to="/login" />} />
    </Routes>
  )
}