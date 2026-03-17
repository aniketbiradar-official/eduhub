import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { can, isCRPlus, ROLE_COLORS } from '../useRole'

// ── 365 daily quotes — one per day of year ─────────────────────────────────
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Dream bigger. Do bigger.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
  { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
  { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { text: "Dream it. Believe it. Build it.", author: "Unknown" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "The secret to getting ahead is getting started.", author: "Mark Twain" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "If you can dream it, you can do it.", author: "Walt Disney" },
]

const getDailyQuote = () => {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

// ── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const end = parseInt(value) || 0
    if (end === 0) return
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])
  return <span>{display}</span>
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, delay, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: '18px', padding: '22px',
        cursor: onClick ? 'pointer' : 'default',
        animation: `statPop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
        transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { if(onClick) { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=color+'50' }}}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}
    >
      {/* Glow blob */}
      <div style={{ position:'absolute',top:'-20px',right:'-20px',width:'80px',height:'80px',borderRadius:'50%',background:color,opacity:0.08,filter:'blur(20px)',pointerEvents:'none' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'14px' }}>
        <div style={{ width:'42px',height:'42px',borderRadius:'12px',background:color+'20',border:`1px solid ${color}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>
          {icon}
        </div>
        {onClick && <div style={{fontSize:'12px',color:'rgba(255,255,255,0.2)'}}>→</div>}
      </div>
      <div style={{ fontFamily:"'Syne',sans-serif",fontSize:'28px',fontWeight:'800',color:'white',marginBottom:'4px',lineHeight:1 }}>
        <AnimatedNumber value={value}/>
      </div>
      <div style={{ fontSize:'12px',color:'rgba(255,255,255,0.4)',fontFamily:"'DM Mono',monospace" }}>
        {label}
      </div>
    </div>
  )
}

