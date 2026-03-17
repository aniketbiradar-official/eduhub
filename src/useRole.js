import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// ── ROLE HIERARCHY ─────────────────────────────────────────────────────────
// admin   → everything (all CR + student powers + user management)
// cr      → contributor (upload, announce, manage courses, timetable)
// student → read-only (view & download everything)

const PERMISSIONS = {
  student: [
    'view_dashboard',
    'view_notes', 'download_notes',
    'view_announcements',
    'view_syllabus',
    'view_timetable',
    'view_planner',
  ],
  cr: [
    'view_dashboard',
    'view_notes', 'download_notes', 'upload_notes', 'delete_own_notes',
    'view_announcements', 'post_announcements', 'edit_own_announcements', 'delete_own_announcements',
    'view_syllabus', 'upload_syllabus', 'delete_own_syllabus',
    'view_timetable', 'edit_timetable',
    'view_planner',
    'manage_courses',
    'upload_question_papers', 'delete_own_question_papers',
    'upload_practical_books', 'delete_own_practical_books',
  ],
  admin: [
    'view_dashboard',
    'view_notes', 'download_notes', 'upload_notes', 'delete_own_notes', 'delete_any_notes',
    'view_announcements', 'post_announcements', 'edit_own_announcements', 'edit_any_announcements',
    'delete_own_announcements', 'delete_any_announcements', 'pin_announcements',
    'view_syllabus', 'upload_syllabus', 'delete_own_syllabus', 'delete_any_syllabus',
    'view_timetable', 'edit_timetable',
    'view_planner',
    'manage_courses',
    'upload_question_papers', 'delete_own_question_papers', 'delete_any_question_papers',
    'upload_practical_books', 'delete_own_practical_books', 'delete_any_practical_books',
    'manage_users', 'promote_users', 'demote_users',
    'view_all_stats',
  ],
}

export function can(role, action) {
  const perms = PERMISSIONS[role] || PERMISSIONS['student']
  return perms.includes(action)
}

export const isAdmin   = (role) => role === 'admin'
export const isCRPlus  = (role) => role === 'cr' || role === 'admin'
export const isStudent = (role) => role === 'student'

export function useRole(user) {
  const [role, setRole]         = useState(null)
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    if (!user) { setRole(null); setUserData(null); return }

    const fetchRole = async () => {
      try {
        const userRef  = doc(db, 'users', user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const data = userSnap.data()
          setRole(data.role || 'student')
          setUserData(data)
          setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(() => {})
        } else {
          const newUser = {
            uid: user.uid, name: user.displayName || 'Unknown',
            email: user.email || '', photoURL: user.photoURL || '',
            role: 'student', createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
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

    fetchRole()
  }, [user])

  return { role, userData }
}

export const ROLE_LABELS = { admin: 'Admin', cr: 'Class Rep', student: 'Student' }

export const ROLE_COLORS = {
  admin:   { bg: 'rgba(239,68,68,0.15)',  text: '#f87171',  border: 'rgba(239,68,68,0.3)'  },
  cr:      { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24',  border: 'rgba(245,158,11,0.3)' },
  student: { bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc',  border: 'rgba(99,102,241,0.3)' },
}

export const ROLE_ICONS = { admin: '🛡️', cr: '✏️', student: '📖' }
