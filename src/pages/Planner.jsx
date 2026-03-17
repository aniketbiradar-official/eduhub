import { useState, useEffect } from 'react'
import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  query, where, onSnapshot, serverTimestamp, orderBy
} from 'firebase/firestore'
import { db } from '../firebase'

// ── Helpers ────────────────────────────────────────────────────────────────
const today     = () => new Date()
const startOfDay  = (d = new Date()) => { const n = new Date(d); n.setHours(0,0,0,0); return n }
const endOfDay    = (d = new Date()) => { const n = new Date(d); n.setHours(23,59,59,999); return n }

const getWeekRange = () => {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  return { start: mon, end: sun }
}

const getMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

const isExpired = (task) => {
  if (!task.expiresAt) return false
  return new Date() > task.expiresAt.toDate?.() || new Date() > task.expiresAt
}

const PLAN_TYPES = [
  { id: 'daily',   label: 'Daily',   icon: '📅', color: '#6366f1', desc: 'Resets every day at midnight' },
  { id: 'weekly',  label: 'Weekly',  icon: '📆', color: '#10b981', desc: 'Resets every Monday' },
  { id: 'monthly', label: 'Monthly', icon: '🗓', color: '#f59e0b', desc: 'Resets on the 1st of each month' },
]

const HOURS = Array.from({length: 24}, (_, i) => {
  const h = i % 12 || 12
  const ampm = i < 12 ? 'AM' : 'PM'
  return { value: i, label: `${h}:00 ${ampm}` }
})

const fmtTime = (h) => {
  if (h === null || h === undefined) return ''
  const hr = h % 12 || 12
  return `${hr}:00 ${h < 12 ? 'AM' : 'PM'}`
}

const STATUS_CONFIG = {
  pending:    { icon: '○',  color: 'rgba(255,255,255,0.3)', bg: 'transparent',              label: 'Pending'   },
  done:       { icon: '✓',  color: '#34d399',               bg: 'rgba(16,185,129,0.15)',    label: 'Done'      },
  not_done:   { icon: '✕',  color: '#f87171',               bg: 'rgba(239,68,68,0.12)',     label: 'Not Done'  },
}

