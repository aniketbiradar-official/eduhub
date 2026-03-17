import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [user, setUser]   = useState(undefined)
  const [role, setRole]   = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setRole(null); return }

      try {
        const userRef  = doc(db, 'users', u.uid)
        console.log('DB:', db, 'UID:', u.uid)  // ← ADD THIS LINE
        const userSnap = await getDocFromServer(userRef)

        if (userSnap.exists()) {
          const data = userSnap.data()
          console.log('USER ROLE FROM FIRESTORE:', data.role)
          setRole(data.role || 'student')
        } else {
          console.log('NO USER DOC FOUND — creating student')
          await setDoc(userRef, {
            uid:       u.uid,
            name:      u.displayName,
            email:     u.email,
            photoURL:  u.photoURL,
            role:      'student',
            createdAt: serverTimestamp(),
          })
          setRole('student')
        }
      } catch (err) {
        console.error('ROLE FETCH ERROR:', err)
        setRole('student')
      }
    })
    return () => unsub()
  }, [])

  if (user === undefined || (user && role === null)) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080a0f', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(255,255,255,0.1)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'14px' }}>Loading...</div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/*"     element={user  ? <Dashboard user={user} role={role} /> : <Navigate to="/login" />} />
    </Routes>
  )
}
