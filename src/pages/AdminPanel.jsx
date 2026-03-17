import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } from '../useRole'

const ROLES = ['student', 'cr', 'admin']

const ROLE_DESCRIPTIONS = {
  student: 'Can view and download all content.',
  cr:      'Can upload content, post announcements, manage timetable and courses.',
  admin:   'Full access — all CR powers plus user management and delete anything.',
}

export default function AdminPanel({ user }) {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [toast, setToast]       = useState('')
  const [updating, setUpdating] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const changeRole = async (targetUser, newRole) => {
    if (targetUser.uid === user.uid) return showToast("You can't change your own role.")
    if (!confirm(`Change ${targetUser.name}'s role to ${ROLE_LABELS[newRole]}?\n\n${ROLE_DESCRIPTIONS[newRole]}`)) return
    setUpdating(targetUser.uid)
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole })
      showToast(`${targetUser.name} is now ${ROLE_LABELS[newRole]} ${ROLE_ICONS[newRole]} ✓`)
    } catch { showToast('Failed to update role. Try again.') }
    setUpdating(null)
  }

  const counts = {
    total:   users.length,
    admin:   users.filter(u => u.role === 'admin').length,
    cr:      users.filter(u => u.role === 'cr').length,
    student: users.filter(u => !u.role || u.role === 'student').length,
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
                        u.email?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (u.role || 'student') === filter
    return matchSearch && matchFilter
  })

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .ap-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;animation:fadeUp 0.3s ease both}
        @media(max-width:600px){.ap-stats{grid-template-columns:1fr 1fr}}
        .stat-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px;text-align:center;cursor:pointer;transition:all 0.15s}
        .stat-card:hover{border-color:rgba(255,255,255,0.15)}
        .stat-card.active{border-color:rgba(99,102,241,0.4);background:rgba(99,102,241,0.08)}
        .stat-num{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;display:block;color:white}
        .stat-lbl{font-size:11px;color:rgba(255,255,255,0.3);font-family:'DM Mono',monospace;margin-top:4px;display:block}
        .controls{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;animation:fadeUp 0.3s ease 0.1s both}
        .search{flex:1;min-width:200px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s}
        .search:focus{border-color:rgba(239,68,68,0.4)}
        .search::placeholder{color:rgba(255,255,255,0.25)}
        .table-wrap{border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;animation:fadeUp 0.3s ease 0.15s both;overflow-x:auto}
        .user-table{width:100%;border-collapse:collapse;min-width:600px}
        .user-table th{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;color:rgba(255,255,255,0.3);text-transform:uppercase;padding:12px 16px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.07);text-align:left;white-space:nowrap}
        .user-table td{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;vertical-align:middle}
        .user-table tr:last-child td{border-bottom:none}
        .user-table tr:hover td{background:rgba(255,255,255,0.02)}
        .role-badge{display:inline-flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:10px;padding:4px 10px;border-radius:100px;font-weight:600}
        .role-btns{display:flex;gap:6px;flex-wrap:wrap}
        .role-btn{padding:5px 12px;border-radius:8px;font-size:11px;font-family:'DM Sans',sans-serif;cursor:pointer;border:1px solid;transition:all 0.15s;font-weight:500;white-space:nowrap}
        .role-btn:disabled{opacity:0.4;cursor:not-allowed}
        .role-btn:not(:disabled):hover{opacity:0.85;transform:translateY(-1px)}
        .avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:white;flex-shrink:0;overflow:hidden}
        .avatar img{width:100%;height:100%;object-fit:cover}
        .skel{background:rgba(255,255,255,0.04);border-radius:8px;height:56px;margin-bottom:6px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .info-box{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:14px 18px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:24px;animation:fadeUp 0.3s ease both}
        .info-box strong{color:#f87171}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1d2e;border:1px solid rgba(255,255,255,0.12);color:white;padding:12px 24px;border-radius:12px;font-size:14px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;white-space:nowrap}
        .role-desc{font-size:11px;color:rgba(255,255,255,0.25);margin-top:3px;max-width:200px}
        .you-badge{font-size:10px;color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.06);padding:2px 7px;border-radius:100px;margin-left:6px;font-family:'DM Mono',monospace}
        @media(max-width:650px){.hide-mob{display:none}}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom:'24px', animation:'fadeUp 0.3s ease both' }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'28px', fontWeight:'800', color:'white', marginBottom:'4px' }}>
          🛡️ Admin Panel
        </h1>
        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'14px' }}>
          Manage all users and their roles. You can promote anyone to CR or Admin.
        </p>
      </div>

      {/* Warning */}
      <div className="info-box">
        <strong>Role powers:</strong> &nbsp;
        📖 Student — view &amp; download only &nbsp;·&nbsp;
        ✏️ Class Rep — upload, announce, manage courses &nbsp;·&nbsp;
        🛡️ Admin — everything + user management + delete anything
      </div>

      {/* Stats — clickable filters */}
      <div className="ap-stats">
        {[
          { key: 'all',     label: 'Total Users',  count: counts.total,   color: 'white' },
          { key: 'admin',   label: 'Admins',        count: counts.admin,   color: '#f87171' },
          { key: 'cr',      label: 'Class Reps',    count: counts.cr,      color: '#fbbf24' },
          { key: 'student', label: 'Students',       count: counts.student, color: '#a5b4fc' },
        ].map(s => (
          <div key={s.key} className={`stat-card ${filter===s.key?'active':''}`} onClick={() => setFilter(s.key)}>
            <span className="stat-num" style={{ color: s.color }}>{s.count}</span>
            <span className="stat-lbl">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="controls">
        <input
          className="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        [1,2,3,4,5].map(i => <div key={i} className="skel"/>)
      ) : (
        <div className="table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="hide-mob">Email</th>
                <th>Current Role</th>
                <th>Change Role</th>
                <th className="hide-mob">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'40px' }}>
                    No users found.
                  </td>
                </tr>
              ) : filtered.map(u => {
                const rs     = ROLE_COLORS[u.role] || ROLE_COLORS.student
                const rl     = ROLE_LABELS[u.role]  || 'Student'
                const ri     = ROLE_ICONS[u.role]   || '📖'
                const isMe   = u.uid === user.uid
                const curRole = u.role || 'student'

                return (
                  <tr key={u.id}>
                    {/* Avatar + name */}
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div className="avatar">
                          {u.photoURL
                            ? <img src={u.photoURL} alt="" referrerPolicy="no-referrer"/>
                            : (u.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??')}
                        </div>
                        <div>
                          <div style={{ color:'white', fontWeight:'500', fontSize:'13px', display:'flex', alignItems:'center' }}>
                            {u.name}
                            {isMe && <span className="you-badge">you</span>}
                          </div>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'2px' }}
                               className="hide-mob show-on-mobile">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="hide-mob" style={{ color:'rgba(255,255,255,0.35)', fontSize:'12px' }}>
                      {u.email}
                    </td>

                    {/* Current role */}
                    <td>
                      <span className="role-badge" style={{ background:rs.bg, color:rs.text, border:`1px solid ${rs.border}` }}>
                        {ri} {rl}
                      </span>
                    </td>

                    {/* Role change buttons */}
                    <td>
                      {isMe ? (
                        <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>
                          Cannot change own role
                        </span>
                      ) : (
                        <div className="role-btns">
                          {ROLES.map(r => {
                            const rs2      = ROLE_COLORS[r]
                            const isCurrent = curRole === r
                            return (
                              <button
                                key={r}
                                className="role-btn"
                                disabled={isCurrent || updating === u.uid}
                                style={{
                                  background:  isCurrent ? rs2.bg       : 'transparent',
                                  color:       isCurrent ? rs2.text     : 'rgba(255,255,255,0.4)',
                                  borderColor: isCurrent ? rs2.border   : 'rgba(255,255,255,0.1)',
                                }}
                                onClick={() => changeRole(u, r)}
                                title={ROLE_DESCRIPTIONS[r]}
                              >
                                {updating === u.uid ? '...' : `${ROLE_ICONS[r]} ${ROLE_LABELS[r]}`}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="hide-mob" style={{ color:'rgba(255,255,255,0.25)', fontSize:'12px', whiteSpace:'nowrap' }}>
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
