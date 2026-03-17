import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { can } from '../useRole'

export default function Announcements({ user, role }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [editItem, setEditItem]           = useState(null)
  const [title, setTitle]                 = useState('')
  const [body, setBody]                   = useState('')
  const [link, setLink]                   = useState('')
  const [urgent, setUrgent]               = useState(false)
  const [posting, setPosting]             = useState(false)
  const [toast, setToast]                 = useState('')

  const canPost   = can(role, 'post_announcements')
  const canDelete = (ann) =>
    can(role, 'delete_any_announcements') ||
    (can(role, 'delete_own_announcements') && ann.postedByUid === user.uid)
  const canEdit = (ann) =>
    can(role, 'edit_any_announcements') ||
    (can(role, 'edit_own_announcements') && ann.postedByUid === user.uid)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const openForm = (ann = null) => {
    if (ann) {
      setEditItem(ann)
      setTitle(ann.title)
      setBody(ann.body)
      setLink(ann.link || '')
      setUrgent(ann.urgent || false)
    } else {
      setEditItem(null)
      setTitle(''); setBody(''); setLink(''); setUrgent(false)
    }
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return showToast('Please fill in both title and message.')
    setPosting(true)
    try {
      if (editItem) {
        await updateDoc(doc(db, 'announcements', editItem.id), {
          title: title.trim(), body: body.trim(),
          link: link.trim() || null, urgent,
          editedAt: serverTimestamp(),
        })
        showToast('Announcement updated ✓')
      } else {
        await addDoc(collection(db, 'announcements'), {
          title: title.trim(), body: body.trim(),
          link: link.trim() || null, urgent,
          postedBy: user.displayName, postedByUid: user.uid,
          createdAt: serverTimestamp(),
        })
        showToast('Announcement posted! 📢')
      }
      setShowForm(false)
      setTitle(''); setBody(''); setLink(''); setUrgent(false); setEditItem(null)
    } catch { showToast('Failed. Try again.') }
    setPosting(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    await deleteDoc(doc(db, 'announcements', id))
    showToast('Deleted.')
  }

  // Sort: urgent first, then by date
  const sorted = [...announcements].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    return 0
  })

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .ann-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;flex-wrap:wrap;gap:12px;animation:fadeUp 0.3s ease both}
        .post-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;border:none;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 0 20px rgba(245,158,11,0.25);transition:all 0.15s}
        .post-btn:hover{transform:translateY(-1px);box-shadow:0 0 30px rgba(245,158,11,0.4)}
        .ann-item{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:22px 24px;margin-bottom:14px;animation:fadeUp 0.3s ease both;transition:border-color 0.15s}
        .ann-item:hover{border-color:rgba(255,255,255,0.12)}
        .ann-item.urgent{border-left:3px solid #ef4444;padding-left:21px}
        .moverlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;backdrop-filter:blur(4px)}
        .modal{background:#0f1119;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
        .fi{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:white;font-size:14px;font-family:'DM Sans',sans-serif;margin-bottom:12px;outline:none;transition:border-color 0.15s;resize:vertical}
        .fi:focus{border-color:rgba(245,158,11,0.5)}
        .tog{display:flex;align-items:center;gap:12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:12px 14px;cursor:pointer;margin-bottom:14px;transition:all 0.15s}
        .tog:hover{background:rgba(239,68,68,0.1)}
        .tt{width:38px;height:20px;border-radius:100px;position:relative;flex-shrink:0;transition:background 0.2s}
        .tth{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:white;transition:transform 0.2s}
        .skel{background:rgba(255,255,255,0.04);border-radius:14px;height:100px;margin-bottom:14px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .empty{text-align:center;padding:80px 20px;color:rgba(255,255,255,0.2)}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .action-btn{background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;transition:all 0.15s;font-family:'DM Sans',sans-serif}
        .action-btn:hover{background:rgba(255,255,255,0.07);color:white}
        .del-btn{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);color:rgba(239,68,68,0.6);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;transition:all 0.15s;font-family:'DM Sans',sans-serif}
        .del-btn:hover{background:rgba(239,68,68,0.18);color:#f87171}
        .student-notice{background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:12px 16px;font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:20px;display:flex;align-items:center;gap:10px}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Post Modal */}
      {showForm && (
        <div className="moverlay" onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'22px' }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:'20px',fontWeight:'700',color:'white' }}>
                {editItem ? 'Edit Announcement' : 'Post Announcement'}
              </h2>
              <button onClick={()=>setShowForm(false)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'20px',cursor:'pointer' }}>✕</button>
            </div>

            <input className="fi" placeholder="Title (e.g. Exam postponed to Friday)" value={title} onChange={e=>setTitle(e.target.value)}/>
            <textarea className="fi" placeholder="Message for your class..." value={body} onChange={e=>setBody(e.target.value)} rows={4}/>
            <input className="fi" placeholder="Optional link (e.g. https://meet.google.com/...)" value={link} onChange={e=>setLink(e.target.value)}/>

            <div className="tog" onClick={()=>setUrgent(u=>!u)}>
              <div className="tt" style={{ background:urgent?'#ef4444':'rgba(255,255,255,0.1)' }}>
                <div className="tth" style={{ transform:urgent?'translateX(18px)':'none' }}/>
              </div>
              <div>
                <div style={{ color:urgent?'#fca5a5':'rgba(255,255,255,0.5)',fontSize:'13px',fontWeight:'500' }}>
                  ⚠ Mark as URGENT
                </div>
                <div style={{ fontSize:'11px',color:'rgba(255,255,255,0.25)',marginTop:'2px' }}>
                  Urgent posts appear at the top with a red badge
                </div>
              </div>
            </div>

            <div style={{ display:'flex',gap:'10px' }}>
              <button onClick={()=>setShowForm(false)} style={{ flex:1,padding:'11px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',background:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'14px',fontFamily:"'DM Sans',sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={posting||!title.trim()||!body.trim()} style={{
                flex:2,padding:'11px',border:'none',borderRadius:'12px',
                background:posting||!title.trim()||!body.trim()?'rgba(245,158,11,0.3)':'linear-gradient(135deg,#f59e0b,#ef4444)',
                color:'white',cursor:posting||!title.trim()||!body.trim()?'not-allowed':'pointer',
                fontSize:'14px',fontWeight:'500',fontFamily:"'DM Sans',sans-serif",
              }}>
                {posting ? 'Posting...' : editItem ? 'Save Changes' : 'Post Announcement 📢'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="ann-header">
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:'28px',fontWeight:'800',color:'white',marginBottom:'4px' }}>
            Announcements
          </h1>
          <p style={{ color:'rgba(255,255,255,0.35)',fontSize:'14px' }}>
            {announcements.length} total · {announcements.filter(a=>a.urgent).length} urgent
          </p>
        </div>
        {canPost && (
          <button className="post-btn" onClick={() => openForm()}>
            + Post Announcement
          </button>
        )}
      </div>

      {/* Student notice */}
      {!canPost && (
        <div className="student-notice">
          <span>📢</span>
          <span>Announcements are posted by your Class Rep or Admin. Check back here for updates!</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        [1,2,3].map(i => <div key={i} className="skel"/>)
      ) : sorted.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize:'48px',marginBottom:'12px' }}>📭</div>
          <div style={{ fontSize:'16px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginBottom:'8px' }}>
            No announcements yet
          </div>
          <div style={{ fontSize:'13px' }}>
            {canPost ? 'Post the first announcement for your class!' : 'Your CR or Admin will post updates here.'}
          </div>
        </div>
      ) : sorted.map((ann, i) => (
        <div key={ann.id} className={`ann-item ${ann.urgent?'urgent':''}`} style={{ animationDelay:`${i*0.07}s` }}>
          <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px' }}>
            <div style={{ flex:1 }}>

              {/* Badges + date */}
              <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',flexWrap:'wrap' }}>
                {ann.urgent && (
                  <span style={{ background:'rgba(239,68,68,0.15)',color:'#f87171',fontSize:'10px',padding:'2px 8px',borderRadius:'100px',fontFamily:"'DM Mono',monospace",letterSpacing:'0.06em',fontWeight:'600' }}>
                    ⚠ URGENT
                  </span>
                )}
                <span style={{ fontSize:'12px',color:'rgba(255,255,255,0.25)',fontFamily:"'DM Mono',monospace" }}>
                  {ann.createdAt?.toDate?.()?.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})||'Just now'}
                </span>
                <span style={{ fontSize:'12px',color:'rgba(255,255,255,0.2)' }}>· by {ann.postedBy}</span>
                {ann.editedAt && (
                  <span style={{ fontSize:'10px',color:'rgba(255,255,255,0.15)',fontStyle:'italic' }}>(edited)</span>
                )}
              </div>

              {/* Title + body */}
              <h3 style={{ fontSize:'16px',fontWeight:'600',color:'white',marginBottom:'8px',fontFamily:"'Syne',sans-serif" }}>
                {ann.title}
              </h3>
              <p style={{ fontSize:'14px',color:'rgba(255,255,255,0.5)',lineHeight:1.6,marginBottom:ann.link?'10px':'0' }}>
                {ann.body}
              </p>
              {ann.link && (
                <a href={ann.link} target="_blank" rel="noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:'6px',color:'#fbbf24',fontSize:'13px',textDecoration:'none' }}>
                  🔗 View link →
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex',gap:'6px',flexShrink:0 }}>
              {canEdit(ann) && (
                <button className="action-btn" onClick={() => openForm(ann)}>✏ Edit</button>
              )}
              {canDelete(ann) && (
                <button className="del-btn" onClick={() => handleDelete(ann.id)}>🗑</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
