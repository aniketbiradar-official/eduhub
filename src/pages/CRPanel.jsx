import { useState, useEffect } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore'
import { db } from '../firebase'

// ── Predefined color palette for courses ──────────────────────────────────
const COLORS = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b',
  '#ec4899','#8b5cf6','#ef4444','#14b8a6',
  '#f97316','#84cc16',
]

export default function CRPanel({ user }) {
  const [courses, setCourses]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('courses')
  const [toast, setToast]             = useState('')

  // Course form
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseColor, setNewCourseColor] = useState(COLORS[0])
  const [addingCourse, setAddingCourse]   = useState(false)

  // Subject form
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [newSubject, setNewSubject]         = useState('')
  const [addingSubject, setAddingSubject]   = useState(false)
  const [subjectType, setSubjectType]       = useState('course') // 'course' | 'common'

  // Common subjects
  const [commonSubjects, setCommonSubjects] = useState([])
  const [newCommon, setNewCommon]           = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Live load courses
  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  // Live load common subjects
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'commonSubjects'), snap => {
      if (snap.exists()) setCommonSubjects(snap.data().subjects || [])
      else setCommonSubjects([])
    })
    return () => unsub()
  }, [])

  // ── COURSE ACTIONS ────────────────────────────────────────────────────
  const addCourse = async () => {
    if (!newCourseName.trim()) return showToast('Enter a course name.')
    const exists = courses.find(c => c.name.toLowerCase() === newCourseName.trim().toLowerCase())
    if (exists) return showToast('A course with this name already exists.')
    setAddingCourse(true)
    try {
      await addDoc(collection(db, 'courses'), {
        name: newCourseName.trim(),
        color: newCourseColor,
        subjects: [],
        createdAt: serverTimestamp(),
        createdBy: user.displayName,
      })
      setNewCourseName('')
      setNewCourseColor(COLORS[Math.floor(Math.random() * COLORS.length)])
      showToast(`Course "${newCourseName.trim()}" added! ✓`)
    } catch { showToast('Failed to add course.') }
    setAddingCourse(false)
  }

  const deleteCourse = async (course) => {
    if (!confirm(`Delete "${course.name}" and all its subjects? This won't delete uploaded notes.`)) return
    await deleteDoc(doc(db, 'courses', course.id))
    showToast(`"${course.name}" deleted.`)
    if (selectedCourse?.id === course.id) setSelectedCourse(null)
  }

  // ── SUBJECT ACTIONS ───────────────────────────────────────────────────
  const addSubjectToCourse = async () => {
    if (!selectedCourse || !newSubject.trim()) return showToast('Enter a subject name.')
    const already = (selectedCourse.subjects || []).find(
      s => s.toLowerCase() === newSubject.trim().toLowerCase()
    )
    if (already) return showToast('Subject already exists in this course.')
    setAddingSubject(true)
    try {
      const updated = [...(selectedCourse.subjects || []), newSubject.trim()]
      await updateDoc(doc(db, 'courses', selectedCourse.id), { subjects: updated })
      setSelectedCourse(prev => ({ ...prev, subjects: updated }))
      setNewSubject('')
      showToast(`"${newSubject.trim()}" added to ${selectedCourse.name} ✓`)
    } catch { showToast('Failed to add subject.') }
    setAddingSubject(false)
  }

  const removeSubjectFromCourse = async (course, subject) => {
    const updated = (course.subjects || []).filter(s => s !== subject)
    await updateDoc(doc(db, 'courses', course.id), { subjects: updated })
    if (selectedCourse?.id === course.id) setSelectedCourse(prev => ({ ...prev, subjects: updated }))
    showToast(`"${subject}" removed.`)
  }

  // ── COMMON SUBJECT ACTIONS ────────────────────────────────────────────
  const addCommonSubject = async () => {
    if (!newCommon.trim()) return showToast('Enter a subject name.')
    if (commonSubjects.find(s => s.toLowerCase() === newCommon.trim().toLowerCase()))
      return showToast('Already in common subjects.')
    const updated = [...commonSubjects, newCommon.trim()]
    await setDoc(doc(db, 'config', 'commonSubjects'), { subjects: updated })
    setNewCommon('')
    showToast(`"${newCommon.trim()}" added to common subjects ✓`)
  }

  const removeCommonSubject = async (subject) => {
    const updated = commonSubjects.filter(s => s !== subject)
    await setDoc(doc(db, 'config', 'commonSubjects'), { subjects: updated })
    showToast(`"${subject}" removed.`)
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .cr-tabs{display:flex;gap:4px;margin-bottom:28px;background:rgba(255,255,255,0.04);padding:4px;border-radius:14px;width:fit-content}
        .cr-tab{padding:9px 20px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all 0.15s;color:rgba(255,255,255,0.4);background:none}
        .cr-tab.active{background:rgba(99,102,241,0.2);color:#a5b4fc}
        .cr-tab:hover:not(.active){color:rgba(255,255,255,0.7)}
        .panel-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        @media(max-width:800px){.panel-grid{grid-template-columns:1fr}}
        .panel-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px;animation:fadeUp 0.3s ease both}
        .panel-card h3{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:white;margin-bottom:16px}
        .add-row{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .fi{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 14px;color:white;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s;flex:1;min-width:0}
        .fi:focus{border-color:rgba(99,102,241,0.5)}
        .add-btn{padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;transition:all 0.15s}
        .add-btn:hover{opacity:0.9;transform:translateY(-1px)}
        .add-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
        .course-list{display:flex;flex-direction:column;gap:8px}
        .course-item{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;transition:all 0.15s;cursor:pointer}
        .course-item:hover{border-color:rgba(255,255,255,0.15)}
        .course-item.selected{background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3)}
        .course-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
        .course-name{flex:1;font-size:14px;color:white;font-weight:500}
        .subject-count{font-size:11px;color:rgba(255,255,255,0.3);font-family:'DM Mono',monospace}
        .del-btn{background:none;border:none;color:rgba(239,68,68,0.4);cursor:pointer;font-size:14px;padding:4px;border-radius:6px;transition:all 0.15s;line-height:1}
        .del-btn:hover{color:#f87171;background:rgba(239,68,68,0.1)}
        .subjects-panel{margin-top:8px}
        .subject-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
        .stag{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:100px;padding:5px 12px;font-size:12px;color:rgba(255,255,255,0.6);animation:fadeUp 0.2s ease both}
        .stag button{background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:12px;line-height:1;padding:0;margin-left:2px;transition:color 0.15s}
        .stag button:hover{color:#f87171}
        .stag.common-stag{background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.2);color:#6ee7b7}
        .stag.common-stag button:hover{color:#fca5a5}
        .color-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
        .color-dot{width:24px;height:24px;border-radius:50%;cursor:pointer;transition:transform 0.15s;border:2px solid transparent}
        .color-dot:hover{transform:scale(1.2)}
        .color-dot.active{border-color:white;transform:scale(1.15)}
        .empty-small{font-size:12px;color:rgba(255,255,255,0.2);text-align:center;padding:16px;border:1px dashed rgba(255,255,255,0.07);border-radius:10px}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .hint{font-size:11px;color:rgba(255,255,255,0.25);margin-bottom:10px;line-height:1.5}
        .section-label{font-size:11px;color:rgba(255,255,255,0.3);font-family:'DM Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px}
        .skel{background:rgba(255,255,255,0.04);border-radius:12px;height:48px;animation:pulse 1.5s ease-in-out infinite;margin-bottom:8px}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .info-box{background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:12px 14px;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:16px}
        .info-box strong{color:#a5b4fc}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom:'28px', animation:'fadeUp 0.3s ease both' }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'28px', fontWeight:'800', color:'white', marginBottom:'4px' }}>
          CR Panel
        </h1>
        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'14px' }}>
          Manage courses, subjects, and what students see — no code needed.
        </p>
      </div>

      {/* Tabs */}
      <div className="cr-tabs">
        <button className={`cr-tab ${activeTab==='courses'?'active':''}`} onClick={()=>setActiveTab('courses')}>
          📚 Courses & Subjects
        </button>
        <button className={`cr-tab ${activeTab==='common'?'active':''}`} onClick={()=>setActiveTab('common')}>
          🌍 Common Subjects
        </button>
      </div>

      {/* ── COURSES TAB ────────────────────────────────────────── */}
      {activeTab === 'courses' && (
        <div className="panel-grid">
          {/* Left: Course list */}
          <div className="panel-card">
            <h3>All Courses</h3>

            <div className="info-box">
              <strong>How it works:</strong> Add your college's courses here. Each course gets its own set of subjects. Students pick their course to see relevant notes.
            </div>

            {/* Add course form */}
            <div className="section-label">Add new course</div>
            <div className="add-row">
              <input
                className="fi"
                placeholder="e.g. BSc CS, BCA, MCA..."
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCourse()}
              />
              <button className="add-btn" onClick={addCourse} disabled={addingCourse || !newCourseName.trim()}>
                {addingCourse ? '...' : '+ Add'}
              </button>
            </div>

            {/* Color picker */}
            <div className="section-label">Pick course color</div>
            <div className="color-row" style={{ marginBottom:'16px' }}>
              {COLORS.map(c => (
                <div
                  key={c}
                  className={`color-dot ${newCourseColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewCourseColor(c)}
                />
              ))}
            </div>

            {/* Course list */}
            <div className="section-label" style={{ marginTop:'4px' }}>Your courses ({courses.length})</div>
            {loading
              ? [1,2,3].map(i => <div key={i} className="skel" />)
              : courses.length === 0
              ? <div className="empty-small">No courses added yet. Add your first one above!</div>
              : (
                <div className="course-list">
                  {courses.map(course => (
                    <div
                      key={course.id}
                      className={`course-item ${selectedCourse?.id === course.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCourse(course)}
                    >
                      <div className="course-dot" style={{ background: course.color }} />
                      <span className="course-name">{course.name}</span>
                      <span className="subject-count">{(course.subjects||[]).length} subjects</span>
                      <button className="del-btn" onClick={e => { e.stopPropagation(); deleteCourse(course) }}>✕</button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Right: Subject editor */}
          <div className="panel-card">
            <h3>
              {selectedCourse
                ? <span>Subjects for <span style={{ color: selectedCourse.color }}>{selectedCourse.name}</span></span>
                : 'Subjects'}
            </h3>

            {!selectedCourse ? (
              <div className="empty-small" style={{ padding:'40px 20px' }}>
                👈 Select a course on the left to manage its subjects
              </div>
            ) : (
              <div className="subjects-panel">
                <div className="info-box">
                  These subjects appear as filter tabs when students view notes for <strong>{selectedCourse.name}</strong>.
                </div>

                {/* Add subject */}
                <div className="section-label">Add subject</div>
                <div className="add-row">
                  <input
                    className="fi"
                    placeholder="e.g. Data Structures, DBMS..."
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubjectToCourse()}
                  />
                  <button className="add-btn" onClick={addSubjectToCourse} disabled={addingSubject || !newSubject.trim()}>
                    {addingSubject ? '...' : '+ Add'}
                  </button>
                </div>

                {/* Subject tags */}
                <div className="section-label" style={{ marginTop:'8px' }}>
                  Current subjects ({(selectedCourse.subjects || []).length})
                </div>
                {(selectedCourse.subjects || []).length === 0 ? (
                  <div className="empty-small">No subjects yet. Add the first one above!</div>
                ) : (
                  <div className="subject-tags">
                    {(selectedCourse.subjects || []).map(s => (
                      <div key={s} className="stag">
                        {s}
                        <button onClick={() => removeSubjectFromCourse(selectedCourse, s)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="hint" style={{ marginTop:'12px' }}>
                  ✕ to remove a subject. Removing a subject won't delete uploaded notes — they'll still be visible under "All".
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COMMON SUBJECTS TAB ────────────────────────────────── */}
      {activeTab === 'common' && (
        <div style={{ maxWidth:'600px' }}>
          <div className="panel-card">
            <h3>🌍 Common Subjects</h3>

            <div className="info-box">
              <strong>Common subjects</strong> appear for ALL courses — Mathematics, English, EVS, etc. Notes uploaded under a common subject are visible to every student regardless of their course.
            </div>

            <div className="section-label">Add common subject</div>
            <div className="add-row">
              <input
                className="fi"
                placeholder="e.g. Mathematics, English, EVS..."
                value={newCommon}
                onChange={e => setNewCommon(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCommonSubject()}
              />
              <button className="add-btn" onClick={addCommonSubject} disabled={!newCommon.trim()}>
                + Add
              </button>
            </div>

            <div className="section-label" style={{ marginTop:'8px' }}>
              Current common subjects ({commonSubjects.length})
            </div>
            {commonSubjects.length === 0 ? (
              <div className="empty-small">No common subjects yet. Add subjects shared across all courses!</div>
            ) : (
              <div className="subject-tags">
                {commonSubjects.map(s => (
                  <div key={s} className="stag common-stag">
                    🌍 {s}
                    <button onClick={() => removeCommonSubject(s)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="hint" style={{ marginTop:'16px' }}>
              Tip: Add subjects like Mathematics, English, EVS, Soft Skills that every course in your college shares.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
