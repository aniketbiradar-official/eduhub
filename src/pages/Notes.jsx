import { useState, useEffect, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import {
  collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, deleteDoc, doc
} from 'firebase/firestore'
import { db, storage } from '../firebase'

const COURSES = [
  { id: 'bsc_cs',  label: 'BSc CS',  color: '#6366f1' },
  { id: 'bca',     label: 'BCA',     color: '#0ea5e9' },
  { id: 'bsc_it',  label: 'BSc IT',  color: '#10b981' },
  { id: 'bsc_ds',  label: 'BSc DS',  color: '#f59e0b' },
  { id: 'mca',     label: 'MCA',     color: '#ec4899' },
  { id: 'msc_cs',  label: 'MSc CS',  color: '#8b5cf6' },
]

const COMMON_SUBJECTS = [
  'Mathematics','English Communication','Environmental Science','Basic Programming','Computer Fundamentals',
]

const COURSE_SUBJECTS = {
  bsc_cs:  ['Data Structures','Algorithms','Operating Systems','DBMS','Computer Networks','Software Engineering','Compiler Design','Computer Architecture','Theory of Computation','Artificial Intelligence'],
  bca:     ['Web Development','Visual Basic','DBMS','Software Engineering','Computer Graphics','E-Commerce','Multimedia','ASP.NET','Networking Basics'],
  bsc_it:  ['Web Technologies','Linux Administration','Cyber Security','Cloud Computing','IoT','Mobile Application Development','DBMS','Networking'],
  bsc_ds:  ['Machine Learning','Data Mining','Statistics & Probability','Python for Data Science','Big Data Analytics','Data Visualization','Deep Learning','NLP'],
  mca:     ['Advanced DBMS','Software Project Management','Advanced Algorithms','Cloud Computing','Blockchain','Distributed Systems','Enterprise Architecture'],
  msc_cs:  ['Research Methodology','Advanced AI','Quantum Computing','High Performance Computing','Advanced Networks','Cryptography'],
}

const fmtSize = (b) => { if (!b) return ''; if (b < 1048576) return `${Math.round(b/1024)} KB`; return `${(b/1048576).toFixed(1)} MB` }

export default function Notes({ user }) {
  const [activeCourse, setActiveCourse] = useState('bsc_cs')
  const [notes, setNotes]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('All')
  const [showForm, setShowForm]         = useState(false)
  const [title, setTitle]               = useState('')
  const [uploadCourse, setUploadCourse] = useState('bsc_cs')
  const [subject, setSubject]           = useState(COMMON_SUBJECTS[0])
  const [isCommon, setIsCommon]         = useState(false)
  const [file, setFile]                 = useState(null)
  const [dragOver, setDragOver]         = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [progress, setProgress]         = useState(0)
  const [toast, setToast]               = useState('')
  const fileRef = useRef()

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3200) }

  useEffect(() => {
    setLoading(true); setFilter('All')
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setNotes(all.filter(n => n.isCommon || n.courseId === activeCourse))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [activeCourse])

  const displayed = filter === 'All' ? notes
    : filter === 'Common (All Courses)' ? notes.filter(n => n.isCommon)
    : notes.filter(n => n.subject === filter)

  const handleUpload = async () => {
    if (!file || !title.trim()) return showToast('Please add a title and pick a file.')
    if (file.size > 26214400) return showToast('File too large! Max 25MB.')
    setUploading(true)
    try {
      const sRef = ref(storage, `notes/${isCommon ? 'common' : uploadCourse}/${Date.now()}_${file.name}`)
      const task = uploadBytesResumable(sRef, file)
      task.on('state_changed',
        s => setProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
        () => { showToast('Upload failed.'); setUploading(false) },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          await addDoc(collection(db, 'notes'), {
            title: title.trim(), subject,
            courseId: isCommon ? 'common' : uploadCourse,
            courseName: isCommon ? 'All Courses' : COURSES.find(c => c.id === uploadCourse)?.label,
            isCommon, url, fileName: file.name, fileSize: file.size,
            uploadedBy: user.displayName, uploadedByUid: user.uid, createdAt: serverTimestamp(),
          })
          setTitle(''); setFile(null); setProgress(0); setIsCommon(false)
          setUploading(false); setShowForm(false); showToast('Notes uploaded! 🎉')
        }
      )
    } catch { showToast('Something went wrong.'); setUploading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return
    await deleteDoc(doc(db, 'notes', id)); showToast('Deleted.')
  }

  const ac = COURSES.find(c => c.id === activeCourse)
  const subjectFilters = ['All', 'Common (All Courses)', ...COMMON_SUBJECTS, ...(COURSE_SUBJECTS[activeCourse] || [])]
  const uploadSubjects = isCommon ? COMMON_SUBJECTS : [...COMMON_SUBJECTS, ...(COURSE_SUBJECTS[uploadCourse] || [])]

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .course-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
        .ctab{padding:8px 16px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.07);font-family:'DM Sans',sans-serif;transition:all 0.15s;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4)}
        .ctab:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7)}
        .filter-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
        .fchip{padding:5px 12px;border-radius:100px;font-size:12px;cursor:pointer;border:1px solid rgba(255,255,255,0.07);font-family:'DM Sans',sans-serif;transition:all 0.15s;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.35)}
        .fchip:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7)}
        .fchip.active{background:rgba(99,102,241,0.2);color:#a5b4fc;border-color:rgba(99,102,241,0.3)}
        .fchip.common{background:rgba(16,185,129,0.08);color:#6ee7b7;border-color:rgba(16,185,129,0.2)}
        .fchip.common.active{background:rgba(16,185,129,0.18);border-color:rgba(16,185,129,0.4)}
        .notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .ncard{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px;transition:all 0.15s;animation:fadeUp 0.3s ease both}
        .ncard:hover{border-color:rgba(99,102,241,0.3);transform:translateY(-2px)}
        .ncard.nc-common{border-color:rgba(16,185,129,0.15)}
        .ncard.nc-common:hover{border-color:rgba(16,185,129,0.35)}
        .upload-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;box-shadow:0 0 20px rgba(99,102,241,0.3)}
        .upload-btn:hover{transform:translateY(-1px);box-shadow:0 0 30px rgba(99,102,241,0.5)}
        .moverlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;backdrop-filter:blur(4px)}
        .modal{background:#0f1119;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
        .fi{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:white;font-size:14px;font-family:'DM Sans',sans-serif;margin-bottom:12px;outline:none;transition:border-color 0.15s}
        .fi:focus{border-color:rgba(99,102,241,0.5)} .fi option{background:#1a1d2e}
        .fl{font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:6px;display:block}
        .cg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px}
        .cb2{padding:8px 10px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);font-family:'DM Sans',sans-serif;transition:all 0.15s;text-align:center;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4)}
        .drop{border:2px dashed rgba(255,255,255,0.1);border-radius:14px;padding:26px 20px;text-align:center;cursor:pointer;transition:all 0.15s;margin-bottom:14px}
        .drop:hover,.drop.over{border-color:rgba(99,102,241,0.4);background:rgba(99,102,241,0.04)}
        .pbar{height:4px;background:rgba(255,255,255,0.08);border-radius:2px;margin-bottom:14px;overflow:hidden}
        .pfill{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:2px;transition:width 0.3s}
        .skel{background:rgba(255,255,255,0.04);border-radius:14px;height:140px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.2);grid-column:1/-1}
        .toast2{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .sdiv{font-size:11px;color:rgba(255,255,255,0.2);font-family:'DM Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;margin:6px 0 4px;grid-column:1/-1;display:flex;align-items:center;gap:10px}
        .sdiv::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.05)}
        .tog{display:flex;align-items:center;gap:12px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:12px 14px;cursor:pointer;margin-bottom:14px;transition:all 0.15s}
        .tog:hover{background:rgba(16,185,129,0.1)}
        .tt{width:38px;height:20px;border-radius:100px;position:relative;flex-shrink:0;transition:background 0.2s}
        .tth{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:white;transition:transform 0.2s}
      `}</style>

      {toast && <div className="toast2">{toast}</div>}

      {showForm && (
        <div className="moverlay" onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'22px'}}>
              <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'20px',fontWeight:'700',color:'white'}}>Upload Notes</h2>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'20px',cursor:'pointer'}}>✕</button>
            </div>
            <label className="fl">Which course is this for?</label>
            <div className="cg">
              {COURSES.map(c=>(
                <button key={c.id} className="cb2"
                  style={uploadCourse===c.id&&!isCommon?{borderColor:c.color,color:c.color,background:c.color+'15'}:{}}
                  onClick={()=>{setUploadCourse(c.id);setIsCommon(false);setSubject(COURSE_SUBJECTS[c.id]?.[0]||COMMON_SUBJECTS[0])}}
                  disabled={isCommon}
                >{c.label}</button>
              ))}
            </div>
            <div className="tog" onClick={()=>{setIsCommon(i=>!i);setSubject(COMMON_SUBJECTS[0])}}>
              <div className="tt" style={{background:isCommon?'#10b981':'rgba(255,255,255,0.1)'}}>
                <div className="tth" style={{transform:isCommon?'translateX(18px)':'none'}}/>
              </div>
              <div>
                <div style={{color:isCommon?'#6ee7b7':'rgba(255,255,255,0.5)',fontSize:'13px',fontWeight:'500'}}>Share with ALL courses</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',marginTop:'2px'}}>Visible to BSc CS, BCA, BSc IT, BSc DS, MCA & MSc CS</div>
              </div>
            </div>
            <div className={`drop ${dragOver?'over':''}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);setFile(e.dataTransfer.files[0])}}
              onClick={()=>fileRef.current.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])}/>
              {file ? (
                <><div style={{fontSize:'28px',marginBottom:'6px'}}>📄</div>
                  <div style={{color:'white',fontSize:'14px',fontWeight:'500'}}>{file.name}</div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px',marginTop:'3px'}}>{fmtSize(file.size)}</div></>
              ) : (
                <><div style={{fontSize:'28px',marginBottom:'6px'}}>📂</div>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:'13px'}}>Drop file here or <span style={{color:'#818cf8'}}>click to browse</span></div>
                  <div style={{color:'rgba(255,255,255,0.2)',fontSize:'11px',marginTop:'5px'}}>PDF, DOC, DOCX, PPT, PPTX · Max 25MB</div></>
              )}
            </div>
            <input className="fi" placeholder="Note title (e.g. Unit 2 – Process Scheduling)" value={title} onChange={e=>setTitle(e.target.value)}/>
            <label className="fl">Subject</label>
            <select className="fi" value={subject} onChange={e=>setSubject(e.target.value)}>
              {uploadSubjects.map(s=><option key={s} value={s}>{COMMON_SUBJECTS.includes(s)?'🌍 ':''}{s}</option>)}
            </select>
            {uploading && <div className="pbar"><div className="pfill" style={{width:`${progress}%`}}/></div>}
            <div style={{display:'flex',gap:'10px',marginTop:'8px'}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'11px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',background:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'14px',fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading||!file||!title.trim()} style={{flex:2,padding:'11px',border:'none',borderRadius:'12px',background:uploading||!file||!title.trim()?'rgba(99,102,241,0.3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',cursor:uploading||!file||!title.trim()?'not-allowed':'pointer',fontSize:'14px',fontWeight:'500',fontFamily:"'DM Sans',sans-serif"}}>
                {uploading?`Uploading ${progress}%...`:'Upload Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'12px',animation:'fadeUp 0.3s ease both'}}>
        <div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:'28px',fontWeight:'800',color:'white',marginBottom:'4px'}}>Notes</h1>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:'14px'}}>{notes.length} notes for {ac?.label} + common subjects</p>
        </div>
        <button className="upload-btn" onClick={()=>setShowForm(true)}>+ Upload Notes</button>
      </div>

      <div className="course-tabs">
        {COURSES.map(c=>(
          <button key={c.id} className="ctab"
            style={activeCourse===c.id?{background:c.color+'20',color:c.color,borderColor:c.color+'55'}:{}}
            onClick={()=>setActiveCourse(c.id)}
          >{c.label}</button>
        ))}
      </div>

      <div className="filter-row">
        {subjectFilters.map(s=>(
          <button key={s} className={`fchip ${s==='Common (All Courses)'?'common':''} ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>
            {s==='Common (All Courses)'?'🌍 ':''}{s}
          </button>
        ))}
      </div>

      <div className="notes-grid">
        {loading ? [1,2,3,4].map(i=><div key={i} className="skel"/>) :
         displayed.length===0 ? (
           <div className="empty">
             <div style={{fontSize:'48px',marginBottom:'12px'}}>📭</div>
             <div style={{fontSize:'16px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginBottom:'8px'}}>No notes here yet</div>
             <div style={{fontSize:'13px'}}>Upload the first note for {ac?.label}!</div>
           </div>
         ) : <>
           {filter==='All' && displayed.some(n=>n.isCommon) && <div className="sdiv">🌍 common — visible to all courses</div>}
           {(filter==='All' ? displayed.filter(n=>n.isCommon) : displayed).map((note,i)=>(
             <NoteCard key={note.id} note={note} user={user} onDelete={handleDelete} fmtSize={fmtSize} delay={i*0.06}/>
           ))}
           {filter==='All' && displayed.some(n=>!n.isCommon) && (
             <div className="sdiv"><span style={{color:ac?.color}}>{ac?.label}</span> specific notes</div>
           )}
           {filter==='All' && displayed.filter(n=>!n.isCommon).map((note,i)=>(
             <NoteCard key={note.id} note={note} user={user} onDelete={handleDelete} fmtSize={fmtSize} delay={i*0.06}/>
           ))}
         </>
        }
      </div>
    </>
  )
}

function NoteCard({note,user,onDelete,fmtSize,delay}){
  return(
    <div className={`ncard ${note.isCommon?'nc-common':''}`} style={{animationDelay:`${delay}s`}}>
      <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
        <div style={{width:'42px',height:'42px',borderRadius:'12px',background:note.isCommon?'rgba(16,185,129,0.15)':'rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>📄</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:'500',color:'white',fontSize:'14px',lineHeight:1.4,marginBottom:'8px'}}>{note.title}</div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'10px'}}>
            {note.isCommon
              ? <span style={{background:'rgba(16,185,129,0.12)',color:'#6ee7b7',fontSize:'10px',padding:'2px 8px',borderRadius:'100px',border:'1px solid rgba(16,185,129,0.2)'}}>🌍 All Courses</span>
              : <span style={{background:'rgba(99,102,241,0.12)',color:'#a5b4fc',fontSize:'10px',padding:'2px 8px',borderRadius:'100px',border:'1px solid rgba(99,102,241,0.2)'}}>{note.courseName}</span>
            }
            <span style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)',fontSize:'10px',padding:'2px 8px',borderRadius:'100px'}}>{note.subject}</span>
            {note.fileSize&&<span style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',padding:'2px 0'}}>{fmtSize(note.fileSize)}</span>}
          </div>
          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',marginBottom:'12px'}}>
            By {note.uploadedBy} · {note.createdAt?.toDate?.()?.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})||'Recent'}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <a href={note.url} target="_blank" rel="noreferrer" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',background:'rgba(99,102,241,0.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'9px',padding:'7px 10px',fontSize:'12px',textDecoration:'none',fontWeight:'500',transition:'all 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(99,102,241,0.12)'}
            >↓ Download</a>
            {note.uploadedByUid===user.uid&&(
              <button onClick={()=>onDelete(note.id)} style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',color:'rgba(239,68,68,0.6)',borderRadius:'9px',padding:'7px 10px',cursor:'pointer',fontSize:'13px',transition:'all 0.15s'}}
                onMouseEnter={e=>{e.target.style.background='rgba(239,68,68,0.15)';e.target.style.color='#f87171'}}
                onMouseLeave={e=>{e.target.style.background='rgba(239,68,68,0.08)';e.target.style.color='rgba(239,68,68,0.6)'}}
              >🗑</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
