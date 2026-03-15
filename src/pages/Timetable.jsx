import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { can } from '../useRole'

const DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SLOTS = ['9:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00']

const SUBJECT_COLORS = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b',
  '#ec4899','#8b5cf6','#ef4444','#14b8a6',
  '#f97316','#84cc16','#06b6d4','#a78bfa',
]

// Auto-assign a consistent color to each subject name
function getSubjectColor(name, colorMap) {
  if (!name || name.trim() === '') return null
  if (colorMap[name]) return colorMap[name]
  const idx = Object.keys(colorMap).length % SUBJECT_COLORS.length
  colorMap[name] = SUBJECT_COLORS[idx]
  return colorMap[name]
}

// Empty timetable structure
function emptyTimetable() {
  const tt = { notes: {}, slots: {} }
  DAYS.forEach(day => {
    tt.slots[day] = {}
    SLOTS.forEach(slot => {
      tt.slots[day][slot] = { subject: '', room: '', prof: '' }
    })
    tt.notes[day] = ''
  })
  return tt
}

// ── Cell Editor ───────────────────────────────────────────────────────────
function CellEditor({ value, onSave, onClose }) {
  const [subject, setSubject] = useState(value.subject || '')
  const [room,    setRoom]    = useState(value.room    || '')
  const [prof,    setProf]    = useState(value.prof    || '')
  const ref = useRef()

  useEffect(() => {
    ref.current?.querySelector('input')?.focus()
    const handleKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 50,
      background: '#151823', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '12px', padding: '14px', width: '200px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      animation: 'fadeUp 0.15s ease both',
    }}>
      <input
        placeholder="Subject"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSave({ subject, room, prof })}
        style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'7px 10px', color:'white', fontSize:'12px', fontFamily:"'DM Sans',sans-serif", outline:'none', marginBottom:'6px' }}
      />
      <input
        placeholder="Room / Lab"
        value={room}
        onChange={e => setRoom(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSave({ subject, room, prof })}
        style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'7px 10px', color:'white', fontSize:'12px', fontFamily:"'DM Sans',sans-serif", outline:'none', marginBottom:'6px' }}
      />
      <input
        placeholder="Professor"
        value={prof}
        onChange={e => setProf(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSave({ subject, room, prof })}
        style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', padding:'7px 10px', color:'white', fontSize:'12px', fontFamily:"'DM Sans',sans-serif", outline:'none', marginBottom:'10px' }}
      />
      <div style={{ display:'flex', gap:'6px' }}>
        <button onClick={onClose} style={{ flex:1, padding:'6px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'7px', background:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'12px', fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
        <button onClick={() => onSave({ subject, room, prof })} style={{ flex:1, padding:'6px', border:'none', borderRadius:'7px', background:'#6366f1', color:'white', cursor:'pointer', fontSize:'12px', fontFamily:"'DM Sans',sans-serif", fontWeight:'500' }}>Save</button>
      </div>
    </div>
  )
}

export default function Timetable({ user, role }) {
  const [timetable, setTimetable]   = useState(emptyTimetable())
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [editCell, setEditCell]     = useState(null) // {day, slot}
  const [editNote, setEditNote]     = useState(null) // day string
  const [noteVal, setNoteVal]       = useState('')
  const [toast, setToast]           = useState('')
  const [viewMode, setViewMode]     = useState('week') // 'week' | 'day'
  const [activeDay, setActiveDay]   = useState(DAYS[new Date().getDay() === 0 ? 0 : new Date().getDay() - 1] || DAYS[0])
  const [colorMap]                  = useState({})
  const ttRef                       = useRef()
  const canEdit                     = can(role, 'edit_timetable')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // Today highlight
  const todayIdx  = new Date().getDay() // 0=Sun,1=Mon...
  const todayName = todayIdx >= 1 && todayIdx <= 6 ? DAYS[todayIdx - 1] : null

  // Load timetable from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'timetable'), snap => {
      if (snap.exists()) {
        const data = snap.data()
        // Merge with empty to ensure all days/slots exist
        const base = emptyTimetable()
        if (data.slots) {
          DAYS.forEach(day => {
            if (data.slots[day]) {
              SLOTS.forEach(slot => {
                if (data.slots[day][slot]) {
                  base.slots[day][slot] = data.slots[day][slot]
                }
              })
            }
            base.notes[day] = data.notes?.[day] || ''
          })
        }
        setTimetable(base)
      }
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  // Save entire timetable to Firestore
  const saveTimetable = async (updated) => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'config', 'timetable'), {
        ...updated,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName,
      })
      showToast('Saved ✓')
    } catch { showToast('Save failed.') }
    setSaving(false)
  }

  // Update a single cell
  const updateCell = (day, slot, value) => {
    const updated = {
      ...timetable,
      slots: {
        ...timetable.slots,
        [day]: {
          ...timetable.slots[day],
          [slot]: value,
        }
      }
    }
    setTimetable(updated)
    setEditCell(null)
    saveTimetable(updated)
  }

  // Update a day note
  const updateNote = (day, note) => {
    const updated = {
      ...timetable,
      notes: { ...timetable.notes, [day]: note }
    }
    setTimetable(updated)
    setEditNote(null)
    saveTimetable(updated)
  }

  // Clear a cell
  const clearCell = (day, slot) => {
    updateCell(day, slot, { subject: '', room: '', prof: '' })
  }

  // Download as PNG
  const downloadPNG = async () => {
    const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default
    const canvas = await html2canvas(ttRef.current, {
      backgroundColor: '#0c0e16', scale: 2,
      useCORS: true, allowTaint: true,
    })
    const link = document.createElement('a')
    link.download = 'EduHub-Timetable.png'
    link.href = canvas.toDataURL()
    link.click()
    showToast('Downloaded!')
  }

  // Build color map from current timetable
  const allSubjects = {}
  DAYS.forEach(day => SLOTS.forEach(slot => {
    const s = timetable.slots[day]?.[slot]?.subject
    if (s) getSubjectColor(s, allSubjects)
  }))

  // Today's classes
  const todayClasses = todayName
    ? SLOTS.map(slot => ({ slot, ...timetable.slots[todayName]?.[slot] })).filter(c => c.subject)
    : []

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .tt-wrap{overflow-x:auto;border-radius:16px;border:1px solid rgba(255,255,255,0.07);animation:fadeUp 0.3s ease 0.1s both}
        .tt-table{border-collapse:collapse;width:100%;min-width:700px}
        .tt-table th{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.06em;color:rgba(255,255,255,0.35);text-transform:uppercase;padding:12px 10px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07);text-align:center;white-space:nowrap}
        .tt-table th.today-h{color:#a5b4fc;background:rgba(99,102,241,0.08)}
        .tt-time-col{font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,0.25);padding:8px 12px;border-right:1px solid rgba(255,255,255,0.05);text-align:right;white-space:nowrap;background:rgba(255,255,255,0.01);vertical-align:middle}
        .tt-cell{padding:5px;border:1px solid rgba(255,255,255,0.04);position:relative;vertical-align:top;min-width:110px}
        .tt-cell.today-col{background:rgba(99,102,241,0.03)}
        .cell-inner{border-radius:8px;padding:8px 10px;min-height:54px;cursor:pointer;transition:all 0.15s;position:relative}
        .cell-inner.empty{border:1.5px dashed rgba(255,255,255,0.05)}
        .cell-inner.filled{border:1px solid transparent}
        .cell-inner.empty:hover{border-color:rgba(99,102,241,0.3);background:rgba(99,102,241,0.05)}
        .cell-inner.filled:hover .cell-actions{opacity:1}
        .cell-subject{font-size:12px;font-weight:600;color:white;margin-bottom:3px;line-height:1.3}
        .cell-meta{font-size:10px;color:rgba(255,255,255,0.45);line-height:1.5}
        .cell-actions{position:absolute;top:4px;right:4px;opacity:0;transition:opacity 0.15s;display:flex;gap:3px}
        .cell-action-btn{width:18px;height:18px;border-radius:4px;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);color:rgba(255,255,255,0.6);transition:all 0.15s}
        .cell-action-btn:hover{background:rgba(0,0,0,0.7);color:white}
        .note-row td{padding:0}
        .note-cell{padding:4px 5px;border-bottom:1px solid rgba(255,255,255,0.05)}
        .note-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:6px;padding:3px 8px;font-size:11px;color:#fbbf24;cursor:pointer;transition:all 0.15s;max-width:100%;overflow:hidden}
        .note-pill:hover{background:rgba(245,158,11,0.18)}
        .note-empty{display:inline-block;padding:3px 8px;font-size:11px;color:rgba(255,255,255,0.15);cursor:pointer;border-radius:6px;border:1px dashed rgba(255,255,255,0.06);transition:all 0.15s}
        .note-empty:hover{border-color:rgba(245,158,11,0.3);color:#fbbf24}
        .view-toggle{display:flex;gap:4px;background:rgba(255,255,255,0.04);padding:4px;border-radius:10px}
        .vt-btn{padding:7px 16px;border-radius:7px;font-size:13px;font-weight:500;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all 0.15s;color:rgba(255,255,255,0.4);background:none}
        .vt-btn.active{background:rgba(99,102,241,0.2);color:#a5b4fc}
        .day-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
        .day-tab{padding:8px 16px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.07);font-family:'DM Sans',sans-serif;transition:all 0.15s;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4)}
        .day-tab.active{background:rgba(99,102,241,0.15);color:#a5b4fc;border-color:rgba(99,102,241,0.3)}
        .day-tab.today{border-color:rgba(99,102,241,0.4);color:#a5b4fc}
        .legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;animation:fadeUp 0.3s ease 0.2s both}
        .leg-item{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.4)}
        .leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .today-card{background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:14px;padding:16px 20px;margin-bottom:24px;animation:fadeUp 0.3s ease both}
        .skel-row{height:60px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:6px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;animation:fadeUp 0.3s ease both}
        .action-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .action-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6)}
        .action-btn:hover{background:rgba(255,255,255,0.08);color:white}
        .saving-dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:blink 1s ease-in-out infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @media(max-width:700px){.hide-mob{display:none}}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div className="header-row">
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'28px', fontWeight:'800', color:'white', marginBottom:'4px' }}>Timetable</h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'14px', display:'flex', alignItems:'center', gap:'8px' }}>
            Weekly class schedule
            {saving && <><div className="saving-dot"/><span style={{fontSize:'12px',color:'#34d399'}}>Saving...</span></>}
          </p>
        </div>
        <div className="action-bar">
          {/* View toggle */}
          <div className="view-toggle">
            <button className={`vt-btn ${viewMode==='week'?'active':''}`} onClick={()=>setViewMode('week')}>Week</button>
            <button className={`vt-btn ${viewMode==='day'?'active':''}`} onClick={()=>setViewMode('day')}>Day</button>
          </div>
          {/* Download */}
          <button className="action-btn hide-mob" onClick={downloadPNG}>⬇ Download PNG</button>
          {canEdit && (
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', fontFamily:"'DM Mono',monospace" }}>
              click any cell to edit
            </div>
          )}
        </div>
      </div>

      {/* Today's highlight strip */}
      {todayName && todayClasses.length > 0 && (
        <div className="today-card">
          <div style={{ fontSize:'12px', color:'#a5b4fc', fontFamily:"'DM Mono',monospace", letterSpacing:'0.06em', marginBottom:'10px' }}>
            TODAY — {todayName.toUpperCase()}
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {todayClasses.map(c => {
              const color = getSubjectColor(c.subject, colorMap)
              return (
                <div key={c.slot} style={{
                  background: color + '18', border: `1px solid ${color}40`,
                  borderRadius: '10px', padding: '8px 14px',
                }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color: color }}>{c.subject}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>
                    {c.slot} {c.room && `· ${c.room}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Day tabs (for day view) */}
      {viewMode === 'day' && (
        <div className="day-tabs">
          {DAYS.map(day => (
            <button key={day} className={`day-tab ${activeDay===day?'active':''} ${day===todayName?'today':''}`}
              onClick={()=>setActiveDay(day)}>
              {day.slice(0,3)}
              {day === todayName && <span style={{fontSize:'9px',marginLeft:'4px',color:'#a5b4fc'}}>●</span>}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div>{[1,2,3,4,5].map(i=><div key={i} className="skel-row"/>)}</div>
      ) : viewMode === 'week' ? (

        /* ── WEEK VIEW ── */
        <div className="tt-wrap" ref={ttRef}>
          <table className="tt-table">
            <thead>
              <tr>
                <th style={{width:'60px'}}>Time</th>
                {DAYS.map(day => (
                  <th key={day} className={day===todayName?'today-h':''}>
                    {day.slice(0,3)}
                    {day===todayName && <div style={{fontSize:'9px',color:'#6366f1',marginTop:'2px'}}>TODAY</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(slot => (
                <tr key={slot}>
                  <td className="tt-time-col">{slot}</td>
                  {DAYS.map(day => {
                    const cell  = timetable.slots[day]?.[slot] || {}
                    const color = cell.subject ? getSubjectColor(cell.subject, colorMap) : null
                    const isEditing = editCell?.day===day && editCell?.slot===slot

                    return (
                      <td key={day} className={`tt-cell ${day===todayName?'today-col':''}`}>
                        <div
                          className={`cell-inner ${cell.subject?'filled':'empty'}`}
                          style={ cell.subject ? { background: color+'18', borderColor: color+'35' } : {} }
                          onClick={() => canEdit && setEditCell({ day, slot })}
                        >
                          {cell.subject ? (
                            <>
                              <div className="cell-subject" style={{ color }}>{cell.subject}</div>
                              <div className="cell-meta">
                                {cell.room && <div>📍 {cell.room}</div>}
                                {cell.prof && <div>👤 {cell.prof}</div>}
                              </div>
                              {canEdit && (
                                <div className="cell-actions">
                                  <button className="cell-action-btn"
                                    onClick={e => { e.stopPropagation(); setEditCell({ day, slot }) }}>✏</button>
                                  <button className="cell-action-btn"
                                    onClick={e => { e.stopPropagation(); clearCell(day, slot) }}
                                    style={{color:'rgba(239,68,68,0.7)'}}>✕</button>
                                </div>
                              )}
                            </>
                          ) : (
                            canEdit && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.1)', textAlign:'center', paddingTop:'6px' }}>+</div>
                          )}
                        </div>

                        {/* Inline editor popover */}
                        {isEditing && (
                          <CellEditor
                            value={cell}
                            onSave={(val) => updateCell(day, slot, val)}
                            onClose={() => setEditCell(null)}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Notes row */}
              <tr className="note-row">
                <td className="tt-time-col" style={{fontSize:'10px'}}>Note</td>
                {DAYS.map(day => {
                  const note = timetable.notes[day] || ''
                  const isEditingNote = editNote === day
                  return (
                    <td key={day} className="note-cell">
                      {isEditingNote ? (
                        <input
                          autoFocus
                          defaultValue={note}
                          placeholder="e.g. Holiday – Diwali"
                          onBlur={e => updateNote(day, e.target.value)}
                          onKeyDown={e => { if (e.key==='Enter') updateNote(day, e.target.value); if(e.key==='Escape') setEditNote(null) }}
                          style={{ width:'100%', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'6px', padding:'4px 8px', color:'#fbbf24', fontSize:'11px', fontFamily:"'DM Sans',sans-serif", outline:'none' }}
                        />
                      ) : note ? (
                        <div className="note-pill" onClick={()=>canEdit&&setEditNote(day)}>
                          <span>📌</span>
                          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{note}</span>
                        </div>
                      ) : canEdit ? (
                        <div className="note-empty" onClick={()=>setEditNote(day)}>+ note</div>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

      ) : (

        /* ── DAY VIEW ── */
        <div style={{ animation:'fadeUp 0.3s ease both' }}>
          {timetable.notes[activeDay] && (
            <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'12px', padding:'10px 16px', marginBottom:'16px', fontSize:'13px', color:'#fbbf24', display:'flex', gap:'8px' }}>
              <span>📌</span>{timetable.notes[activeDay]}
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {SLOTS.map(slot => {
              const cell  = timetable.slots[activeDay]?.[slot] || {}
              const color = cell.subject ? getSubjectColor(cell.subject, colorMap) : null
              const isEditing = editCell?.day===activeDay && editCell?.slot===slot

              return (
                <div key={slot} style={{ display:'flex', gap:'12px', alignItems:'stretch' }}>
                  {/* Time */}
                  <div style={{ width:'50px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'flex-end', fontFamily:"'DM Mono',monospace", fontSize:'12px', color:'rgba(255,255,255,0.3)' }}>
                    {slot}
                  </div>

                  {/* Cell */}
                  <div style={{ flex:1, position:'relative' }}>
                    <div
                      style={{
                        borderRadius:'12px', padding:'14px 16px', cursor: canEdit?'pointer':'default',
                        background: cell.subject ? color+'18' : 'rgba(255,255,255,0.02)',
                        border: cell.subject ? `1px solid ${color}35` : '1px dashed rgba(255,255,255,0.07)',
                        transition: 'all 0.15s', minHeight:'54px',
                      }}
                      onClick={() => canEdit && setEditCell({ day:activeDay, slot })}
                      onMouseEnter={e => !cell.subject && canEdit && (e.currentTarget.style.borderColor='rgba(99,102,241,0.3)')}
                      onMouseLeave={e => !cell.subject && canEdit && (e.currentTarget.style.borderColor='rgba(255,255,255,0.07)')}
                    >
                      {cell.subject ? (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div>
                            <div style={{ fontSize:'15px', fontWeight:'600', color, marginBottom:'4px' }}>{cell.subject}</div>
                            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', display:'flex', gap:'12px' }}>
                              {cell.room && <span>📍 {cell.room}</span>}
                              {cell.prof && <span>👤 {cell.prof}</span>}
                            </div>
                          </div>
                          {canEdit && (
                            <div style={{ display:'flex', gap:'6px' }}>
                              <button onClick={e=>{e.stopPropagation();setEditCell({day:activeDay,slot})}} style={{background:'rgba(255,255,255,0.07)',border:'none',color:'rgba(255,255,255,0.5)',borderRadius:'7px',padding:'5px 8px',cursor:'pointer',fontSize:'12px'}}>✏</button>
                              <button onClick={e=>{e.stopPropagation();clearCell(activeDay,slot)}} style={{background:'rgba(239,68,68,0.1)',border:'none',color:'rgba(239,68,68,0.7)',borderRadius:'7px',padding:'5px 8px',cursor:'pointer',fontSize:'12px'}}>✕</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        canEdit && <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.15)', textAlign:'center' }}>+ Add class</div>
                      )}
                    </div>

                    {isEditing && (
                      <CellEditor
                        value={cell}
                        onSave={(val) => updateCell(activeDay, slot, val)}
                        onClose={() => setEditCell(null)}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Note for this day */}
          {canEdit && (
            <div style={{ marginTop:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', fontFamily:"'DM Mono',monospace" }}>Day note:</span>
              {editNote === activeDay ? (
                <input
                  autoFocus
                  defaultValue={timetable.notes[activeDay]||''}
                  placeholder="e.g. Holiday – Ganesh Chaturthi"
                  onBlur={e=>updateNote(activeDay,e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')updateNote(activeDay,e.target.value);if(e.key==='Escape')setEditNote(null)}}
                  style={{ flex:1, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'8px', padding:'8px 12px', color:'#fbbf24', fontSize:'13px', fontFamily:"'DM Sans',sans-serif", outline:'none' }}
                />
              ) : (
                <div className="note-pill" style={{ cursor:'pointer' }} onClick={()=>setEditNote(activeDay)}>
                  <span>📌</span>
                  <span>{timetable.notes[activeDay] || 'Add a note for this day...'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subject color legend */}
      {Object.keys(colorMap).length > 0 && (
        <div className="legend">
          <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', fontFamily:"'DM Mono',monospace", letterSpacing:'0.06em', textTransform:'uppercase', marginRight:'4px' }}>Legend:</span>
          {Object.entries(colorMap).map(([name, color]) => (
            <div key={name} className="leg-item">
              <div className="leg-dot" style={{ background: color }}/>
              {name}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
