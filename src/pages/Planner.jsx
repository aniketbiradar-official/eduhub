import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, onSnapshot, serverTimestamp
} from 'firebase/firestore'

// ── Time helpers ───────────────────────────────────────────────────────────
function endOfDay() {
  const d = new Date(); d.setHours(23,59,59,999); return d
}
function endOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const sun = new Date(now)
  sun.setDate(now.getDate() + (day === 0 ? 0 : 7 - day))
  sun.setHours(23,59,59,999)
  return sun
}
function endOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
}
function isExpired(task) {
  if (!task.expiresAt) return false
  const exp = task.expiresAt.toDate ? task.expiresAt.toDate() : new Date(task.expiresAt)
  return new Date() > exp
}
function fmtTime(h) {
  if (h === null || h === undefined || h === '') return ''
  const hr = h % 12 || 12
  return `${hr}:00 ${h < 12 ? 'AM' : 'PM'}`
}

const PLAN_TYPES = [
  { id: 'daily',   label: 'Daily',   icon: '📅', color: '#6366f1', expiry: 'tonight'       },
  { id: 'weekly',  label: 'Weekly',  icon: '📆', color: '#10b981', expiry: 'end of week'    },
  { id: 'monthly', label: 'Monthly', icon: '🗓', color: '#f59e0b', expiry: 'end of month'   },
]

const HOURS = Array.from({length: 24}, (_, i) => ({
  value: i,
  label: `${i % 12 || 12}:00 ${i < 12 ? 'AM' : 'PM'}`
}))

// ── Task Card ──────────────────────────────────────────────────────────────
function TaskCard({ task, userId, i }) {
  const type = PLAN_TYPES.find(t => t.id === task.planType) || PLAN_TYPES[0]

  const setStatus = async (newStatus) => {
    const final = task.status === newStatus ? 'pending' : newStatus
    await updateDoc(doc(db, 'planner', userId, 'tasks', task.id), { status: final })
  }

  const remove = async () => {
    await deleteDoc(doc(db, 'planner', userId, 'tasks', task.id))
  }

  const isDone    = task.status === 'done'
  const isNotDone = task.status === 'not_done'

  return (
    <div style={{
      background: isDone ? 'rgba(16,185,129,0.06)' : isNotDone ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : isNotDone ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '14px', padding: '14px 16px',
      animation: `fadeUp 0.3s ease ${i*0.05}s both`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background: type.color, borderRadius:'14px 0 0 14px' }}/>

      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', paddingLeft:'8px' }}>
        {/* Status buttons */}
        <div style={{ display:'flex', flexDirection:'column', gap:'5px', flexShrink:0, marginTop:'2px' }}>
          <button
            onClick={() => setStatus('done')}
            title="Mark done"
            style={{
              width:'26px', height:'26px', borderRadius:'50%', cursor:'pointer',
              border: isDone ? '2px solid #34d399' : '1.5px solid rgba(255,255,255,0.2)',
              background: isDone ? 'rgba(16,185,129,0.2)' : 'transparent',
              color: isDone ? '#34d399' : 'rgba(255,255,255,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px',
              transition:'all 0.15s',
            }}>✓</button>
          <button
            onClick={() => setStatus('not_done')}
            title="Mark not done"
            style={{
              width:'26px', height:'26px', borderRadius:'50%', cursor:'pointer',
              border: isNotDone ? '2px solid #f87171' : '1.5px solid rgba(255,255,255,0.2)',
              background: isNotDone ? 'rgba(239,68,68,0.15)' : 'transparent',
              color: isNotDone ? '#f87171' : 'rgba(255,255,255,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px',
              transition:'all 0.15s',
            }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontWeight:'500', fontSize:'14px',
            color: isDone ? 'rgba(255,255,255,0.35)' : 'white',
            textDecoration: isDone ? 'line-through' : 'none',
            marginBottom: task.description ? '4px' : '6px',
          }}>{task.title}</div>
          {task.description && (
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'6px', lineHeight:1.5 }}>
              {task.description}
            </div>
          )}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
            <span style={{
              background: type.color + '18', color: type.color,
              border: `1px solid ${type.color}35`,
              fontSize:'10px', padding:'2px 8px', borderRadius:'100px',
              fontFamily:"'DM Mono',monospace",
            }}>{type.icon} {type.label}</span>
            {task.time !== null && task.time !== undefined && task.time !== '' && (
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>
                🕐 {fmtTime(task.time)}
              </span>
            )}
            {isDone   && <span style={{ fontSize:'10px', color:'#34d399', fontFamily:"'DM Mono',monospace" }}>✓ Done</span>}
            {isNotDone && <span style={{ fontSize:'10px', color:'#f87171', fontFamily:"'DM Mono',monospace" }}>✕ Not Done</span>}
          </div>
        </div>

        {/* Delete */}
        <button onClick={remove} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:'18px', padding:'2px', flexShrink:0, lineHeight:1, transition:'color 0.15s' }}
          onMouseEnter={e=>e.target.style.color='#f87171'}
          onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.2)'}
        >×</button>
      </div>
    </div>
  )
}

