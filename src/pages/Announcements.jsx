import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'

export default function Announcements({ user }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [title, setTitle]                 = useState('')
  const [body, setBody]                   = useState('')
  const [link, setLink]                   = useState('')
  const [urgent, setUrgent]               = useState(false)
  const [posting, setPosting]             = useState(false)
  const [toast, setToast]                 = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const handlePost = async () => {
    if (!title.trim() || !body.trim()) return showToast('Please fill in both title and message.')
    setPosting(true)
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
        urgent,
        postedBy: user.displayName,
        postedByUid: user.uid,
        createdAt: serverTimestamp(),
      })
      setTitle(''); setBody(''); setLink(''); setUrgent(false)
      setShowForm(false); setPosting(false)
      showToast('Announcement posted! 📢')
    } catch { showToast('Failed to post. Try again.'); setPosting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    await deleteDoc(doc(db, 'announcements', id))
    showToast('Announcement deleted.')
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        .ann-page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:12px; animation:fadeUp 0.3s ease both; }
        .post-btn {
          display:flex; align-items:center; gap:8px;
          background:linear-gradient(135deg,#f59e0b,#ef4444);
          color:white; border:none; border-radius:12px;
          padding:10px 20px; font-size:14px; font-weight:500;
          cursor:pointer; font-family:'DM Sans',sans-serif;
          box-shadow:0 0 20px rgba(245,158,11,0.25); transition:all 0.15s;
        }
        .post-btn:hover { transform:translateY(-1px); box-shadow:0 0 30px rgba(245,158,11,0.4); }
        .ann-item {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          border-radius:16px; padding:22px 24px; margin-bottom:14px;
          animation:fadeUp 0.3s ease both; transition:border-color 0.15s;
        }
        .ann-item:hover { border-color:rgba(255,255,255,0.12); }
        .ann-item.ann-urgent { border-left:3px solid #ef4444; padding-left:21px; }
        .modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.7);
          display:flex; align-items:center; justify-content:center;
          z-index:200; padding:20px; animation:fadeUp 0.2s ease;
          backdrop-filter:blur(4px);
        }
        .modal { background:#0f1119; border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:32px; width:100%; max-width:460px; }
        .form-input {
          width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; padding:10px 14px; color:white; font-size:14px;
          font-family:'DM Sans',sans-serif; margin-bottom:12px; outline:none;
          transition:border-color 0.15s; resize:vertical;
        }
        .form-input:focus { border-color:rgba(245,158,11,0.5); }
        .toggle-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; cursor:pointer; }
        .toggle-track { width:40px; height:22px; border-radius:100px; transition:background 0.2s; position:relative; flex-shrink:0; }
        .toggle-thumb { position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:white; transition:transform 0.2s; }
        .skeleton { background:rgba(255,255,255,0.04); border-radius:14px; height:100px; margin-bottom:14px; animation:pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:0.4;}50%{opacity:0.7;} }
        .empty-state { text-align:center; padding:80px 20px; color:rgba(255,255,255,0.2); }
        .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#1a1d2e; border:1px solid rgba(255,255,255,0.12); color:white; padding:12px 24px; border-radius:12px; font-size:14px; z-index:300; box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeUp 0.3s ease; white-space:nowrap; }
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Post modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'20px', fontWeight:'700', color:'white' }}>Post Announcement</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'20px', cursor:'pointer' }}>✕</button>
            </div>

            <input className="form-input" placeholder="Title (e.g. Exam postponed to Friday)" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="form-input" placeholder="Message for your class..." value={body} onChange={e => setBody(e.target.value)} rows={4} />
            <input className="form-input" placeholder="Optional link (e.g. https://meet.google.com/...)" value={link} onChange={e => setLink(e.target.value)} />

            <div className="toggle-row" onClick={() => setUrgent(u => !u)}>
              <div className="toggle-track" style={{ background: urgent ? '#ef4444' : 'rgba(255,255,255,0.1)' }}>
                <div className="toggle-thumb" style={{ transform: urgent ? 'translateX(18px)' : 'none' }} />
              </div>
              <span style={{ color: urgent ? '#fca5a5' : 'rgba(255,255,255,0.4)', fontSize:'14px' }}>
                Mark as URGENT
              </span>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, padding:'11px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', background:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'14px', fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
              <button onClick={handlePost} disabled={posting || !title.trim() || !body.trim()} style={{
                flex:2, padding:'11px', border:'none', borderRadius:'12px',
                background: posting || !title.trim() || !body.trim() ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
                color:'white', cursor: posting || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
                fontSize:'14px', fontWeight:'500', fontFamily:"'DM Sans',sans-serif",
              }}>
                {posting ? 'Posting...' : 'Post Announcement 📢'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="ann-page-header">
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'28px', fontWeight:'800', color:'white', marginBottom:'4px' }}>Announcements</h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'14px' }}>{announcements.length} total announcements from your class</p>
        </div>
        <button className="post-btn" onClick={() => setShowForm(true)}>
          + Post Announcement
        </button>
      </div>

      {/* List */}
      {loading ? (
        [1,2,3].map(i => <div key={i} className="skeleton" />)
      ) : announcements.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div>
          <div style={{ fontSize:'16px', fontWeight:'500', marginBottom:'8px', color:'rgba(255,255,255,0.3)' }}>No announcements yet</div>
          <div style={{ fontSize:'13px' }}>Post the first announcement for your class!</div>
        </div>
      ) : announcements.map((ann, i) => (
        <div key={ann.id} className={`ann-item ${ann.urgent ? 'ann-urgent' : ''}`} style={{ animationDelay:`${i*0.07}s` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
                {ann.urgent && (
                  <span style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', fontSize:'10px', padding:'2px 8px', borderRadius:'100px', fontFamily:"'DM Mono',monospace", letterSpacing:'0.06em', fontWeight:'600' }}>⚠ URGENT</span>
                )}
                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', fontFamily:"'DM Mono',monospace" }}>
                  {ann.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' }) || 'Just now'}
                </span>
                <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>· by {ann.postedBy}</span>
              </div>
              <h3 style={{ fontSize:'16px', fontWeight:'600', color:'white', marginBottom:'8px', fontFamily:"'Syne',sans-serif" }}>{ann.title}</h3>
              <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:1.6, marginBottom: ann.link ? '10px' : '0' }}>{ann.body}</p>
              {ann.link && (
                <a href={ann.link} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'6px', color:'#fbbf24', fontSize:'13px', textDecoration:'none' }}>
                  🔗 View link →
                </a>
              )}
            </div>
            {ann.postedByUid === user.uid && (
              <button onClick={() => handleDelete(ann.id)} style={{
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)',
                color:'rgba(239,68,68,0.5)', borderRadius:'9px', padding:'7px 10px',
                cursor:'pointer', fontSize:'13px', transition:'all 0.15s', flexShrink:0,
              }}
                onMouseEnter={e => { e.target.style.background='rgba(239,68,68,0.15)'; e.target.style.color='#f87171' }}
                onMouseLeave={e => { e.target.style.background='rgba(239,68,68,0.08)'; e.target.style.color='rgba(239,68,68,0.5)' }}
              >🗑</button>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
