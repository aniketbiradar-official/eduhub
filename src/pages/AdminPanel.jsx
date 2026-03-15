import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { ROLE_LABELS, ROLE_COLORS } from '../useRole'

export default function AdminPanel({ user }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [toast, setToast]     = useState('')
  const [updating, setUpdating] = useState(null) // uid of user being updated

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const changeRole = async (targetUser, newRole) => {
    if (targetUser.uid === user.uid) return showToast("You can't change your own role.")
    if (!confirm(`Change ${targetUser.name}'s role to ${ROLE_LABELS[newRole]}?`)) return
    setUpdating(targetUser.uid)
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole })
      showToast(`${targetUser.name} is now a ${ROLE_LABELS[newRole]} ✓`)
    } catch { showToast('Failed to update role.') }
    setUpdating(null)
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    total:   users.length,
    admin:   users.filter(u => u.role === 'admin').length,
    cr:      users.filter(u => u.role === 'cr').length,
    student: users.filter(u => u.role === 'student' || !u.role).length,
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .admin-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;animation:fadeUp 0.3s ease both}
        @media(max-width:600px){.admin-stats{grid-template-columns:1fr 1fr}}
        .stat-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px;text-align:center}
        .stat-num{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:white;display:block}
        .stat-lbl{font-size:11px;color:rgba(255,255,255,0.3);font-family:'DM Mono',monospace;margin-top:4px;display:block;letter-spacing:0.05em}
        .search-bar{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;margin-bottom:20px;transition:border-color 0.15s;animation:fadeUp 0.3s ease 0.1s both}
        .search-bar:focus{border-color:rgba(239,68,68,0.4)}
        .search-bar::placeholder{color:rgba(255,255,255,0.25)}
        .user-table{width:100%;border-collapse:collapse;animation:fadeUp 0.3s ease 0.15s both}
        .user-table th{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;color:rgba(255,255,255,0.3);text-transform:uppercase;padding:10px 16px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.07);text-align:left}
        .user-table td{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;vertical-align:middle}
        .user-table tr:hover td{background:rgba(255,255,255,0.02)}
        .role-badge{display:inline-flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:11px;padding:3px 10px;border-radius:100px;font-weight:600}
        .role-select-row{display:flex;gap:6px;flex-wrap:wrap}
        .role-btn{padding:5px 12px;border-radius:8px;font-size:11px;font-family:'DM Sans',sans-serif;cursor:pointer;border:1px solid;transition:all 0.15s;font-weight:500}
        .role-btn:disabled{opacity:0.4;cursor:not-allowed}
        .user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:white;overflow:hidden;flex-shrink:0}
        .user-avatar img{width:100%;height:100%;object-fit:cover}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .skel{background:rgba(255,255,255,0.04);border-radius:8px;height:50px;margin-bottom:8px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .info-box{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:12px 16px;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;margin-bottom:24px;animation:fadeUp 0.3s ease both}
        .info-box strong{color:#f87171}
        @media(max-width:700px){.hide-mobile{display:none}.user-table td,.user-table th{padding:10px 10px}}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom:'24px', animation:'fadeUp 0.3s ease both' }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'28px', fontWeight:'800', color:'white', marginBottom:'4px' }}>
          🛡️ Admin Panel
        </h1>
        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'14px' }}>
          Manage all users and their roles across EduHub.
        </p>
      </div>

      {/* Warning */}
      <div className="info-box">
        <strong>Important:</strong> Promoting a user to <strong>CR</strong> gives them upload, announcement, and timetable editing powers. Promoting to <strong>Admin</strong> gives full control including this panel. Be careful who you promote.
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-num">{counts.total}</span>
          <span className="stat-lbl">Total Users</span>
        </div>
        <div className="stat-card">
          <span className="stat-num" style={{ color:'#f87171' }}>{counts.admin}</span>
          <span className="stat-lbl">Admins</span>
        </div>
        <div className="stat-card">
          <span className="stat-num" style={{ color:'#fbbf24' }}>{counts.cr}</span>
          <span className="stat-lbl">Class Reps</span>
        </div>
        <div className="stat-card">
          <span className="stat-num" style={{ color:'#a5b4fc' }}>{counts.student}</span>
          <span className="stat-lbl">Students</span>
        </div>
      </div>

      {/* Search */}
      <input
        className="search-bar"
        placeholder="Search by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Table */}
      {loading ? (
        [1,2,3,4,5].map(i => <div key={i} className="skel"/>)
      ) : (
        <div style={{ overflowX:'auto', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)' }}>
          <table className="user-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="hide-mobile">Email</th>
                <th>Current Role</th>
                <th>Change Role</th>
                <th className="hide-mobile">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'40px' }}>No users found.</td></tr>
              ) : filtered.map(u => {
                const rs = ROLE_COLORS[u.role] || ROLE_COLORS.student
                const rl = ROLE_LABELS[u.role] || 'Student'
                const isMe = u.uid === user.uid
                return (
                  <tr key={u.id}>
                    {/* Avatar + name */}
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div className="user-avatar">
                          {u.photoURL
                            ? <img src={u.photoURL} alt="" referrerPolicy="no-referrer"/>
                            : (u.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??')}
                        </div>
                        <div>
                          <div style={{ color:'white', fontWeight:'500', fontSize:'13px' }}>
                            {u.name}
                            {isMe && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', marginLeft:'6px' }}>(you)</span>}
                          </div>
                          {/* Show email on mobile under name */}
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'2px' }} className="show-mobile">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="hide-mobile" style={{ color:'rgba(255,255,255,0.35)', fontSize:'12px' }}>{u.email}</td>

                    {/* Current role badge */}
                    <td>
                      <span className="role-badge" style={{ background:rs.bg, color:rs.text, border:`1px solid ${rs.border}` }}>
                        {u.role==='admin'?'🛡️':u.role==='cr'?'✏️':'📖'} {rl}
                      </span>
                    </td>

                    {/* Role change buttons */}
                    <td>
                      {isMe ? (
                        <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>—</span>
                      ) : (
                        <div className="role-select-row">
                          {['student','cr','admin'].map(r => {
                            const rs2 = ROLE_COLORS[r]
                            const isCurrent = (u.role || 'student') === r
                            return (
                              <button
                                key={r}
                                className="role-btn"
                                disabled={isCurrent || updating === u.uid}
                                style={{
                                  background: isCurrent ? rs2.bg : 'transparent',
                                  color:      isCurrent ? rs2.text : 'rgba(255,255,255,0.35)',
                                  borderColor: isCurrent ? rs2.border : 'rgba(255,255,255,0.1)',
                                  opacity: isCurrent ? 1 : undefined,
                                }}
                                onClick={() => changeRole(u, r)}
                              >
                                {updating===u.uid ? '...' : ROLE_LABELS[r]}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </td>

                    {/* Joined date */}
                    <td className="hide-mobile" style={{ color:'rgba(255,255,255,0.25)', fontSize:'12px' }}>
                      {u.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