// ── Main Planner ───────────────────────────────────────────────────────────
export default function Planner({ user }) {
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeType, setActiveType] = useState('daily')
  const [showForm, setShowForm]     = useState(false)
  const [toast, setToast]           = useState('')
  const [title, setTitle]           = useState('')
  const [desc, setDesc]             = useState('')
  const [planType, setPlanType]     = useState('daily')
  const [time, setTime]             = useState('')
  const [adding, setAdding]         = useState(false)

  const uid = user.uid
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Load tasks
  useEffect(() => {
    setLoading(true)
    const colRef = collection(db, 'planner', uid, 'tasks')
    const unsub = onSnapshot(colRef,
      async (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        // Auto-delete expired
        for (const t of all.filter(t => isExpired(t))) {
          deleteDoc(doc(db, 'planner', uid, 'tasks', t.id)).catch(() => {})
        }
        setTasks(all.filter(t => !isExpired(t)))
        setLoading(false)
      },
      (err) => {
        console.error('Planner error:', err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [uid])

  const addTask = async () => {
    if (!title.trim()) return showToast('Enter a task title.')
    setAdding(true)
    const expiry = planType === 'daily' ? endOfDay() : planType === 'weekly' ? endOfWeek() : endOfMonth()
    try {
      await addDoc(collection(db, 'planner', uid, 'tasks'), {
        title:       title.trim(),
        description: desc.trim() || null,
        planType,
        time:        time !== '' ? parseInt(time) : null,
        status:      'pending',
        expiresAt:   expiry,
        createdAt:   serverTimestamp(),
      })
      setTitle(''); setDesc(''); setTime('')
      setShowForm(false)
      showToast('Task added! 📅')
    } catch (err) {
      console.error(err)
      showToast('Failed. Check Firestore rules.')
    }
    setAdding(false)
  }

  const filtered = tasks.filter(t => t.planType === activeType)
  const pending  = filtered.filter(t => t.status === 'pending')
  const done     = filtered.filter(t => t.status === 'done')
  const notDone  = filtered.filter(t => t.status === 'not_done')
  const pct      = filtered.length > 0 ? Math.round(done.length / filtered.length * 100) : 0
  const typeData = PLAN_TYPES.find(t => t.id === activeType)

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: activeType === 'daily' ? 'long' : undefined,
    day: 'numeric', month: 'long',
    year: activeType === 'monthly' ? 'numeric' : undefined,
  })

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .fi{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:white;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s;margin-bottom:10px}
        .fi:focus{border-color:rgba(99,102,241,0.5)}
        .fi option{background:#1a1d2e}
        .fi::placeholder{color:rgba(255,255,255,0.25)}
        .add-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 0 20px rgba(99,102,241,0.3);transition:all 0.15s}
        .add-btn:hover{transform:translateY(-1px);box-shadow:0 0 30px rgba(99,102,241,0.5)}
        .type-tabs{display:flex;gap:6px;background:rgba(255,255,255,0.04);padding:5px;border-radius:14px;width:fit-content;margin-bottom:20px}
        .ttab{padding:9px 20px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all 0.15s;color:rgba(255,255,255,0.4);background:none;display:flex;align-items:center;gap:6px}
        .ttab:hover{color:rgba(255,255,255,0.8)}
        .count-pill{background:rgba(255,255,255,0.06);border-radius:100px;padding:1px 7px;font-size:11px;font-family:'DM Mono',monospace}
        .form-box{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:22px;margin-bottom:22px;animation:slideDown 0.25s ease both}
        .pt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
        .pt-btn{padding:10px;border-radius:10px;font-size:12px;cursor:pointer;border:1px solid rgba(255,255,255,0.08);font-family:'DM Sans',sans-serif;transition:all 0.15s;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4);text-align:center}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:500px){.form-row{grid-template-columns:1fr}}
        .sec-label{font-size:11px;color:rgba(255,255,255,0.25);font-family:'DM Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;margin:14px 0 8px;display:flex;align-items:center;gap:8px}
        .sec-label::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
        .empty-s{text-align:center;padding:50px 20px;color:rgba(255,255,255,0.2)}
        .skel{background:rgba(255,255,255,0.04);border-radius:12px;height:76px;animation:pulse 1.5s ease-in-out infinite}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .tasks{display:flex;flex-direction:column;gap:10px}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'12px', animation:'fadeUp 0.3s ease both' }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'28px', fontWeight:'800', color:'white', marginBottom:'4px' }}>🗂 Study Planner</h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'14px' }}>Your personal study schedule — visible only to you</p>
        </div>
        <button className="add-btn" onClick={() => { setShowForm(s => !s); setPlanType(activeType) }}>
          {showForm ? '✕ Cancel' : '+ Add Task'}
        </button>
      </div>

      {/* Private notice */}
      <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:'12px', padding:'10px 16px', marginBottom:'20px', fontSize:'13px', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:'8px', animation:'fadeUp 0.3s ease 0.05s both' }}>
        <span>🔒</span>
        <span>This planner is <strong style={{color:'#a5b4fc'}}>private</strong> — only you can see your tasks.</span>
      </div>

      {/* Type tabs */}
      <div className="type-tabs">
        {PLAN_TYPES.map(t => (
          <button key={t.id} className="ttab"
            style={activeType===t.id ? { background:t.color+'20', color:t.color } : {}}
            onClick={() => setActiveType(t.id)}>
            {t.icon} {t.label}
            <span className="count-pill" style={activeType===t.id ? { background:t.color+'30', color:t.color } : {}}>
              {tasks.filter(tk => tk.planType === t.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Period + auto-delete info */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', animation:'fadeUp 0.3s ease 0.1s both' }}>
        <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', fontFamily:"'DM Mono',monospace" }}>
          {typeData?.icon} {today}
        </span>
        <span style={{ fontSize:'11px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'100px', padding:'3px 10px', color:'rgba(255,255,255,0.25)', fontFamily:"'DM Mono',monospace" }}>
          auto-deletes {typeData?.expiry}
        </span>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="form-box">
          <div style={{ fontSize:'14px', fontWeight:'500', color:'white', marginBottom:'14px', fontFamily:"'Syne',sans-serif" }}>New Task</div>
          <input className="fi" placeholder="What to study? (e.g. Chapter 3 - OS Process Management)" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&addTask()}/>
          <textarea className="fi" placeholder="Notes (optional)..." value={desc} onChange={e=>setDesc(e.target.value)} rows={2} style={{resize:'vertical'}}/>

          <div className="form-row">
            <div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',marginBottom:'8px'}}>Plan type</div>
              <div className="pt-grid">
                {PLAN_TYPES.map(t => (
                  <button key={t.id} className="pt-btn"
                    style={planType===t.id ? { background:t.color+'20', borderColor:t.color+'50', color:t.color } : {}}
                    onClick={() => setPlanType(t.id)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',marginBottom:'8px'}}>Study time (optional)</div>
              <select className="fi" value={time} onChange={e=>setTime(e.target.value)} style={{marginBottom:0}}>
                <option value="">No specific time</option>
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:'flex',gap:'10px',marginTop:'12px'}}>
            <button onClick={addTask} disabled={adding||!title.trim()} style={{
              flex:2,padding:'11px',border:'none',borderRadius:'12px',
              background:adding||!title.trim()?'rgba(99,102,241,0.3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color:'white',cursor:adding||!title.trim()?'not-allowed':'pointer',
              fontSize:'14px',fontWeight:'500',fontFamily:"'DM Sans',sans-serif",
            }}>{adding?'Adding...':'+ Add Task'}</button>
            <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'11px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',background:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'14px',fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {filtered.length > 0 && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px 20px', marginBottom:'20px', animation:'fadeUp 0.3s ease both' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px', flexWrap:'wrap', gap:'8px' }}>
            <div style={{ display:'flex', gap:'14px', fontSize:'13px', flexWrap:'wrap' }}>
              <span style={{color:'rgba(255,255,255,0.5)'}}><span style={{color:'white',fontWeight:'600'}}>{filtered.length}</span> tasks</span>
              <span style={{color:'#34d399'}}>✓ {done.length} done</span>
              <span style={{color:'#f87171'}}>✕ {notDone.length} not done</span>
              <span style={{color:'rgba(255,255,255,0.3)'}}>○ {pending.length} pending</span>
            </div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:'20px', fontWeight:'800', color: pct===100?'#34d399':pct>50?'#fbbf24':'#a5b4fc' }}>{pct}%</span>
          </div>
          <div style={{ height:'6px', background:'rgba(255,255,255,0.07)', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ height:'100%', background: pct===100?'#10b981':'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius:'3px', width:`${pct}%`, transition:'width 0.5s ease' }}/>
          </div>
        </div>
      )}

      {/* Tasks */}
      {loading ? (
        <div className="tasks">{[1,2,3].map(i=><div key={i} className="skel"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-s">
          <div style={{fontSize:'52px',marginBottom:'12px'}}>{typeData?.icon}</div>
          <div style={{fontSize:'15px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginBottom:'8px',fontFamily:"'Syne',sans-serif"}}>
            No {typeData?.label.toLowerCase()} tasks yet
          </div>
          <div style={{fontSize:'13px',marginBottom:'18px'}}>
            Add your first task for {activeType==='daily'?'today':activeType==='weekly'?'this week':'this month'}!
          </div>
          <button className="add-btn" style={{margin:'0 auto'}} onClick={()=>{setShowForm(true);setPlanType(activeType)}}>
            + Add {typeData?.label} Task
          </button>
        </div>
      ) : (
        <div>
          {pending.length > 0 && <>
            <div className="sec-label">○ Pending · {pending.length}</div>
            <div className="tasks" style={{marginBottom:'14px'}}>
              {pending.map((t,i)=><TaskCard key={t.id} task={t} userId={uid} i={i}/>)}
            </div>
          </>}
          {done.length > 0 && <>
            <div className="sec-label" style={{color:'#34d399'}}>✓ Done · {done.length}</div>
            <div className="tasks" style={{marginBottom:'14px'}}>
              {done.map((t,i)=><TaskCard key={t.id} task={t} userId={uid} i={i}/>)}
            </div>
          </>}
          {notDone.length > 0 && <>
            <div className="sec-label" style={{color:'#f87171'}}>✕ Not Done · {notDone.length}</div>
            <div className="tasks">
              {notDone.map((t,i)=><TaskCard key={t.id} task={t} userId={uid} i={i}/>)}
            </div>
          </>}
        </div>
      )}
    </>
  )
}