// ── Announcement preview card ─────────────────────────────────────────────
function AnnCard({ ann, i }) {
  return (
    <div style={{
      background: ann.urgent ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${ann.urgent ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '12px', padding: '14px 16px',
      animation: `fadeSlide 0.4s ease ${0.1 + i*0.07}s both`,
      borderLeft: ann.urgent ? '3px solid #ef4444' : undefined,
    }}>
      <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px',flexWrap:'wrap' }}>
        {ann.urgent && (
          <span style={{ background:'rgba(239,68,68,0.15)',color:'#f87171',fontSize:'9px',padding:'2px 7px',borderRadius:'100px',fontFamily:"'DM Mono',monospace",fontWeight:'700',letterSpacing:'0.06em' }}>⚠ URGENT</span>
        )}
        <span style={{ fontSize:'11px',color:'rgba(255,255,255,0.25)',fontFamily:"'DM Mono',monospace" }}>
          {ann.createdAt?.toDate?.()?.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) || 'Recent'}
        </span>
        <span style={{ fontSize:'11px',color:'rgba(255,255,255,0.2)' }}>· {ann.postedBy}</span>
      </div>
      <div style={{ fontWeight:'500',color:'white',fontSize:'14px',marginBottom:'3px' }}>{ann.title}</div>
      <div style={{ fontSize:'12px',color:'rgba(255,255,255,0.4)',lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
        {ann.body}
      </div>
    </div>
  )
}

// ── File preview card ─────────────────────────────────────────────────────
function FileCard({ file, i }) {
  const isImage = file.fileType?.startsWith('image/')
  return (
    <a href={file.url} target="_blank" rel="noreferrer" style={{
      display:'flex', alignItems:'center', gap:'12px',
      background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:'12px', padding:'12px 14px', textDecoration:'none',
      animation:`fadeSlide 0.4s ease ${0.1+i*0.07}s both`, transition:'all 0.15s',
    }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(99,102,241,0.3)'; e.currentTarget.style.background='rgba(99,102,241,0.06)' }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.background='rgba(255,255,255,0.02)' }}
    >
      <div style={{ width:'36px',height:'36px',borderRadius:'10px',background:'rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0 }}>
        {isImage?'🖼️':'📄'}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ color:'white',fontSize:'13px',fontWeight:'500',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{file.name}</div>
        <div style={{ fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'2px' }}>
          {file.subjectName} · {file.folderLabel}
        </div>
      </div>
      <div style={{ color:'rgba(255,255,255,0.2)',fontSize:'14px',flexShrink:0 }}>↓</div>
    </a>
  )
}

// ── Today's planner tasks preview ─────────────────────────────────────────
function PlannerPreview({ userId }) {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    const q = query(
      collection(db, 'planner', userId, 'tasks'),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.planType==='daily'))
    }, ()=>{})
    return ()=>unsub()
  }, [userId])

  if (tasks.length === 0) return null

  const done = tasks.filter(t=>t.status==='done').length

  return (
    <div style={{ animation:'fadeSlide 0.5s ease 0.3s both' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px' }}>
        <div style={{ fontFamily:"'Syne',sans-serif",fontSize:'15px',fontWeight:'700',color:'white' }}>
          📅 Today's Tasks
        </div>
        <span style={{ fontSize:'12px',color:'rgba(255,255,255,0.3)',fontFamily:"'DM Mono',monospace" }}>
          {done}/{tasks.length} done
        </span>
      </div>
      <div style={{ height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginBottom:'12px',overflow:'hidden' }}>
        <div style={{ height:'100%',background:'#10b981',borderRadius:'2px',width:`${tasks.length>0?Math.round(done/tasks.length*100):0}%`,transition:'width 0.5s ease' }}/>
      </div>
      {tasks.slice(0,4).map(t => (
        <div key={t.id} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
          <div style={{
            width:'18px',height:'18px',borderRadius:'50%',flexShrink:0,
            border:`1.5px solid ${t.status==='done'?'#34d399':t.status==='not_done'?'#f87171':'rgba(255,255,255,0.2)'}`,
            background: t.status==='done'?'rgba(16,185,129,0.15)':t.status==='not_done'?'rgba(239,68,68,0.12)':'transparent',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',
            color: t.status==='done'?'#34d399':'#f87171',
          }}>
            {t.status==='done'?'✓':t.status==='not_done'?'✕':''}
          </div>
          <span style={{
            fontSize:'12px',
            color:t.status==='done'?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.7)',
            textDecoration:t.status==='done'?'line-through':'none',
            flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
          }}>{t.title}</span>
          {t.time!==null&&t.time!==undefined&&(
            <span style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',fontFamily:"'DM Mono',monospace",flexShrink:0}}>
              {t.time%12||12}{t.time<12?'am':'pm'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Timetable today ────────────────────────────────────────────────────────
function TodaySchedule() {
  const [slots, setSlots]   = useState([])
  const [dayNote, setDayNote] = useState('')
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const todayName = DAYS[new Date().getDay()]
  const SLOTS = ['9:00','10:00','11:00','12:00','1:00','2:00','3:00','4:00']

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'config'),
      snap => {
        const tt = snap.docs.find(d=>d.id==='timetable')
        if (tt) {
          const data = tt.data()
          const todaySlots = SLOTS.map(s=>({slot:s,...(data.slots?.[todayName]?.[s]||{})})).filter(s=>s.subject)
          setSlots(todaySlots)
          setDayNote(data.notes?.[todayName]||'')
        }
      }, ()=>{}
    )
    return ()=>unsub()
  }, [todayName])

  if (slots.length === 0 && !dayNote) return (
    <div style={{textAlign:'center',padding:'20px',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>
      No classes scheduled today
    </div>
  )

  return (
    <div>
      {dayNote && (
        <div style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'8px',padding:'8px 12px',marginBottom:'10px',fontSize:'12px',color:'#fbbf24',display:'flex',gap:'6px'}}>
          <span>📌</span>{dayNote}
        </div>
      )}
      {slots.map((s,i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
          <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',fontFamily:"'DM Mono',monospace",width:'40px',flexShrink:0}}>{s.slot}</span>
          <span style={{fontSize:'13px',color:'white',fontWeight:'500',flex:1}}>{s.subject}</span>
          {s.room&&<span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>📍{s.room}</span>}
        </div>
      ))}
    </div>
  )
}

// ── Main Home Page ─────────────────────────────────────────────────────────
export default function Home({ user, role, setPage }) {
  const [announcements, setAnnouncements] = useState([])
  const [recentFiles, setRecentFiles]     = useState([])
  const [fileCount, setFileCount]         = useState(0)
  const [annCount, setAnnCount]           = useState(0)
  const [loading, setLoading]             = useState(true)
  const [timeStr, setTimeStr]             = useState('')
  const [particles, setParticles]         = useState([])

  const quote      = getDailyQuote()
  const roleStyle  = ROLE_COLORS[role] || ROLE_COLORS.student
  const firstName  = user.displayName?.split(' ')[0] || 'Student'

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'
  const greetEmoji = hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 17 ? '⛅' : hour < 21 ? '🌆' : '🌙'

  // Live clock
  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Generate particles
  useEffect(() => {
    setParticles(Array.from({length:20},(_,i)=>({
      id:i, x:Math.random()*100, y:Math.random()*100,
      size: 1 + Math.random()*2, opacity: 0.05 + Math.random()*0.1,
      dur: 6 + Math.random()*8, delay: Math.random()*4,
    })))
  }, [])

  // Load data
  useEffect(() => {
    setLoading(true)
    const annQ  = query(collection(db,'announcements'), orderBy('createdAt','desc'), limit(3))
    const filesQ = query(collection(db,'fs_files'), orderBy('createdAt','desc'), limit(4))
    const allAnn  = query(collection(db,'announcements'), orderBy('createdAt','desc'), limit(100))
    const allFiles = query(collection(db,'fs_files'), orderBy('createdAt','desc'), limit(100))

    const u1 = onSnapshot(annQ, snap => {
      setAnnouncements(snap.docs.map(d=>({id:d.id,...d.data()})))
      setLoading(false)
    }, ()=>setLoading(false))
    const u2 = onSnapshot(filesQ, snap => setRecentFiles(snap.docs.map(d=>({id:d.id,...d.data()}))))
    const u3 = onSnapshot(allAnn, snap => setAnnCount(snap.size))
    const u4 = onSnapshot(allFiles, snap => setFileCount(snap.size))

    return () => { u1();u2();u3();u4() }
  }, [])

  const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
        @keyframes fadeSlide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes statPop{from{opacity:0;transform:scale(0.85) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes quoteIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes pulse2{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes clockTick{from{opacity:0.7}to{opacity:1}}
        @keyframes orbitSpin{from{transform:rotate(0deg) translateX(6px)}to{transform:rotate(360deg) translateX(6px)}}
        @keyframes blobMove{0%,100%{border-radius:60% 40% 70% 30%/50% 60% 40% 70%}50%{border-radius:40% 60% 30% 70%/60% 40% 70% 30%}}

        .home-wrap{padding:0;position:relative}
        .hero-section{position:relative;overflow:hidden;border-radius:24px;padding:36px 36px 32px;margin-bottom:28px;background:linear-gradient(135deg,#0d0f1a 0%,#111320 50%,#0a0c16 100%);border:1px solid rgba(255,255,255,0.07);animation:fadeSlide 0.5s ease both}
        .hero-blob{position:absolute;width:300px;height:300px;top:-80px;right:-60px;background:radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%);pointer-events:none;animation:blobMove 12s ease-in-out infinite}
        .hero-blob2{position:absolute;width:200px;height:200px;bottom:-60px;left:-40px;background:radial-gradient(circle,rgba(16,185,129,0.1) 0%,transparent 70%);pointer-events:none;animation:blobMove 10s ease-in-out infinite reverse}
        .greeting-line{font-size:13px;color:rgba(255,255,255,0.35);font-family:'DM Mono',monospace;letter-spacing:0.08em;margin-bottom:8px;display:flex;align-items:center;gap:8px}
        .greeting-name{font-family:'Syne',sans-serif;font-size:clamp(28px,4vw,42px);font-weight:800;line-height:1.05;margin-bottom:8px}
        .role-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:100px;font-size:12px;font-weight:500;font-family:'DM Mono',monospace;margin-bottom:20px}
        .clock-display{font-family:'DM Mono',monospace;font-size:36px;font-weight:400;color:rgba(255,255,255,0.15);letter-spacing:0.05em;animation:clockTick 1s ease-in-out infinite}
        .date-display{font-size:13px;color:rgba(255,255,255,0.25);font-family:'DM Mono',monospace;margin-top:4px}

        .quote-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-left:3px solid #6366f1;border-radius:16px;padding:20px 24px;margin-bottom:28px;animation:quoteIn 0.6s ease 0.2s both;position:relative;overflow:hidden}
        .quote-shimmer{position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(99,102,241,0.05) 50%,transparent 100%);background-size:200% 100%;animation:shimmer 3s linear infinite;pointer-events:none}
        .quote-text{font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;font-style:italic;margin-bottom:8px}
        .quote-author{font-size:12px;color:'#6366f1';font-family:'DM Mono',monospace;color:#818cf8}

        .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px}
        .main-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
        @media(max-width:900px){.main-grid{grid-template-columns:1fr}}
        .section-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:22px;position:relative;overflow:hidden}
        .section-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)}
        .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
        .section-title{font-family:'Syne',sans-serif;font-size:'15px';font-weight:700;color:white;font-size:15px}
        .view-all-btn{font-size:12px;color:rgba(255,255,255,0.3);cursor:pointer;border:none;background:none;font-family:'DM Sans',sans-serif;transition:color 0.15s;padding:4px 8px;border-radius:6px}
        .view-all-btn:hover{color:'#a5b4fc';color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.05)}

        .skel{background:rgba(255,255,255,0.04);border-radius:10px;animation:skelpulse 1.5s ease-in-out infinite}
        @keyframes skelpulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .empty-tiny{text-align:center;padding:24px 12px;color:rgba(255,255,255,0.2);font-size:13px}

        .quick-links{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;animation:fadeSlide 0.5s ease 0.35s both}
        .qlink{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 16px;font-size:13px;color:rgba(255,255,255,0.55);text-decoration:none;transition:all 0.15s}
        .qlink:hover{background:rgba(255,255,255,0.08);color:white;transform:translateY(-2px)}

        .particle{position:absolute;border-radius:50%;background:white;pointer-events:none;animation:float var(--dur) ease-in-out var(--delay) infinite}
      `}</style>

      <div className="home-wrap">

        {/* ── HERO SECTION ── */}
        <div className="hero-section">
          <div className="hero-blob"/>
          <div className="hero-blob2"/>

          {/* Floating particles */}
          {particles.map(p => (
            <div key={p.id} className="particle" style={{
              left:`${p.x}%`, top:`${p.y}%`,
              width:`${p.size}px`, height:`${p.size}px`,
              opacity:p.opacity, '--dur':`${p.dur}s`, '--delay':`${p.delay}s`,
            }}/>
          ))}

          <div style={{position:'relative',zIndex:2, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'20px'}}>
            <div>
              <div className="greeting-line">
                <span style={{animation:'pulse2 2s ease-in-out infinite'}}>●</span>
                {today}
              </div>

              <div className="greeting-name">
                <span style={{
                  background:`linear-gradient(135deg, white 0%, ${roleStyle.text} 60%, #00D9C0 100%)`,
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                }}>
                  {greeting}, {firstName}
                </span>
                <span style={{marginLeft:'10px'}}>{greetEmoji}</span>
              </div>

              <div className="role-chip" style={{background:roleStyle.bg, border:`1px solid ${roleStyle.border}`, color:roleStyle.text}}>
                <span>●</span> {role === 'admin' ? '🛡️ Admin' : role === 'cr' ? '✏️ Class Rep' : '📖 Student'}
              </div>

              <div style={{fontSize:'14px',color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>
                Here's what's happening in your class today.
              </div>
            </div>

            {/* Live clock */}
            <div style={{textAlign:'right'}}>
              <div className="clock-display">{timeStr}</div>
              <div className="date-display">{new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</div>
            </div>
          </div>
        </div>

        {/* ── DAILY QUOTE ── */}
        <div className="quote-card">
          <div className="quote-shimmer"/>
          <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
            <div style={{
              fontSize:'28px',flexShrink:0,marginTop:'2px',
              animation:'float 4s ease-in-out infinite',
            }}>💡</div>
            <div>
              <div style={{fontSize:'10px',letterSpacing:'0.12em',color:'rgba(99,102,241,0.7)',fontFamily:"'DM Mono',monospace",marginBottom:'8px',textTransform:'uppercase'}}>
                Quote of the Day
              </div>
              <div className="quote-text">"{quote.text}"</div>
              <div className="quote-author">— {quote.author}</div>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="stats-grid">
          <StatCard icon="📁" label="total files" value={fileCount} color="#6366f1" delay={0.1} onClick={()=>setPage('files')}/>
          <StatCard icon="📢" label="announcements" value={annCount} color="#f59e0b" delay={0.15} onClick={()=>setPage('announcements')}/>
          <StatCard icon="🗓" label="timetable" value="Mon–Sat" color="#10b981" delay={0.2} onClick={()=>setPage('timetable')}/>
          <StatCard icon="🗂" label="study planner" value="personal" color="#ec4899" delay={0.25} onClick={()=>setPage('planner')}/>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="main-grid">

          {/* Announcements */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">📢 Announcements</div>
              <button className="view-all-btn" onClick={()=>setPage('announcements')}>View all →</button>
            </div>
            {loading ? (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {[1,2].map(i=><div key={i} className="skel" style={{height:'72px'}}/>)}
              </div>
            ) : announcements.length === 0 ? (
              <div className="empty-tiny">
                <div style={{fontSize:'28px',marginBottom:'6px'}}>📭</div>
                No announcements yet.<br/>
                <span style={{fontSize:'11px'}}>{isCRPlus(role) ? 'Post your first announcement!' : 'Your CR will post updates here.'}</span>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {announcements.map((ann,i) => <AnnCard key={ann.id} ann={ann} i={i}/>)}
              </div>
            )}
          </div>

          {/* Recent Files */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">📁 Recent Files</div>
              <button className="view-all-btn" onClick={()=>setPage('files')}>Browse →</button>
            </div>
            {loading ? (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {[1,2,3].map(i=><div key={i} className="skel" style={{height:'56px'}}/>)}
              </div>
            ) : recentFiles.length === 0 ? (
              <div className="empty-tiny">
                <div style={{fontSize:'28px',marginBottom:'6px'}}>📂</div>
                No files uploaded yet.<br/>
                <span style={{fontSize:'11px'}}>{isCRPlus(role)?'Upload the first file!':'Your CR will upload files here.'}</span>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {recentFiles.map((f,i)=><FileCard key={f.id} file={f} i={i}/>)}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">🗓 Today's Schedule</div>
              <button className="view-all-btn" onClick={()=>setPage('timetable')}>Full timetable →</button>
            </div>
            <TodaySchedule/>
          </div>

          {/* Study Planner preview */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">🗂 Today's Study Plan</div>
              <button className="view-all-btn" onClick={()=>setPage('planner')}>Open planner →</button>
            </div>
            <PlannerPreview userId={user.uid}/>
          </div>
        </div>

        {/* ── QUICK LINKS ── */}
        <div style={{marginBottom:'8px',fontSize:'11px',color:'rgba(255,255,255,0.2)',fontFamily:"'DM Mono',monospace",letterSpacing:'0.08em',textTransform:'uppercase',animation:'fadeSlide 0.5s ease 0.3s both'}}>
          Quick Links
        </div>
        <div className="quick-links">
          {[
            { label: 'College Website',  icon: '🏫', url: '#' },
            { label: 'Exam Portal',      icon: '📝', url: '#' },
            { label: 'CGPA Calculator',  icon: '🧮', url: 'https://cgpacalculator.in' },
            { label: 'Class WhatsApp',   icon: '💬', url: '#' },
            { label: 'Google Meet',      icon: '🎥', url: 'https://meet.google.com' },
          ].map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="qlink">
              <span style={{fontSize:'16px'}}>{l.icon}</span>
              <span>{l.label}</span>
            </a>
          ))}
        </div>

      </div>
    </>
  )
}
