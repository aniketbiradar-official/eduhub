import { useState, useEffect, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import {
  collection, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db, storage } from '../firebase'
import { can } from '../useRole'

const fmtSize = (b) => {
  if (!b) return ''
  if (b < 1048576) return `${Math.round(b / 1024)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ── Unit Tracker Component ────────────────────────────────────────────────
function UnitTracker({ syllabus, canEdit, onUpdate }) {
  const [units, setUnits]       = useState(syllabus.units || [])
  const [newUnit, setNewUnit]   = useState('')
  const [adding, setAdding]     = useState(false)
  const [expanded, setExpanded] = useState(false)

  const completed = units.filter(u => u.done).length
  const percent   = units.length > 0 ? Math.round((completed / units.length) * 100) : 0

  const addUnit = async () => {
    if (!newUnit.trim()) return
    const updated = [...units, { name: newUnit.trim(), done: false, id: Date.now().toString() }]
    setUnits(updated)
    setNewUnit('')
    await updateDoc(doc(db, 'syllabus', syllabus.id), { units: updated })
    onUpdate && onUpdate()
  }

  const toggleUnit = async (id) => {
    if (!canEdit) return
    const updated = units.map(u => u.id === id ? { ...u, done: !u.done } : u)
    setUnits(updated)
    await updateDoc(doc(db, 'syllabus', syllabus.id), { units: updated })
    onUpdate && onUpdate()
  }

  const removeUnit = async (id) => {
    const updated = units.filter(u => u.id !== id)
    setUnits(updated)
    await updateDoc(doc(db, 'syllabus', syllabus.id), { units: updated })
    onUpdate && onUpdate()
  }

  return (
    <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '3px', transition: 'width 0.4s ease',
            width: `${percent}%`,
            background: percent === 100 ? '#10b981' : percent > 50 ? '#f59e0b' : '#6366f1',
          }} />
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: '11px',
          color: percent === 100 ? '#34d399' : 'rgba(255,255,255,0.4)',
          minWidth: '36px', textAlign: 'right',
        }}>{percent}%</span>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
        >
          {expanded ? '▲' : '▼'} {units.length} units
        </button>
      </div>

      {expanded && (
        <div style={{ animation: 'fadeUp 0.2s ease both' }}>
          {units.length === 0 && !canEdit && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '12px' }}>
              No units added yet.
            </div>
          )}

          {units.map(unit => (
            <div key={unit.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              {/* Checkbox */}
              <div
                onClick={() => toggleUnit(unit.id)}
                style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                  border: `1.5px solid ${unit.done ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                  background: unit.done ? 'rgba(16,185,129,0.2)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canEdit ? 'pointer' : 'default', transition: 'all 0.15s',
                  fontSize: '11px',
                }}
              >
                {unit.done && <span style={{ color: '#34d399' }}>✓</span>}
              </div>

              <span style={{
                flex: 1, fontSize: '13px',
                color: unit.done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                textDecoration: unit.done ? 'line-through' : 'none',
                transition: 'all 0.15s',
              }}>{unit.name}</span>

              {canEdit && (
                <button onClick={() => removeUnit(unit.id)} style={{
                  background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)',
                  cursor: 'pointer', fontSize: '13px', padding: '2px 4px',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.target.style.color = '#f87171'}
                  onMouseLeave={e => e.target.style.color = 'rgba(239,68,68,0.4)'}
                >✕</button>
              )}
            </div>
          ))}

          {canEdit && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUnit()}
                placeholder="Add unit name..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  padding: '7px 12px', color: 'white', fontSize: '12px',
                  fontFamily: "'DM Sans', sans-serif", outline: 'none',
                }}
              />
              <button onClick={addUnit} style={{
                background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#a5b4fc', borderRadius: '8px', padding: '7px 14px',
                cursor: 'pointer', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
              }}>+ Add</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Syllabus Card ─────────────────────────────────────────────────────────
