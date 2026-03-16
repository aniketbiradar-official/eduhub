import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export function useRole(user) {
  const [role, setRole]         = useState(null)
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    if (!user) { setRole(null); return }

    const userRef = doc(db, 'users', user.uid)

    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        // Document exists — always trust what's in Firestore
        setRole(data.role || 'student')
        setUserData(data)

        // Only update lastLogin, never touch the role
        setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(() => {})
      } else {
        // Document truly doesn't exist — create with student role
        // But first double-check with a direct get to avoid race conditions
        try {
          const freshSnap = await getDoc(userRef)
          if (freshSnap.exists()) {
            const data = freshSnap.data()
            setRole(data.role || 'student')
            setUserData(data)
          } else {
            const newUser = {
              uid:       user.uid,
              name:      user.displayName,
              email:     user.email,
              photoURL:  user.photoURL,
              role:      'student',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            }
            await setDoc(userRef, newUser)
            setRole('student')
            setUserData(newUser)
          }
        } catch (err) {
          console.error('useRole error:', err)
          setRole('student')
        }
      }
    }, (err) => {
      console.error('onSnapshot error:', err)
      setRole('student')
    })

    return () => unsub()
  }, [user])

  return { role, userData }
}

export function can(role, action) {
  const permissions = {
    student: [
      'view_notes', 'download_notes',
      'view_announcements',
      'view_timetable',
      'view_syllabus',
      'view_dashboard',
    ],
    cr: [
      'view_notes', 'download_notes', 'upload_notes', 'delete_own_notes',
      'view_announcements', 'post_announcements', 'delete_own_announcements',
      'view_timetable', 'edit_timetable',
      'view_syllabus', 'upload_syllabus',
      'view_dashboard',
      'manage_courses',
    ],
    admin: [
      'view_notes', 'download_notes', 'upload_notes', 'delete_any_notes',
      'view_announcements', 'post_announcements', 'delete_any_announcement',
      'view_timetable', 'edit_timetable',
      'view_syllabus', 'upload_syllabus',
      'view_dashboard',
      'manage_courses',
      'manage_users',
      'promote_users',
    ],
  }
  const perms = permissions[role] || permissions['student']
  return perms.includes(action)
}

export const ROLE_LABELS = {
  admin:   'Admin',
  cr:      'Class Rep',
  student: 'Student',
}

export const ROLE_COLORS = {
  admin:   { bg: 'rgba(239,68,68,0.15)',   text: '#f87171',  border: 'rgba(239,68,68,0.3)'   },
  cr:      { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24',  border: 'rgba(245,158,11,0.3)'  },
  student: { bg: 'rgba(99,102,241,0.15)',  text: '#a5b4fc',  border: 'rgba(99,102,241,0.3)'  },
}