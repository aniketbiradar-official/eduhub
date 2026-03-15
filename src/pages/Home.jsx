import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      animation: 'fadeUp 0.4s ease both',
    }}>
      <div style={{
        width: '44px', height: '44px',
        borderRadius: '12px',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: '700', color: 'white', fontFamily: "'Syne', sans-serif" }}>{value}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  )
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: '700', color: 'white' }}>{title}</h2>
      {action && (
        <button onClick={onAction} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)', fontSize: '12px', padding: '5px 12px',
          borderRadius: '8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.target.style.color = 'white'; e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
          onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.4)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          {action} →
        </button>
      )}
    </div>
  )
}

export default function Home({ user, setPage }) {
  const [announcements, setAnnouncements] = useState([])
  const [notes, setNotes]                 = useState([])
  const [loading, setLoading]             = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.displayName?.split(' ')[0] || 'Student'

  useEffect(() => {
    // Live announcements
    const annQ = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3))
    const unsubAnn = onSnapshot(annQ, snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))

    // Live notes
    const notesQ = query(collection(db, 'notes'), orderBy('createdAt', 'desc'), limit(4))
    const unsubNotes = onSnapshot(notesQ, snap => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return () => { unsubAnn(); unsubNotes() }
  }, [])

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .home-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 900px) { .home-grid { grid-template-columns: 1fr; } }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }
        @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr 1fr; } }
        .ann-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px 18px;
          margin-bottom: 10px;
          transition: border-color 0.15s;
          animation: fadeUp 0.3s ease both;
          cursor: default;
        }
        .ann-card:hover { border-color: rgba(255,255,255,0.14); }
        .note-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px 18px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: border-color 0.15s;
          animation: fadeUp 0.3s ease both;
          text-decoration: none;
        }
        .note-card:hover { border-color: rgba(99,102,241,0.3); }
        .skeleton {
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          height: 70px;
          margin-bottom: 10px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        .empty-state {
          text-align: center;
          padding: 32px 20px;
          color: rgba(255,255,255,0.2);
          font-size: 14px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.07);
          border-radius: 14px;
        }
        .empty-state .empty-icon { font-size: 32px; margin-bottom: 8px; }
      `}</style>

      {/* Welcome header */}
      <div style={{ marginBottom: '32px', animation: 'fadeUp 0.4s ease both' }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Mono', monospace", marginBottom: '6px' }}>
          {today}
        </div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: '800',
          color: 'white',
          lineHeight: 1.1,
        }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginTop: '6px' }}>
          Here's what's happening in your class today.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon="📄" label="Notes uploaded"   value={notes.length || '0'}         color="rgba(99,102,241,0.2)"  />
        <StatCard icon="📢" label="Announcements"    value={announcements.length || '0'} color="rgba(245,158,11,0.2)"  />
        <StatCard icon="📚" label="Subjects"         value="6"                           color="rgba(16,185,129,0.2)"  />
      </div>

      <div className="home-grid">
        {/* Announcements */}
        <div>
          <SectionHeader title="📢 Announcements" action="View all" onAction={() => setPage('announcements')} />
          {loading ? (
            <><div className="skeleton" /><div className="skeleton" /></>
          ) : announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              No announcements yet.<br />
              <span style={{ fontSize: '12px' }}>Your class rep will post updates here.</span>
            </div>
          ) : announcements.map((ann, i) => (
            <div className="ann-card" key={ann.id} style={{ animationDelay: `${i * 0.08}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {ann.urgent && (
                  <span style={{
                    background: 'rgba(239,68,68,0.15)', color: '#f87171',
                    fontSize: '10px', padding: '2px 8px', borderRadius: '100px',
                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                  }}>URGENT</span>
                )}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: "'DM Mono', monospace" }}>
                  {ann.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) || 'Just now'}
                </span>
              </div>
              <div style={{ fontWeight: '500', color: 'white', fontSize: '14px', marginBottom: '4px' }}>{ann.title}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{ann.body}</div>
              {ann.link && (
                <a href={ann.link} target="_blank" rel="noreferrer" style={{
                  display: 'inline-block', marginTop: '8px',
                  fontSize: '12px', color: '#818cf8', textDecoration: 'none',
                }}>
                  View link →
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Recent Notes */}
        <div>
          <SectionHeader title="📄 Recent Notes" action="All notes" onAction={() => setPage('notes')} />
          {loading ? (
            <><div className="skeleton" /><div className="skeleton" /></>
          ) : notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              No notes uploaded yet.<br />
              <span style={{ fontSize: '12px' }}>Go to Notes to upload the first one!</span>
            </div>
          ) : notes.map((note, i) => (
            <a
              key={note.id}
              className="note-card"
              href={note.url}
              target="_blank"
              rel="noreferrer"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: '500', color: 'white', fontSize: '14px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{note.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', display: 'flex', gap: '10px' }}>
                  <span>{note.subject || 'General'}</span>
                  <span>·</span>
                  <span>{note.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) || 'Recent'}</span>
                </div>
              </div>
              <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>↓</div>
            </a>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ marginTop: '32px' }}>
        <SectionHeader title="🔗 Quick Links" />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'College Website',  url: '#', icon: '🏫' },
            { label: 'Exam Portal',      url: '#', icon: '📝' },
            { label: 'CGPA Calculator',  url: 'https://cgpacalculator.in', icon: '🧮' },
            { label: 'Class WhatsApp',   url: '#', icon: '💬' },
          ].map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            >
              <span>{link.icon}</span> {link.label}
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