function SyllabusCard({ syl, canEdit, onDelete, i }) {
  const completed = (syl.units || []).filter(u => u.done).length
  const total     = (syl.units || []).length
  const percent   = total > 0 ? Math.round(completed / total * 100) : 0
  const [, forceUpdate] = useState(0)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px', padding: '20px',
      animation: 'fadeUp 0.3s ease both',
      animationDelay: `${i * 0.06}s`,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(16,185,129,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
        }}>📋</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '500', color: 'white', fontSize: '14px', marginBottom: '6px', lineHeight: 1.4 }}>
            {syl.subject}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span style={{
              background: 'rgba(16,185,129,0.12)', color: '#6ee7b7',
              fontSize: '10px', padding: '2px 8px', borderRadius: '100px',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>{syl.courseName}</span>
            <span style={{
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)',
              fontSize: '10px', padding: '2px 8px', borderRadius: '100px',
            }}>Sem {syl.semester}</span>
            {syl.fileSize && (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', padding: '2px 0' }}>
                {fmtSize(syl.fileSize)}
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>
            Uploaded by {syl.uploadedBy} · {syl.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Recent'}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href={syl.url} target="_blank" rel="noreferrer" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'rgba(16,185,129,0.12)', color: '#6ee7b7',
              border: '1px solid rgba(16,185,129,0.2)', borderRadius: '9px',
              padding: '7px 10px', fontSize: '12px', textDecoration: 'none', fontWeight: '500',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
            >↓ Download</a>

            <a
              href={`https://docs.google.com/viewer?url=${encodeURIComponent(syl.url)}`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: '9px',
                padding: '7px 12px', fontSize: '12px', textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
            >👁 Preview</a>

            {canEdit && (
              <button onClick={() => onDelete(syl.id)} style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                color: 'rgba(239,68,68,0.6)', borderRadius: '9px', padding: '7px 10px',
                cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.18)'; e.target.style.color = '#f87171' }}
                onMouseLeave={e => { e.target.style.background = 'rgba(239,68,68,0.08)'; e.target.style.color = 'rgba(239,68,68,0.6)' }}
              >🗑</button>
            )}
          </div>
        </div>
      </div>

      {/* Unit tracker */}
      <UnitTracker
        syllabus={syl}
        canEdit={canEdit}
        onUpdate={() => forceUpdate(n => n + 1)}
      />
    </div>
  )
}

// ── Main Syllabus Page ────────────────────────────────────────────────────
export default function Syllabus({ user, role }) {
  const [syllabi, setSyllabi]       = useState([])
  const [courses, setCourses]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [activeCourse, setActiveCourse] = useState('all')
  const [activeSem, setActiveSem]   = useState('all')

  // Upload form state
  const [uploadCourse, setUploadCourse] = useState('')
  const [subject, setSubject]           = useState('')
  const [semester, setSemester]         = useState('1')
  const [file, setFile]                 = useState(null)
  const [dragOver, setDragOver]         = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [progress, setProgress]         = useState(0)
  const [toast, setToast]               = useState('')
  const fileRef = useRef()

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const canEdit   = can(role, 'upload_syllabus')

  // Load courses
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'courses'), orderBy('createdAt', 'asc')),
      snap => {
        const c = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setCourses(c)
        if (c.length > 0 && !uploadCourse) setUploadCourse(c[0].id)
      }
    )
    return () => unsub()
  }, [])

  // Load syllabi
  useEffect(() => {
    const q = query(collection(db, 'syllabus'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setSyllabi(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const handleUpload = async () => {
    if (!file || !subject.trim() || !uploadCourse) return showToast('Please fill in all fields and select a file.')
    if (file.size > 26214400) return showToast('File too large! Max 25MB.')
    setUploading(true)
    try {
      const courseName = courses.find(c => c.id === uploadCourse)?.name || uploadCourse
      const storageRef = ref(storage, `syllabus/${uploadCourse}/${Date.now()}_${file.name}`)
      const task = uploadBytesResumable(storageRef, file)
      task.on('state_changed',
        snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
        () => { showToast('Upload failed. Try again.'); setUploading(false) },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          await addDoc(collection(db, 'syllabus'), {
            subject: subject.trim(),
            courseId: uploadCourse,
            courseName,
            semester,
            url,
            fileName:     file.name,
            fileSize:     file.size,
            uploadedBy:   user.displayName,
            uploadedByUid: user.uid,
            units:        [],
            createdAt:    serverTimestamp(),
          })
          setSubject(''); setFile(null); setProgress(0)
          setUploading(false); setShowForm(false)
          showToast('Syllabus uploaded! 🎉')
        }
      )
    } catch { showToast('Something went wrong.'); setUploading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this syllabus?')) return
    await deleteDoc(doc(db, 'syllabus', id))
    showToast('Deleted.')
  }

  // Filter
  const displayed = syllabi.filter(s => {
    const courseMatch = activeCourse === 'all' || s.courseId === activeCourse
    const semMatch    = activeSem    === 'all' || s.semester  === activeSem
    return courseMatch && semMatch
  })

  const semesters = ['1','2','3','4','5','6','7','8']
  const selectedCourse = courses.find(c => c.id === uploadCourse)

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .syl-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
        .stab{padding:7px 16px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.07);font-family:'DM Sans',sans-serif;transition:all 0.15s;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4)}
        .stab:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7)}
        .syl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
        .upload-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#10b981,#0d9488);color:white;border:none;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;box-shadow:0 0 20px rgba(16,185,129,0.25)}
        .upload-btn:hover{transform:translateY(-1px);box-shadow:0 0 30px rgba(16,185,129,0.4)}
        .moverlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;backdrop-filter:blur(4px)}
        .modal{background:#0f1119;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
        .fi{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:white;font-size:14px;font-family:'DM Sans',sans-serif;margin-bottom:12px;outline:none;transition:border-color 0.15s}
        .fi:focus{border-color:rgba(16,185,129,0.5)} .fi option{background:#1a1d2e}
        .fl{font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:5px;display:block}
        .drop{border:2px dashed rgba(255,255,255,0.1);border-radius:14px;padding:28px 20px;text-align:center;cursor:pointer;transition:all 0.15s;margin-bottom:14px}
        .drop:hover,.drop.over{border-color:rgba(16,185,129,0.4);background:rgba(16,185,129,0.04)}
        .pbar{height:4px;background:rgba(255,255,255,0.08);border-radius:2px;margin-bottom:14px;overflow:hidden}
        .pfill{height:100%;background:linear-gradient(90deg,#10b981,#0d9488);border-radius:2px;transition:width 0.3s}
        .sem-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px}
        .sem-btn{padding:8px 6px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);font-family:'DM Sans',sans-serif;transition:all 0.15s;text-align:center;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4)}
        .sem-btn.sel{background:rgba(16,185,129,0.2);color:#6ee7b7;border-color:rgba(16,185,129,0.35)}
        .skel{background:rgba(255,255,255,0.04);border-radius:14px;height:160px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .empty-state{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.2);grid-column:1/-1}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .course-btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
        .cb3{padding:9px 10px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);font-family:'DM Sans',sans-serif;transition:all 0.15s;text-align:center;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4)}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Upload Modal */}
      {showForm && (
        <div className="moverlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'22px' }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:'20px',fontWeight:'700',color:'white' }}>Upload Syllabus</h2>
              <button onClick={()=>setShowForm(false)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'20px',cursor:'pointer' }}>✕</button>
            </div>

            {/* Course select */}
            <label className="fl">Course</label>
            {courses.length === 0 ? (
              <div style={{ fontSize:'13px',color:'rgba(255,255,255,0.3)',marginBottom:'12px',padding:'10px',background:'rgba(255,255,255,0.03)',borderRadius:'10px' }}>
                No courses found. Add courses in the CR Panel first.
              </div>
            ) : (
              <div className="course-btn-grid">
                {courses.map(c => (
                  <button key={c.id} className="cb3"
                    style={uploadCourse===c.id?{borderColor:c.color,color:c.color,background:c.color+'18'}:{}}
                    onClick={()=>setUploadCourse(c.id)}
                  >{c.name}</button>
                ))}
              </div>
            )}

            {/* Semester */}
            <label className="fl">Semester</label>
            <div className="sem-grid">
              {semesters.map(s => (
                <button key={s} className={`sem-btn ${semester===s?'sel':''}`} onClick={()=>setSemester(s)}>
                  Sem {s}
                </button>
              ))}
            </div>

            {/* Subject name */}
            <input className="fi" placeholder="Subject name (e.g. Data Structures)" value={subject} onChange={e=>setSubject(e.target.value)}/>

            {/* Drop zone */}
            <div className={`drop ${dragOver?'over':''}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);setFile(e.dataTransfer.files[0])}}
              onClick={()=>fileRef.current.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])}/>
              {file ? (
                <><div style={{fontSize:'28px',marginBottom:'6px'}}>📋</div>
                  <div style={{color:'white',fontSize:'14px',fontWeight:'500'}}>{file.name}</div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px',marginTop:'3px'}}>{fmtSize(file.size)}</div></>
              ) : (
                <><div style={{fontSize:'28px',marginBottom:'6px'}}>📂</div>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:'13px'}}>Drop PDF here or <span style={{color:'#34d399'}}>click to browse</span></div>
                  <div style={{color:'rgba(255,255,255,0.2)',fontSize:'11px',marginTop:'5px'}}>PDF only · Max 25MB</div></>
              )}
            </div>

            {uploading && <div className="pbar"><div className="pfill" style={{width:`${progress}%`}}/></div>}

            <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'11px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',background:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'14px',fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading||!file||!subject.trim()||!uploadCourse} style={{
                flex:2,padding:'11px',border:'none',borderRadius:'12px',
                background:uploading||!file||!subject.trim()||!uploadCourse?'rgba(16,185,129,0.25)':'linear-gradient(135deg,#10b981,#0d9488)',
                color:'white',cursor:uploading||!file||!subject.trim()||!uploadCourse?'not-allowed':'pointer',
                fontSize:'14px',fontWeight:'500',fontFamily:"'DM Sans',sans-serif",
              }}>
                {uploading?`Uploading ${progress}%...`:'Upload Syllabus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px',animation:'fadeUp 0.3s ease both'}}>
        <div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:'28px',fontWeight:'800',color:'white',marginBottom:'4px'}}>Syllabus</h1>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:'14px'}}>{syllabi.length} syllabuses uploaded · click a card to track unit progress</p>
        </div>
        {canEdit && <button className="upload-btn" onClick={()=>setShowForm(true)}>+ Upload Syllabus</button>}
      </div>

      {/* Course filter */}
      <div style={{marginBottom:'6px'}}>
        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',fontFamily:"'DM Mono',monospace",letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'8px'}}>Filter by course</div>
        <div className="syl-tabs">
          <button className="stab" style={activeCourse==='all'?{background:'rgba(16,185,129,0.15)',color:'#6ee7b7',borderColor:'rgba(16,185,129,0.3)'}:{}} onClick={()=>setActiveCourse('all')}>All Courses</button>
          {courses.map(c=>(
            <button key={c.id} className="stab"
              style={activeCourse===c.id?{background:c.color+'20',color:c.color,borderColor:c.color+'55'}:{}}
              onClick={()=>setActiveCourse(c.id)}
            >{c.name}</button>
          ))}
        </div>
      </div>

      {/* Semester filter */}
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',fontFamily:"'DM Mono',monospace",letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'8px'}}>Filter by semester</div>
        <div className="syl-tabs">
          <button className="stab" style={activeSem==='all'?{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',borderColor:'rgba(99,102,241,0.3)'}:{}} onClick={()=>setActiveSem('all')}>All Sems</button>
          {semesters.map(s=>(
            <button key={s} className="stab"
              style={activeSem===s?{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',borderColor:'rgba(99,102,241,0.3)'}:{}}
              onClick={()=>setActiveSem(s)}
            >Sem {s}</button>
          ))}
        </div>
      </div>

      {/* Syllabus Grid */}
      <div className="syl-grid">
        {loading ? (
          [1,2,3].map(i=><div key={i} className="skel"/>)
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div style={{fontSize:'48px',marginBottom:'12px'}}>📭</div>
            <div style={{fontSize:'16px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginBottom:'8px'}}>No syllabus found</div>
            <div style={{fontSize:'13px'}}>
              {canEdit ? 'Upload the first syllabus for your class!' : 'Your CR hasn\'t uploaded any syllabus yet.'}
            </div>
          </div>
        ) : displayed.map((syl, i) => (
          <SyllabusCard
            key={syl.id}
            syl={syl}
            canEdit={canEdit}
            onDelete={handleDelete}
            i={i}
          />
        ))}
      </div>
    </>
  )
}
