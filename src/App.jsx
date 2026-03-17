import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function LoadingScreen({ message }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Mono&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .load-root{min-height:100vh;background:#080a0f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;animation:fadeIn 0.4s ease both;background-image:radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:28px 28px}
        .load-logo{width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 0 40px rgba(99,102,241,0.4);animation:float 3s ease-in-out infinite}
        .load-title{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:white}
        .load-spinner{width:32px;height:32px;border:2.5px solid rgba(255,255,255,0.08);border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite}
        .load-msg{font-family:'DM Mono',monospace;font-size:12px;color:rgba(255,255,255,0.25);letter-spacing:0.08em;animation:blink 2s ease-in-out infinite}
      `}</style>
      <div className="load-root">
        <div className="load-logo">📚</div>
        <div className="load-title">EduHub</div>
        <div className="load-spinner"/>
        <div className="load-msg">{message}</div>
      </div>
    </>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined)
  const [role, setRole] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setRole(null); return }
      try {
        const userRef  = doc(db, 'users', u.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setRole(userSnap.data().role || 'student')
          setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(() => {})
        } else {
          await setDoc(userRef, {
            uid: u.uid, name: u.displayName||'Unknown',
            email: u.email||'', photoURL: u.photoURL||'',
            role: 'student', createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
          })
          setRole('student')
        }
      } catch (err) {
        console.error('Role fetch error:', err)
        setRole('student')
      }
    })
    return () => unsub()
  }, [])

  if (user === undefined) return <LoadingScreen message="Authenticating..."/>
  if (user && role === null) return <LoadingScreen message="Loading your profile..."/>

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/*"     element={user  ? <Dashboard user={user} role={role} /> : <Navigate to="/login" />} />
    </Routes>
  )
}
