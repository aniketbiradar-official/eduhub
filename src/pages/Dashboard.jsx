import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { can, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } from '../useRole'
import Home from './Home'
import FileSystem from './FileSystem'
import Announcements from './Announcements'
import Timetable from './Timetable'
import CRPanel from './CRPanel'
import AdminPanel from './AdminPanel'

const NAV = [
  { id: 'home',          icon: '⌂',  label: 'Dashboard',    permission: 'view_dashboard' },
  { id: 'files',         icon: '📁', label: 'File System',   permission: 'view_notes' },
  { id: 'announcements', icon: '📢', label: 'Announcements', permission: 'view_announcements' },
  { id: 'timetable',     icon: '🗓', label: 'Timetable',     permission: 'view_timetable' },
]
const CR_NAV    = [{ id: 'cr',    icon: '⚙️', label: 'CR Panel',    permission: 'manage_courses' }]
const ADMIN_NAV = [{ id: 'admin', icon: '🛡️', label: 'Admin Panel',  permission: 'manage_users'  }]

function AccessDenied() {
  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center',padding:'40px' }}>
      <div style={{ fontSize:'64px',marginBottom:'16px' }}>🔒</div>
      <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:'24px',color:'white',marginBottom:'8px' }}>Access Denied</h2>
      <p style={{ color:'rgba(255,255,255,0.35)',fontSize:'14px',maxWidth:'300px' }}>
        You don't have permission to view this page.
      </p>
    </div>
  )
}