// ── Task Card ──────────────────────────────────────────────────────────────
function TaskCard({ task, onStatus, onDelete, i }) {
  const sc     = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
  const type   = PLAN_TYPES.find(t => t.id === task.planType)
  const expired = isExpired(task)

  return (
    <div style={{
      background: task.status === 'done'     ? 'rgba(16,185,129,0.06)'  :
                  task.status === 'not_done'  ? 'rgba(239,68,68,0.06)'   :
                  'rgba(255,255,255,0.03)',
      border: `1px solid ${
        task.status === 'done'    ? 'rgba(16,185,129,0.2)'  :
        task.status === 'not_done'? 'rgba(239,68,68,0.15)'  :
        'rgba(255,255,255,0.07)'
      }`,
      borderRadius: '14px', padding: '16px 18px',
      animation: 'fadeUp 0.3s ease both', animationDelay: `${i * 0.05}s`,
      transition: 'all 0.2s', opacity: expired ? 0.5 : 1,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Colored left border based on plan type */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background: type?.color || '#6366f1', borderRadius:'14px 0 0 14px' }}/>

      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', paddingLeft:'6px' }}>
        {/* Status toggle button */}
        <div style={{ display:'flex', flexDirection:'column', gap:'5px', flexShrink:0, marginTop:'2px' }}>
          <button
            onClick={() => onStatus(task, 'done')}
            title="Mark as done"
            style={{
              width:'28px', height:'28px', borderRadius:'50%',
              border: task.status==='done' ? '2px solid #34d399' : '1.5px solid rgba(255,255,255,0.15)',
              background: task.status==='done' ? 'rgba(16,185,129,0.2)' : 'transparent',
              color: task.status==='done' ? '#34d399' : 'rgba(255,255,255,0.3)',
              cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>{ if(task.status!=='done') { e.currentTarget.style.borderColor='#34d399'; e.currentTarget.style.color='#34d399' }}}
            onMouseLeave={e=>{ if(task.status!=='done') { e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; e.currentTarget.style.color='rgba(255,255,255,0.3)' }}}
          >✓</button>
          <button
            onClick={() => onStatus(task, 'not_done')}
            title="Mark as not done"
            style={{
              width:'28px', height:'28px', borderRadius:'50%',
              border: task.status==='not_done' ? '2px solid #f87171' : '1.5px solid rgba(255,255,255,0.15)',
              background: task.status==='not_done' ? 'rgba(239,68,68,0.15)' : 'transparent',
              color: task.status==='not_done' ? '#f87171' : 'rgba(255,255,255,0.3)',
              cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>{ if(task.status!=='not_done') { e.currentTarget.style.borderColor='#f87171'; e.currentTarget.style.color='#f87171' }}}
            onMouseLeave={e=>{ if(task.status!=='not_done') { e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; e.currentTarget.style.color='rgba(255,255,255,0.3)' }}}
          >✕</button>
        </div>

        {/* Task details */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontWeight:'500', fontSize:'14px',
            color: task.status==='done' ? 'rgba(255,255,255,0.45)' : 'white',
            textDecoration: task.status==='done' ? 'line-through' : 'none',
            marginBottom:'5px', transition:'all 0.2s',
          }}>{task.title}</div>

          {task.description && (
            <div style={{ fontSize:'12px',color:'rgba(255,255,255,0.35)',marginBottom:'6px',lineHeight:1.5 }}>
              {task.description}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            {/* Plan type badge */}
            <span style={{
              background: type?.color + '18', color: type?.color,
              border: `1px solid ${type?.color}35`,
              fontSize:'10px', padding:'2px 8px', borderRadius:'100px',
              fontFamily:"'DM Mono',monospace", fontWeight:'600',
            }}>
              {type?.icon} {type?.label}
            </span>

            {/* Time if set */}
            {task.time !== null && task.time !== undefined && (
              <span style={{ fontSize:'11px',color:'rgba(255,255,255,0.3)',display:'flex',alignItems:'center',gap:'4px' }}>
                🕐 {fmtTime(task.time)}
              </span>
            )}

            {/* Status badge */}
            {task.status !== 'pending' && (
              <span style={{
                background: sc.bg, color: sc.color,
                fontSize:'10px', padding:'2px 8px', borderRadius:'100px',
                fontFamily:"'DM Mono',monospace", fontWeight:'600',
              }}>
                {sc.icon} {sc.label}
              </span>
            )}

            {expired && (
              <span style={{ fontSize:'10px',color:'rgba(255,100,100,0.5)',fontFamily:"'DM Mono',monospace" }}>
                expired
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button onClick={() => onDelete(task.id)} style={{
          background:'none', border:'none', color:'rgba(255,255,255,0.2)',
          cursor:'pointer', fontSize:'16px', padding:'4px', flexShrink:0,
          transition:'color 0.15s',
        }}
          onMouseEnter={e=>e.target.style.color='#f87171'}
          onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.2)'}
        >×</button>
      </div>
    </div>
  )
}

// ── Stats Bar ──────────────────────────────────────────────────────────────
function StatsBar({ tasks }) {
  const total    = tasks.length
  const done     = tasks.filter(t => t.status === 'done').length
  const notDone  = tasks.filter(t => t.status === 'not_done').length
  const pending  = tasks.filter(t => t.status === 'pending').length
  const pct      = total > 0 ? Math.round(done / total * 100) : 0

  return (
    <div style={{
      background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:'14px', padding:'16px 20px', marginBottom:'24px',
      animation:'fadeUp 0.3s ease both',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)' }}>
            <span style={{ color:'white', fontWeight:'600' }}>{total}</span> tasks
          </span>
          <span style={{ fontSize:'13px', color:'#34d399' }}>✓ {done} done</span>
          <span style={{ fontSize:'13px', color:'#f87171' }}>✕ {notDone} not done</span>
          <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>○ {pending} pending</span>
        </div>
        <span style={{
          fontFamily:"'Syne',sans-serif", fontSize:'20px', fontWeight:'800',
          color: pct === 100 ? '#34d399' : pct > 50 ? '#fbbf24' : '#a5b4fc',
        }}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div style={{ height:'6px', background:'rgba(255,255,255,0.07)', borderRadius:'3px', overflow:'hidden', position:'relative' }}>
        {total > 0 && <>
          <div style={{
            position:'absolute', left:0, top:0, bottom:0,
            width:`${pct}%`,
            background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius:'3px', transition:'width 0.5s ease',
          }}/>
          {notDone > 0 && (
            <div style={{
              position:'absolute', right:0, top:0, bottom:0,
              width:`${Math.round(notDone/total*100)}%`,
              background:'rgba(239,68,68,0.4)', borderRadius:'3px',
            }}/>
          )}
        </>}
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

  // Form fields
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [planType, setPlanType]     = useState('daily')
  const [time, setTime]             = useState('')
  const [adding, setAdding]         = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ── Compute expiry based on plan type ──────────────────────────────────
  const getExpiry = (type) => {
    if (type === 'daily')   return endOfDay()
    if (type === 'weekly')  return getWeekRange().end
    if (type === 'monthly') return getMonthRange().end
    return endOfDay()
  }

  // ── Load tasks for current user ────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    const q = query(
      collection(db, 'planner', user.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, async (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Auto-delete expired tasks
      const expired = all.filter(t => isExpired(t))
      for (const t of expired) {
        await deleteDoc(doc(db, 'planner', user.uid, 'tasks', t.id)).catch(() => {})
      }

      setTasks(all.filter(t => !isExpired(t)))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [user.uid])

  // ── Add task ───────────────────────────────────────────────────────────
  const addTask = async () => {
    if (!title.trim()) return showToast('Please enter a task title.')
    setAdding(true)
    try {
      const expiry = getExpiry(planType)
      await addDoc(collection(db, 'planner', user.uid, 'tasks'), {
        title:       title.trim(),
        description: description.trim() || null,
        planType,
        time:        time !== '' ? parseInt(time) : null,
        status:      'pending',
        expiresAt:   expiry,
        createdAt:   serverTimestamp(),
        userId:      user.uid,
      })
      setTitle(''); setDesc(''); setTime(''); setShowForm(false)
      showToast('Task added! 📅')
    } catch (err) { console.error(err); showToast('Failed to add task.') }
    setAdding(false)
  }

  // ── Update status ──────────────────────────────────────────────────────
  const updateStatus = async (task, newStatus) => {
    const finalStatus = task.status === newStatus ? 'pending' : newStatus
    await updateDoc(doc(db, 'planner', user.uid, 'tasks', task.id), { status: finalStatus })
  }

  // ── Delete task ────────────────────────────────────────────────────────
  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'planner', user.uid, 'tasks', id))
    showToast('Task removed.')
  }

  // Filter tasks by active type
  const filtered = tasks.filter(t => t.planType === activeType)

  // Sort: pending first, then done, then not_done; within same status sort by time
  const sorted = [...filtered].sort((a, b) => {
    const order = { pending: 0, done: 1, not_done: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    if (a.time !== null && b.time !== null) return (a.time || 0) - (b.time || 0)
    return 0
  })

  const activeTypeData = PLAN_TYPES.find(t => t.id === activeType)

  // Period label
  const getPeriodLabel = () => {
    if (activeType === 'daily') {
      return today().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })
    }
    if (activeType === 'weekly') {
      const { start, end } = getWeekRange()
      return `${start.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`
    }
    if (activeType === 'monthly') {
      return today().toLocaleDateString('en-IN', { month:'long', year:'numeric' })
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}

        .type-tabs{display:flex;gap:6px;margin-bottom:24px;background:rgba(255,255,255,0.04);padding:5px;border-radius:14px;width:fit-content;animation:fadeUp 0.3s ease both}
        .type-tab{padding:9px 22px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all 0.15s;color:rgba(255,255,255,0.4);background:none;display:flex;align-items:center;gap:6px;white-space:nowrap}
        .type-tab:hover{color:rgba(255,255,255,0.8)}

        .add-form{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;margin-bottom:24px;animation:slideDown 0.25s ease both}
        .fi{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:white;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s;margin-bottom:12px}
        .fi:focus{border-color:rgba(99,102,241,0.5)}
        .fi option{background:#1a1d2e}
        .fi::placeholder{color:rgba(255,255,255,0.25)}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
        @media(max-width:500px){.form-row{grid-template-columns:1fr}}

        .plan-type-select{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
        .pt-btn{padding:10px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);font-family:'DM Sans',sans-serif;transition:all 0.15s;text-align:center;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4)}
        .pt-btn.sel{color:white}

        .tasks-list{display:flex;flex-direction:column;gap:10px}
        .skel{background:rgba(255,255,255,0.04);border-radius:12px;height:80px;animation:pulse 1.5s ease-in-out infinite}
        .empty-state{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.2);animation:fadeUp 0.4s ease both}

        .add-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;box-shadow:0 0 20px rgba(99,102,241,0.3)}
        .add-btn:hover{transform:translateY(-1px);box-shadow:0 0 30px rgba(99,102,241,0.5)}

        .period-label{font-family:'DM Mono',monospace;font-size:12px;color:rgba(255,255,255,0.3);margin-bottom:20px;display:flex;align-items:center;gap:8px;animation:fadeUp 0.3s ease 0.1s both}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .section-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.25);margin:16px 0 8px;display:flex;align-items:center;gap:8px}
        .section-label::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
        .info-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:100px;padding:4px 12px;font-size:11px;color:rgba(255,255,255,0.3);font-family:'DM Mono',monospace}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px',animation:'fadeUp 0.3s ease both' }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:'28px',fontWeight:'800',color:'white',marginBottom:'4px' }}>
            🗂 Study Planner
          </h1>
          <p style={{ color:'rgba(255,255,255,0.35)',fontSize:'14px' }}>
            Your personal study schedule — visible only to you
          </p>
        </div>
        <button className="add-btn" onClick={() => { setShowForm(s => !s); setPlanType(activeType) }}>
          {showForm ? '✕ Cancel' : '+ Add Task'}
        </button>
      </div>

      {/* Privacy notice */}
      <div style={{
        background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)',
        borderRadius:'12px', padding:'10px 16px', marginBottom:'20px',
        fontSize:'13px', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:'10px',
        animation:'fadeUp 0.3s ease 0.05s both',
      }}>
        <span>🔒</span>
        <span>This planner is <strong style={{color:'#a5b4fc'}}>private</strong> — only you can see your tasks. No one else, not even admins.</span>
      </div>

      {/* Plan type tabs */}
      <div className="type-tabs">
        {PLAN_TYPES.map(t => (
          <button
            key={t.id}
            className="type-tab"
            style={activeType === t.id ? { background: t.color + '20', color: t.color } : {}}
            onClick={() => setActiveType(t.id)}
          >
            {t.icon} {t.label}
            <span style={{
              background: activeType === t.id ? t.color + '30' : 'rgba(255,255,255,0.06)',
              color: activeType === t.id ? t.color : 'rgba(255,255,255,0.3)',
              borderRadius:'100px', padding:'1px 7px', fontSize:'11px', fontFamily:"'DM Mono',monospace",
            }}>
              {tasks.filter(tk => tk.planType === t.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Current period label */}
      <div className="period-label">
        <span>{activeTypeData?.icon}</span>
        <span>{getPeriodLabel()}</span>
        <span className="info-chip">auto-deletes {activeType === 'daily' ? 'tonight' : activeType === 'weekly' ? 'end of week' : 'end of month'}</span>
      </div>

      {/* Add task form */}
      {showForm && (
        <div className="add-form">
          <div style={{ fontSize:'14px',fontWeight:'500',color:'white',marginBottom:'16px',fontFamily:"'Syne',sans-serif" }}>
            New Task
          </div>

          <input className="fi" placeholder="What do you want to study? (e.g. Chapter 3 - Process Scheduling)" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&addTask()}/>
          <textarea className="fi" placeholder="Notes or details (optional)..." value={description} onChange={e=>setDesc(e.target.value)} rows={2} style={{resize:'vertical'}}/>

          <div className="form-row">
            <div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',marginBottom:'6px'}}>Plan type</div>
              <div className="plan-type-select">
                {PLAN_TYPES.map(t => (
                  <button key={t.id} className={`pt-btn ${planType===t.id?'sel':''}`}
                    style={planType===t.id ? { background:t.color+'20', borderColor:t.color+'50', color:t.color } : {}}
                    onClick={()=>setPlanType(t.id)}>
                    {t.icon} {t.label}
                    <div style={{fontSize:'10px',color:planType===t.id?t.color+'bb':'rgba(255,255,255,0.2)',marginTop:'2px'}}>{t.desc.split(' ').slice(0,2).join(' ')}...</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',marginBottom:'6px'}}>Study time (optional)</div>
              <select className="fi" value={time} onChange={e=>setTime(e.target.value)} style={{marginBottom:0}}>
                <option value="">No specific time</option>
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
            <button onClick={addTask} disabled={adding||!title.trim()} style={{
              flex:2, padding:'11px', border:'none', borderRadius:'12px',
              background:adding||!title.trim()?'rgba(99,102,241,0.3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color:'white', cursor:adding||!title.trim()?'not-allowed':'pointer',
              fontSize:'14px', fontWeight:'500', fontFamily:"'DM Sans',sans-serif",
            }}>
              {adding ? 'Adding...' : '+ Add Task'}
            </button>
            <button onClick={()=>setShowForm(false)} style={{
              flex:1, padding:'11px', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:'12px', background:'none', color:'rgba(255,255,255,0.5)',
              cursor:'pointer', fontSize:'14px', fontFamily:"'DM Sans',sans-serif",
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      {filtered.length > 0 && <StatsBar tasks={filtered}/>}

      {/* Tasks */}
      {loading ? (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {[1,2,3].map(i => <div key={i} className="skel"/>)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div style={{fontSize:'56px',marginBottom:'14px'}}>{activeTypeData?.icon}</div>
          <div style={{fontSize:'16px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginBottom:'8px',fontFamily:"'Syne',sans-serif"}}>
            No {activeTypeData?.label.toLowerCase()} tasks yet
          </div>
          <div style={{fontSize:'13px',marginBottom:'20px'}}>
            Add your first study task for {activeType === 'daily' ? 'today' : activeType === 'weekly' ? 'this week' : 'this month'}!
          </div>
          <button className="add-btn" style={{margin:'0 auto'}} onClick={()=>{setShowForm(true);setPlanType(activeType)}}>
            + Add {activeTypeData?.label} Task
          </button>
        </div>
      ) : (
        <div>
          {/* Pending tasks */}
          {sorted.filter(t=>t.status==='pending').length > 0 && (
            <>
              <div className="section-label">○ Pending · {sorted.filter(t=>t.status==='pending').length}</div>
              <div className="tasks-list" style={{marginBottom:'16px'}}>
                {sorted.filter(t=>t.status==='pending').map((task,i) => (
                  <TaskCard key={task.id} task={task} i={i} onStatus={updateStatus} onDelete={deleteTask}/>
                ))}
              </div>
            </>
          )}

          {/* Done tasks */}
          {sorted.filter(t=>t.status==='done').length > 0 && (
            <>
              <div className="section-label" style={{color:'#34d399'}}>✓ Done · {sorted.filter(t=>t.status==='done').length}</div>
              <div className="tasks-list" style={{marginBottom:'16px'}}>
                {sorted.filter(t=>t.status==='done').map((task,i) => (
                  <TaskCard key={task.id} task={task} i={i} onStatus={updateStatus} onDelete={deleteTask}/>
                ))}
              </div>
            </>
          )}

          {/* Not done tasks */}
          {sorted.filter(t=>t.status==='not_done').length > 0 && (
            <>
              <div className="section-label" style={{color:'#f87171'}}>✕ Not Done · {sorted.filter(t=>t.status==='not_done').length}</div>
              <div className="tasks-list">
                {sorted.filter(t=>t.status==='not_done').map((task,i) => (
                  <TaskCard key={task.id} task={task} i={i} onStatus={updateStatus} onDelete={deleteTask}/>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
