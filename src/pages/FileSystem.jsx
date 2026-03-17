import { useState, useEffect, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  collection, doc, addDoc, deleteDoc, onSnapshot,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db, storage } from '../firebase'
import { can, isCRPlus } from '../useRole'

const FOLDERS = [
  { id: 'notes',           label: 'Notes',           icon: '📄', color: '#6366f1', desc: 'Lecture notes & study material' },
  { id: 'question_papers', label: 'Question Papers',  icon: '📝', color: '#f59e0b', desc: 'Previous year & mock papers' },
  { id: 'syllabus',        label: 'Syllabus',         icon: '📋', color: '#10b981', desc: 'Official syllabus & unit breakdowns' },
  { id: 'practical_books', label: 'Practical Books',  icon: '🔬', color: '#ec4899', desc: 'Lab manuals & practical guides' },
]

const fmtSize = (b) => {
  if (!b) return ''
  if (b < 1048576) return `${Math.round(b / 1024)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

const fmtDate = (ts) =>
  ts?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Recent'

function Breadcrumb({ items, onNavigate }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'24px' }}>
      {items.map((item, i) => (
        <span key={i} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          {i > 0 && <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'16px' }}>›</span>}
          <button
            onClick={() => onNavigate(i)}
            style={{
              background:'none', border:'none',
              cursor: i < items.length - 1 ? 'pointer' : 'default',
              color: i < items.length - 1 ? 'rgba(255,255,255,0.45)' : 'white',
              fontSize:'14px', fontWeight: i === items.length - 1 ? '600' : '400',
              fontFamily:"'DM Sans', sans-serif", padding:'0', transition:'color 0.15s',
            }}
            onMouseEnter={e => { if (i < items.length - 1) e.target.style.color = 'white' }}
            onMouseLeave={e => { if (i < items.length - 1) e.target.style.color = 'rgba(255,255,255,0.45)' }}
          >{item}</button>
        </span>
      ))}
    </div>
  )
}

function FileRow({ file, canDelete, onDelete, i }) {
  const isImage = file.fileType?.startsWith('image/')
  return (
    <div style={{
      background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:'12px', padding:'14px 18px', display:'flex', alignItems:'center',
      gap:'14px', animation:`fadeUp 0.3s ease ${i*0.05}s both`, transition:'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}
    >
      <div style={{ width:'40px',height:'40px',borderRadius:'10px',background:'rgba(99,102,241,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0 }}>
        {isImage ? '🖼️' : '📄'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:'500',color:'white',fontSize:'13px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{file.name}</div>
        <div style={{ fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'3px',display:'flex',gap:'10px' }}>
          <span>By {file.uploadedBy}</span>
          {file.fileSize && <span>· {fmtSize(file.fileSize)}</span>}
          <span>· {fmtDate(file.createdAt)}</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
        <a href={file.url} target="_blank" rel="noreferrer" style={{
          display:'flex',alignItems:'center',gap:'5px',
          background:'rgba(99,102,241,0.12)',color:'#a5b4fc',
          border:'1px solid rgba(99,102,241,0.2)',borderRadius:'8px',
          padding:'6px 12px',fontSize:'12px',textDecoration:'none',fontWeight:'500',transition:'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.12)'}
        >↓ Download</a>
        {isImage && (
          <a href={file.url} target="_blank" rel="noreferrer" style={{
            display:'flex',alignItems:'center',gap:'5px',
            background:'rgba(16,185,129,0.1)',color:'#6ee7b7',
            border:'1px solid rgba(16,185,129,0.2)',borderRadius:'8px',
            padding:'6px 12px',fontSize:'12px',textDecoration:'none',transition:'all 0.15s',
          }}>👁 View</a>
        )}
        {canDelete && (
          <button onClick={() => onDelete(file)} style={{
            background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',
            color:'rgba(239,68,68,0.6)',borderRadius:'8px',padding:'6px 10px',
            cursor:'pointer',fontSize:'13px',transition:'all 0.15s',
          }}
            onMouseEnter={e => { e.target.style.background='rgba(239,68,68,0.18)'; e.target.style.color='#f87171' }}
            onMouseLeave={e => { e.target.style.background='rgba(239,68,68,0.08)'; e.target.style.color='rgba(239,68,68,0.6)' }}
          >🗑</button>
        )}
      </div>
    </div>
  )
}

function UploadModal({ onClose, onUpload, uploading, progress }) {
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'20px',backdropFilter:'blur(4px)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#0f1119',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'32px',width:'100%',maxWidth:'460px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'22px' }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:'20px',fontWeight:'700',color:'white' }}>Upload Files</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'20px',cursor:'pointer' }}>✕</button>
        </div>
        <div
          style={{ border:`2px dashed ${dragOver?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'14px',padding:'28px 20px',textAlign:'center',cursor:'pointer',transition:'all 0.15s',marginBottom:'16px',background:dragOver?'rgba(99,102,241,0.06)':'transparent' }}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);setFiles(prev=>[...prev,...Array.from(e.dataTransfer.files)].slice(0,5))}}
          onClick={()=>fileRef.current.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif" multiple style={{display:'none'}}
            onChange={e=>setFiles(prev=>[...prev,...Array.from(e.target.files)].slice(0,5))}/>
          <div style={{fontSize:'32px',marginBottom:'8px'}}>📂</div>
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:'13px'}}>Drop files here or <span style={{color:'#818cf8'}}>click to browse</span></div>
          <div style={{color:'rgba(255,255,255,0.2)',fontSize:'11px',marginTop:'6px'}}>PDF, DOC, PPT, JPG, PNG · Max 5 files · 25MB each</div>
        </div>
        {files.length > 0 && (
          <div style={{marginBottom:'16px'}}>
            {files.map((f,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'8px',marginBottom:'6px'}}>
                <span style={{fontSize:'16px'}}>{f.type.startsWith('image/')?'🖼️':'📄'}</span>
                <span style={{flex:1,fontSize:'12px',color:'rgba(255,255,255,0.7)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</span>
                <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',flexShrink:0}}>{fmtSize(f.size)}</span>
                <button onClick={()=>setFiles(prev=>prev.filter((_,idx)=>idx!==i))} style={{background:'none',border:'none',color:'rgba(239,68,68,0.5)',cursor:'pointer',fontSize:'14px'}}>✕</button>
              </div>
            ))}
          </div>
        )}
        {uploading && (
          <div style={{marginBottom:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'rgba(255,255,255,0.4)',marginBottom:'6px'}}>
              <span>Uploading...</span><span>{progress}%</span>
            </div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#6366f1,#8b5cf6)',borderRadius:'2px',transition:'width 0.3s',width:`${progress}%`}}/>
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',background:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'14px',fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          <button onClick={()=>onUpload(files)} disabled={uploading||files.length===0} style={{flex:2,padding:'11px',border:'none',borderRadius:'12px',background:uploading||files.length===0?'rgba(99,102,241,0.3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',cursor:uploading||files.length===0?'not-allowed':'pointer',fontSize:'14px',fontWeight:'500',fontFamily:"'DM Sans',sans-serif"}}>
            {uploading?`Uploading ${progress}%...`:`Upload ${files.length} file${files.length!==1?'s':''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FileSystem({ user, role }) {
  const [view, setView]                     = useState('courses')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSem, setSelectedSem]       = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedFolder, setSelectedFolder]   = useState(null)
  const [courses, setCourses]   = useState([])
  const [semesters, setSemesters] = useState([])
  const [subjects, setSubjects] = useState([])
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [progress, setProgress]     = useState(0)
  const [toast, setToast]           = useState('')
  const [showAddCourse, setShowAddCourse]   = useState(false)
  const [showAddSem, setShowAddSem]         = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [addName, setAddName]   = useState('')
  const [addColor, setAddColor] = useState('#6366f1')
  const [addSemNum, setAddSemNum] = useState('1')
  // FIX: subjectSemesters now always includes current semester
  const [subjectExtraSems, setSubjectExtraSems] = useState([])

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000) }
  const canEdit = isCRPlus(role)
  const COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6']

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db,'courses'),orderBy('createdAt','asc')), snap=>setCourses(snap.docs.map(d=>({id:d.id,...d.data()}))))
    return ()=>unsub()
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    setLoading(true)
    const unsub = onSnapshot(query(collection(db,'semesters'),where('courseId','==',selectedCourse.id),orderBy('number','asc')), snap=>{setSemesters(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    return ()=>unsub()
  }, [selectedCourse])

  useEffect(() => {
    if (!selectedSem) return
    setLoading(true)
    const unsub = onSnapshot(query(collection(db,'subjects'),where('semesterIds','array-contains',selectedSem.id),orderBy('name','asc')), snap=>{setSubjects(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    return ()=>unsub()
  }, [selectedSem])

  useEffect(() => {
    if (!selectedSubject||!selectedFolder) return
    setLoading(true)
    const unsub = onSnapshot(query(collection(db,'fs_files'),where('subjectId','==',selectedSubject.id),where('folder','==',selectedFolder.id),orderBy('createdAt','desc')), snap=>{setFiles(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    return ()=>unsub()
  }, [selectedSubject, selectedFolder])

  const goTo = (level, data=null) => {
    if (level==='courses')  { setView('courses');  setSelectedCourse(null); setSelectedSem(null); setSelectedSubject(null); setSelectedFolder(null) }
    if (level==='semesters'){ setView('semesters'); setSelectedCourse(data); setSelectedSem(null); setSelectedSubject(null); setSelectedFolder(null) }
    if (level==='subjects') { setView('subjects');  setSelectedSem(data); setSelectedSubject(null); setSelectedFolder(null) }
    if (level==='folders')  { setView('folders');   setSelectedSubject(data); setSelectedFolder(null) }
    if (level==='files')    { setView('files');     setSelectedFolder(data) }
  }

  const breadcrumb = ['File System', ...(selectedCourse?[selectedCourse.name]:[]), ...(selectedSem?[`Semester ${selectedSem.number}`]:[]), ...(selectedSubject?[selectedSubject.name]:[]), ...(selectedFolder?[selectedFolder.label]:[])]
  const handleBreadcrumb = (i) => { if(i===0)goTo('courses'); if(i===1)goTo('semesters',selectedCourse); if(i===2)goTo('subjects',selectedSem); if(i===3)goTo('folders',selectedSubject) }

  const addCourse = async () => {
    if (!addName.trim()) return
    await addDoc(collection(db,'courses'),{name:addName.trim(),color:addColor,createdAt:serverTimestamp(),createdBy:user.uid})
    setAddName(''); setShowAddCourse(false); showToast(`Course "${addName.trim()}" created ✓`)
  }

  const deleteCourse = async (course) => {
    if (!confirm(`Delete course "${course.name}"?`)) return
    await deleteDoc(doc(db,'courses',course.id)); showToast('Deleted.')
  }

  const addSemester = async () => {
    if (semesters.find(s=>s.number===parseInt(addSemNum))) return showToast('This semester already exists.')
    await addDoc(collection(db,'semesters'),{number:parseInt(addSemNum),courseId:selectedCourse.id,courseName:selectedCourse.name,createdAt:serverTimestamp(),createdBy:user.uid})
    setShowAddSem(false); showToast(`Semester ${addSemNum} created ✓`)
  }

  const deleteSemester = async (sem) => {
    if (!confirm(`Delete Semester ${sem.number}?`)) return
    await deleteDoc(doc(db,'semesters',sem.id)); showToast('Deleted.')
  }

  // FIX: always include current semester, plus any extra ones selected
  const addSubject = async () => {
    if (!addName.trim()) return showToast('Enter a subject name.')
    // Always include current semester + any additionally selected semesters
    const allSemIds = [selectedSem.id, ...subjectExtraSems.filter(id=>id!==selectedSem.id)]
    await addDoc(collection(db,'subjects'),{name:addName.trim(),semesterIds:allSemIds,createdAt:serverTimestamp(),createdBy:user.uid})
    setAddName(''); setSubjectExtraSems([]); setShowAddSubject(false)
    showToast(`Subject "${addName.trim()}" created ✓`)
  }

  const deleteSubject = async (subject) => {
    if (!confirm(`Delete subject "${subject.name}"?`)) return
    await deleteDoc(doc(db,'subjects',subject.id)); showToast('Deleted.')
  }

  const handleUpload = async (fileList) => {
    if (!fileList.length) return
    setUploading(true)
    let uploaded = 0
    for (const file of fileList) {
      if (file.size > 26214400) { showToast(`${file.name} too large (max 25MB)`); continue }
      const storagePath = `fs/${selectedSubject.id}/${selectedFolder.id}/${Date.now()}_${file.name}`
      const storageRef  = ref(storage, storagePath)
      const task = uploadBytesResumable(storageRef, file)
      await new Promise((resolve,reject) => {
        task.on('state_changed', s=>setProgress(Math.round(s.bytesTransferred/s.totalBytes*100)), reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            await addDoc(collection(db,'fs_files'),{
              name:file.name, url, storagePath, fileType:file.type, fileSize:file.size,
              folder:selectedFolder.id, folderLabel:selectedFolder.label,
              subjectId:selectedSubject.id, subjectName:selectedSubject.name,
              semesterId:selectedSem.id, semesterNumber:selectedSem.number,
              courseId:selectedCourse.id, courseName:selectedCourse.name,
              uploadedBy:user.displayName, uploadedByUid:user.uid, createdAt:serverTimestamp(),
            })
            uploaded++; resolve()
          }
        )
      })
    }
    setUploading(false); setProgress(0); setShowUpload(false)
    showToast(`${uploaded} file${uploaded!==1?'s':''} uploaded! 🎉`)
  }

  const handleDeleteFile = async (file) => {
    if (!can(role,'delete_any_notes') && file.uploadedByUid!==user.uid) return showToast("You can only delete your own uploads.")
    if (!confirm(`Delete "${file.name}"?`)) return
    try { await deleteObject(ref(storage,file.storagePath)).catch(()=>{}) } catch {}
    await deleteDoc(doc(db,'fs_files',file.id)); showToast('Deleted.')
  }

  const sk = (n=3) => Array.from({length:n}).map((_,i)=><div key={i} style={{background:'rgba(255,255,255,0.04)',borderRadius:'14px',height:'88px',animation:'pulse 1.5s ease-in-out infinite',animationDelay:`${i*0.1}s`}}/>)
  const empty = (msg,sub) => (
    <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)',gridColumn:'1/-1'}}>
      <div style={{fontSize:'48px',marginBottom:'12px'}}>📭</div>
      <div style={{fontSize:'15px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>{msg}</div>
      {sub&&<div style={{fontSize:'13px'}}>{sub}</div>}
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .fs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
        .fcard{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;cursor:pointer;transition:all 0.2s;animation:fadeUp 0.3s ease both;position:relative;overflow:hidden}
        .fcard:hover{transform:translateY(-2px)}
        .add-form{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px;margin-bottom:20px;animation:fadeUp 0.2s ease both}
        .fi{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 14px;color:white;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s;margin-bottom:10px}
        .fi:focus{border-color:rgba(99,102,241,0.5)}
        .pbtn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
        .pbtn:hover{opacity:0.9;transform:translateY(-1px)}
        .pbtn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
        .obtn{background:transparent;color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:9px 18px;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
        .obtn:hover{background:rgba(255,255,255,0.06);color:white}
        .sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .st{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:white}
        .chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
        .chip{padding:5px 12px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.4);transition:all 0.15s;font-family:'DM Sans',sans-serif}
        .chip.sel{background:rgba(99,102,241,0.2);color:#a5b4fc;border-color:rgba(99,102,241,0.35)}
        .chip:disabled{opacity:0.5;cursor:not-allowed}
        .cdot{width:22px;height:22px;border-radius:50%;cursor:pointer;transition:transform 0.15s;border:2px solid transparent}
        .cdot:hover{transform:scale(1.2)}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .files-list{display:flex;flex-direction:column;gap:10px}
        .del-sm{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);color:rgba(239,68,68,0.5);border-radius:8px;padding:4px 8px;cursor:pointer;font-size:13px;transition:all 0.15s;line-height:1}
        .del-sm:hover{background:rgba(239,68,68,0.18);color:#f87171}
      `}</style>

      {toast && <div className="toast">{toast}</div>}
      {showUpload && <UploadModal onClose={()=>setShowUpload(false)} onUpload={handleUpload} uploading={uploading} progress={progress}/>}

      <div style={{marginBottom:'8px',animation:'fadeUp 0.3s ease both'}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:'28px',fontWeight:'800',color:'white',marginBottom:'4px'}}>📁 File System</h1>
        <p style={{color:'rgba(255,255,255,0.35)',fontSize:'14px'}}>Browse Course → Semester → Subject → Folder</p>
      </div>

      {view!=='courses' && <Breadcrumb items={breadcrumb} onNavigate={handleBreadcrumb}/>}
      {view==='courses' && <div style={{marginBottom:'24px'}}/>}

      {/* ── COURSES ── */}
      {view==='courses' && <>
        <div className="sh">
          <div className="st">All Courses <span style={{fontSize:'14px',color:'rgba(255,255,255,0.3)',fontWeight:'400',marginLeft:'8px'}}>{courses.length} courses</span></div>
          {canEdit && <button className="pbtn" onClick={()=>setShowAddCourse(s=>!s)}>{showAddCourse?'✕ Cancel':'+ Add Course'}</button>}
        </div>
        {showAddCourse && (
          <div className="add-form">
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',marginBottom:'10px'}}>New course</div>
            <input className="fi" placeholder="Course name (e.g. BSc CS, BCA...)" value={addName} onChange={e=>setAddName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCourse()}/>
            <div style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',marginBottom:'6px'}}>Pick a color</div>
            <div className="chips" style={{marginBottom:'12px'}}>{COLORS.map(c=><div key={c} className="cdot" style={{background:c,borderColor:addColor===c?'white':'transparent'}} onClick={()=>setAddColor(c)}/>)}</div>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="pbtn" onClick={addCourse} disabled={!addName.trim()}>Create Course</button>
              <button className="obtn" onClick={()=>setShowAddCourse(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="fs-grid">
          {courses.length===0 ? empty('No courses yet', canEdit?'Add your first course!':'Your CR will add courses here.') :
           courses.map((c,i) => (
            <div key={c.id} className="fcard" style={{animationDelay:`${i*0.06}s`}}
              onClick={()=>goTo('semesters',c)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color+'60';e.currentTarget.style.background=c.color+'10';e.currentTarget.style.transform='translateY(-3px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.transform='translateY(0)'}}
            >
              <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:`linear-gradient(90deg,transparent,${c.color},transparent)`,opacity:0.6}}/>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <div style={{width:'44px',height:'44px',borderRadius:'12px',background:c.color+'20',border:`1px solid ${c.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',marginBottom:'12px'}}>🎓</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:'16px',fontWeight:'700',color:'white',marginBottom:'4px'}}>{c.name}</div>
                  <div style={{fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>Tap to explore</div>
                </div>
                {canEdit && <button className="del-sm" onClick={e=>{e.stopPropagation();deleteCourse(c)}}>🗑</button>}
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ── SEMESTERS ── */}
      {view==='semesters' && <>
        <div className="sh">
          <div><div className="st">Semesters</div><div style={{fontSize:'13px',color:'rgba(255,255,255,0.35)',marginTop:'2px'}}>{selectedCourse?.name}</div></div>
          {canEdit && <button className="pbtn" onClick={()=>setShowAddSem(s=>!s)}>{showAddSem?'✕ Cancel':'+ Add Semester'}</button>}
        </div>
        {showAddSem && (
          <div className="add-form">
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',marginBottom:'10px'}}>Select semester number</div>
            <div className="chips" style={{marginBottom:'12px'}}>
              {[1,2,3,4,5,6,7,8].map(n=>(
                <button key={n} className={`chip ${addSemNum===String(n)?'sel':''}`} onClick={()=>setAddSemNum(String(n))}>Sem {n}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="pbtn" onClick={addSemester}>Create Semester</button>
              <button className="obtn" onClick={()=>setShowAddSem(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="fs-grid">
          {loading ? sk(4) :
           semesters.length===0 ? empty('No semesters yet', canEdit?'Add a semester above!':'Your CR will add semesters here.') :
           semesters.map((s,i)=>(
            <div key={s.id} className="fcard" style={{animationDelay:`${i*0.05}s`}}
              onClick={()=>goTo('subjects',s)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.4)';e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.transform='translateY(0)'}}
            >
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                <span style={{fontSize:'28px'}}>📅</span>
                {canEdit && <button className="del-sm" onClick={e=>{e.stopPropagation();deleteSemester(s)}}>✕</button>}
              </div>
              <div style={{fontWeight:'500',color:'white',fontSize:'14px',marginBottom:'3px'}}>Semester {s.number}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>Tap to see subjects</div>
            </div>
          ))}
        </div>
      </>}

      {/* ── SUBJECTS ── */}
      {view==='subjects' && <>
        <div className="sh">
          <div>
            <div className="st">Subjects</div>
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.35)',marginTop:'2px'}}>{selectedCourse?.name} · Semester {selectedSem?.number}</div>
          </div>
          {canEdit && <button className="pbtn" onClick={()=>{setShowAddSubject(s=>!s);setAddName('');setSubjectExtraSems([])}}>{showAddSubject?'✕ Cancel':'+ Add Subject'}</button>}
        </div>
        {showAddSubject && (
          <div className="add-form">
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',marginBottom:'10px'}}>New subject for Semester {selectedSem?.number}</div>
            <input className="fi" placeholder="Subject name (e.g. Data Structures, DBMS...)" value={addName} onChange={e=>setAddName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSubject()}/>
            {semesters.length > 1 && (
              <>
                <div style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',marginBottom:'8px'}}>
                  Also share with other semesters? (optional — for subjects common to multiple sems)
                </div>
                <div className="chips" style={{marginBottom:'12px'}}>
                  {semesters.filter(s=>s.id!==selectedSem.id).map(s=>(
                    <button key={s.id}
                      className={`chip ${subjectExtraSems.includes(s.id)?'sel':''}`}
                      onClick={()=>setSubjectExtraSems(prev=>prev.includes(s.id)?prev.filter(x=>x!==s.id):[...prev,s.id])}
                    >Sem {s.number}</button>
                  ))}
                </div>
              </>
            )}
            <div style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:'8px',padding:'8px 12px',fontSize:'12px',color:'rgba(255,255,255,0.4)',marginBottom:'12px'}}>
              ✓ Will be added to <strong style={{color:'#a5b4fc'}}>Semester {selectedSem?.number}</strong>
              {subjectExtraSems.length>0 && ` + Sem ${subjectExtraSems.map(id=>semesters.find(s=>s.id===id)?.number).join(', Sem ')}`}
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="pbtn" onClick={addSubject} disabled={!addName.trim()}>Create Subject</button>
              <button className="obtn" onClick={()=>{setShowAddSubject(false);setAddName('');setSubjectExtraSems([])}}>Cancel</button>
            </div>
          </div>
        )}
        <div className="fs-grid">
          {loading ? sk(4) :
           subjects.length===0 ? empty('No subjects yet', canEdit?'Add a subject above!':'Your CR will add subjects here.') :
           subjects.map((s,i)=>(
            <div key={s.id} className="fcard" style={{animationDelay:`${i*0.05}s`}}
              onClick={()=>goTo('folders',s)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(16,185,129,0.4)';e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.transform='translateY(0)'}}
            >
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                <span style={{fontSize:'28px'}}>📚</span>
                {canEdit && <button className="del-sm" onClick={e=>{e.stopPropagation();deleteSubject(s)}}>✕</button>}
              </div>
              <div style={{fontWeight:'500',color:'white',fontSize:'14px',marginBottom:'3px'}}>{s.name}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>{s.semesterIds?.length>1?`Shared in ${s.semesterIds.length} sems`:'Tap to see folders'}</div>
            </div>
          ))}
        </div>
      </>}

      {/* ── FOLDERS ── */}
      {view==='folders' && <>
        <div className="sh">
          <div>
            <div className="st">{selectedSubject?.name}</div>
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.35)',marginTop:'2px'}}>Choose a folder</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'14px'}}>
          {FOLDERS.map((f,i)=>(
            <div key={f.id}
              style={{background:`${f.color}0f`,border:`1px solid ${f.color}30`,borderRadius:'16px',padding:'24px',cursor:'pointer',transition:'all 0.2s',animation:`fadeUp 0.3s ease ${i*0.08}s both`}}
              onClick={()=>goTo('files',f)}
              onMouseEnter={e=>{e.currentTarget.style.background=`${f.color}20`;e.currentTarget.style.transform='translateY(-3px)'}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${f.color}0f`;e.currentTarget.style.transform='translateY(0)'}}
            >
              <div style={{fontSize:'36px',marginBottom:'12px'}}>{f.icon}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:'15px',fontWeight:'700',color:'white',marginBottom:'4px'}}>{f.label}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </>}

      {/* ── FILES ── */}
      {view==='files' && <>
        <div className="sh">
          <div>
            <div className="st" style={{display:'flex',alignItems:'center',gap:'8px'}}><span>{selectedFolder?.icon}</span>{selectedFolder?.label}</div>
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.35)',marginTop:'2px'}}>{selectedSubject?.name} · {files.length} file{files.length!==1?'s':''}</div>
          </div>
          {canEdit && <button className="pbtn" onClick={()=>setShowUpload(true)}>+ Upload Files</button>}
        </div>
        <div className="files-list">
          {loading ? sk(3) :
           files.length===0 ? (
            <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>{selectedFolder?.icon}</div>
              <div style={{fontSize:'15px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>No files in {selectedFolder?.label} yet</div>
              <div style={{fontSize:'13px'}}>{canEdit?'Click "Upload Files" to add the first one!':'Your CR will upload files here.'}</div>
            </div>
           ) : files.map((f,i)=>(
            <FileRow key={f.id} file={f} i={i}
              canDelete={can(role,'delete_any_notes')||f.uploadedByUid===user.uid}
              onDelete={handleDeleteFile}
            />
           ))}
        </div>
      </>}
    </>
  )
}