export default function Dashboard({ user, role }) {
  const [page, setActivePage] = useState('home')
  const [sideOpen, setSideOpen] = useState(false)

  const setPage = (p) => { setActivePage(p); setSideOpen(false) }
  const handleLogout = async () => { if (confirm('Sign out of EduHub?')) await signOut(auth) }

  const initials  = user.displayName?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '??'
  const roleStyle = ROLE_COLORS[role]  || ROLE_COLORS.student
  const roleLabel = ROLE_LABELS[role]  || 'Student'
  const roleIcon  = ROLE_ICONS[role]   || '📖'

  const mainNav  = NAV.filter(item => can(role, item.permission))
  const crNav    = CR_NAV.filter(item => can(role, item.permission))
  const adminNav = ADMIN_NAV.filter(item => can(role, item.permission))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .dash-root{display:flex;min-height:100vh;background:#080a0f;font-family:'DM Sans',sans-serif;color:#e2e2ee}
        .sidebar{width:240px;background:#0c0e16;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;padding:24px 0;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto;transition:transform 0.3s ease;z-index:100}
        @media(max-width:768px){.sidebar{position:fixed;top:0;left:0;bottom:0;transform:translateX(-100%)}.sidebar.open{transform:translateX(0);box-shadow:4px 0 40px rgba(0,0,0,0.6)}}
        .sidebar-logo{display:flex;align-items:center;gap:10px;padding:0 20px 20px;border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:10px}
        .logo-icon{width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 20px rgba(99,102,241,0.3)}
        .logo-text{font-family:'Syne',sans-serif;font-weight:800;font-size:18px;color:white}
        .role-banner{margin:0 10px 10px;padding:8px 12px;border-radius:10px;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500}
        .nav-section-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;color:rgba(255,255,255,0.2);text-transform:uppercase;padding:0 20px;margin-bottom:4px;margin-top:10px}
        .nav-item{display:flex;align-items:center;gap:12px;padding:10px 20px;margin:2px 10px;border-radius:10px;cursor:pointer;transition:all 0.15s;font-size:14px;font-weight:400;color:rgba(255,255,255,0.4);border:none;background:none;width:calc(100% - 20px);text-align:left;position:relative}
        .nav-item:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8)}
        .nav-item.active{background:rgba(99,102,241,0.15);color:#a5b4fc;font-weight:500}
        .nav-item.active::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;background:#6366f1;border-radius:0 3px 3px 0;margin-left:-10px}
        .nav-item.cr-item:hover{background:rgba(245,158,11,0.08);color:#fbbf24}
        .nav-item.cr-item.active{background:rgba(245,158,11,0.15);color:#fbbf24}
        .nav-item.cr-item.active::before{background:#f59e0b}
        .nav-item.adm-item:hover{background:rgba(239,68,68,0.08);color:#f87171}
        .nav-item.adm-item.active{background:rgba(239,68,68,0.12);color:#f87171}
        .nav-item.adm-item.active::before{background:#ef4444}
        .nav-icon{font-size:16px;flex-shrink:0}
        .sidebar-bottom{margin-top:auto;padding:16px 10px 0;border-top:1px solid rgba(255,255,255,0.05)}
        .user-card{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;margin-bottom:8px}
        .avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:white;flex-shrink:0;overflow:hidden}
        .avatar img{width:100%;height:100%;object-fit:cover}
        .user-name{font-size:13px;font-weight:500;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
        .logout-btn{width:100%;display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;border:none;background:transparent;color:rgba(255,100,100,0.6);font-size:13px;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif}
        .logout-btn:hover{background:rgba(255,60,60,0.08);color:#f87171}
        .main{flex:1;display:flex;flex-direction:column;min-width:0}
        .topbar{display:none;align-items:center;gap:12px;padding:14px 20px;background:#0c0e16;border-bottom:1px solid rgba(255,255,255,0.06);position:sticky;top:0;z-index:50}
        @media(max-width:768px){.topbar{display:flex}}
        .hamburger{background:none;border:none;color:rgba(255,255,255,0.6);font-size:20px;cursor:pointer;padding:4px}
        .topbar-title{font-family:'Syne',sans-serif;font-weight:700;color:white;font-size:16px}
        .topbar-role{margin-left:auto;font-size:11px;font-family:'DM Mono',monospace;padding:3px 10px;border-radius:100px}
        .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:90}
        @media(max-width:768px){.sidebar-overlay.open{display:block}}
        .page-content{flex:1;padding:32px;overflow-y:auto}
        @media(max-width:768px){.page-content{padding:20px 16px}}
      `}</style>

      <div className="dash-root">
        <div className={`sidebar-overlay ${sideOpen?'open':''}`} onClick={()=>setSideOpen(false)}/>

        <aside className={`sidebar ${sideOpen?'open':''}`}>
          <div className="sidebar-logo">
            <div className="logo-icon">📚</div>
            <span className="logo-text">EduHub</span>
          </div>

          <div className="role-banner" style={{ background:roleStyle.bg, border:`1px solid ${roleStyle.border}` }}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:roleStyle.text,flexShrink:0}}/>
            <span style={{ color:roleStyle.text, flex:1 }}>{roleLabel}</span>
            <span style={{ fontSize:'14px' }}>{roleIcon}</span>
          </div>

          <div className="nav-section-label">Menu</div>
          {mainNav.map(item => (
            <button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}

          {crNav.length > 0 && <>
            <div className="nav-section-label" style={{marginTop:'12px'}}>CR Tools</div>
            {crNav.map(item => (
              <button key={item.id} className={`nav-item cr-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>
                <span className="nav-icon">{item.icon}</span>{item.label}
              </button>
            ))}
          </>}

          {adminNav.length > 0 && <>
            <div className="nav-section-label" style={{marginTop:'12px'}}>Admin</div>
            {adminNav.map(item => (
              <button key={item.id} className={`nav-item adm-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>
                <span className="nav-icon">{item.icon}</span>{item.label}
              </button>
            ))}
          </>}

          <div className="sidebar-bottom">
            <div className="user-card">
              <div className="avatar">
                {user.photoURL ? <img src={user.photoURL} alt={initials} referrerPolicy="no-referrer"/> : initials}
              </div>
              <div style={{minWidth:0}}>
                <div className="user-name">{user.displayName}</div>
                <div style={{fontSize:'11px',marginTop:'2px',color:roleStyle.text,fontFamily:"'DM Mono',monospace"}}>{roleLabel}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>⎋ &nbsp;Sign out</button>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <button className="hamburger" onClick={()=>setSideOpen(true)}>☰</button>
            <span className="topbar-title">EduHub</span>
            <div className="topbar-role" style={{background:roleStyle.bg,color:roleStyle.text,border:`1px solid ${roleStyle.border}`}}>
              {roleIcon} {roleLabel}
            </div>
          </div>

          <div className="page-content">
            {page==='home'          && <Home user={user} role={role} setPage={setPage}/>}
            {page==='files'         && (can(role,'view_notes')         ? <FileSystem user={user} role={role}/>     : <AccessDenied/>)}
            {page==='announcements' && (can(role,'view_announcements') ? <Announcements user={user} role={role}/> : <AccessDenied/>)}
            {page==='timetable'     && (can(role,'view_timetable')     ? <Timetable user={user} role={role}/>     : <AccessDenied/>)}
            {page==='cr'            && (can(role,'manage_courses')     ? <CRPanel user={user} role={role}/>       : <AccessDenied/>)}
            {page==='admin'         && (can(role,'manage_users')       ? <AdminPanel user={user} role={role}/>    : <AccessDenied/>)}
          </div>
        </main>
      </div>
    </>
  )
}
