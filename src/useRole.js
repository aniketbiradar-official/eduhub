import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// ROLE HIERARCHY
// admin  → full access (manage users, delete anything, all CR powers)
// cr     → contributor (upload notes, post announcements, manage timetable, CR panel)
// student→ read-only (view & download everything)

export function useRole(user) {
  const [role, setRole]       = useState(null)   // null = loading
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    if (!user) { setRole(null); return }

    const userRef = doc(db, 'users', user.uid)

    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setRole(data.role || 'student')
        setUserData(data)
      } else {
        // First login — create user document with 'student' role
        const newUser = {
          uid:         user.uid,
          name:        user.displayName,
          email:       user.email,
          photoURL:    user.photoURL,
          role:        'student',
          createdAt:   serverTimestamp(),
          lastLogin:   serverTimestamp(),
        }
        await setDoc(userRef, newUser)
        setRole('student')
        setUserData(newUser)
      }
    })

    // Update lastLogin each session
    setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(() => {})

    return () => unsub()
  }, [user])

  return { role, userData }
}

// Helper: check if a role has a given permission
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

// Role display helpers
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