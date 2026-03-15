import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, provider } from '../firebase'

// Floating subject pill component
function FloatingPill({ text, style }) {
  return (
    <div
      className="floating-pill"
      style={{
        position: 'absolute',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '100px',
        padding: '8px 18px',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.25)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        fontFamily: "'DM Mono', monospace",
        letterSpacing: '0.03em',
        ...style,
      }}
    >
      {text}
    </div>
  )
}

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithPopup(auth, provider)
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #080a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* Dot grid background */
        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        /* Ambient glow blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .blob-1 {
          width: 500px; height: 500px;
          background: rgba(99, 102, 241, 0.12);
          top: -150px; left: -100px;
          animation: blobDrift 12s ease-in-out infinite alternate;
        }
        .blob-2 {
          width: 400px; height: 400px;
          background: rgba(16, 185, 129, 0.08);
          bottom: -100px; right: -80px;
          animation: blobDrift 15s ease-in-out infinite alternate-reverse;
        }
        .blob-3 {
          width: 300px; height: 300px;
          background: rgba(245, 158, 11, 0.06);
          top: 40%; left: 60%;
          animation: blobDrift 10s ease-in-out infinite alternate;
        }

        @keyframes blobDrift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.08); }
        }

        /* Floating pills animation */
        .floating-pill {
          animation: floatUp 8s ease-in-out infinite;
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          50%       { transform: translateY(-14px); opacity: 1; }
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          margin: 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 48px 40px;
          backdrop-filter: blur(20px);
          animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Top shimmer line on card */
        .login-card::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          border-radius: 1px;
        }

        /* Logo badge */
        .logo-badge {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          margin: 0 auto 28px;
          box-shadow: 0 0 40px rgba(99,102,241,0.4);
          animation: logoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }
        @keyframes logoPop {
          from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .login-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 32px;
          color: #ffffff;
          text-align: center;
          line-height: 1.1;
          margin-bottom: 8px;
          animation: fadeSlide 0.5s ease 0.3s both;
        }
        .login-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          text-align: center;
          line-height: 1.6;
          margin-bottom: 36px;
          animation: fadeSlide 0.5s ease 0.4s both;
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Feature pills */
        .feature-row {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 32px;
          animation: fadeSlide 0.5s ease 0.45s both;
        }
        .feature-tag {
          font-size: 11px;
          font-family: 'DM Mono', monospace;
          color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 5px 12px;
          border-radius: 100px;
          letter-spacing: 0.02em;
        }

        /* Google button */
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #ffffff;
          color: #111;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 15px;
          border: none;
          border-radius: 14px;
          padding: 14px 24px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          position: relative;
          overflow: hidden;
          animation: fadeSlide 0.5s ease 0.5s both;
        }
        .google-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(99,102,241,0.35);
          background: #f5f5f5;
        }
        .google-btn:active:not(:disabled) {
          transform: translateY(0px);
        }
        .google-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(0,0,0,0.15);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Google logo SVG */
        .google-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        /* Error */
        .error-msg {
          margin-top: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #fca5a5;
          text-align: center;
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0 20px;
          animation: fadeSlide 0.5s ease 0.55s both;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .divider-text {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.05em;
        }

        /* Stats row */
        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1px;
          background: rgba(255,255,255,0.06);
          border-radius: 14px;
          overflow: hidden;
          animation: fadeSlide 0.5s ease 0.6s both;
        }
        .stat-item {
          background: rgba(255,255,255,0.02);
          padding: 14px 10px;
          text-align: center;
        }
        .stat-num {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: white;
          display: block;
        }
        .stat-label {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.03em;
          margin-top: 2px;
          display: block;
        }

        /* Footer note */
        .login-footer {
          margin-top: 24px;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          text-align: center;
          line-height: 1.6;
          animation: fadeSlide 0.5s ease 0.65s both;
        }
      `}</style>

      <div className="login-root">
        {/* Ambient blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        {/* Floating subject pills in background */}
        <FloatingPill text="DBMS" style={{ top: '12%', left: '8%', animationDelay: '0s' }} />
        <FloatingPill text="Operating Systems" style={{ top: '22%', right: '6%', animationDelay: '1.5s' }} />
        <FloatingPill text="Data Structures" style={{ top: '65%', left: '5%', animationDelay: '3s' }} />
        <FloatingPill text="Computer Networks" style={{ bottom: '18%', right: '5%', animationDelay: '2s' }} />
        <FloatingPill text="Software Engineering" style={{ top: '45%', left: '3%', animationDelay: '4s' }} />
        <FloatingPill text="Machine Learning" style={{ bottom: '30%', right: '4%', animationDelay: '0.8s' }} />
        <FloatingPill text="Cloud Computing" style={{ top: '8%', right: '22%', animationDelay: '2.5s' }} />
        <FloatingPill text="Web Development" style={{ bottom: '12%', left: '15%', animationDelay: '1s' }} />

        {/* Main card */}
        <div className="login-card">
          <div className="logo-badge">📚</div>

          <h1 className="login-title">EduHub</h1>
          <p className="login-subtitle">
            Your class portal for notes, syllabus,<br />
            announcements & timetables
          </p>

          <div className="feature-row">
            <span className="feature-tag">📄 notes</span>
            <span className="feature-tag">📋 syllabus</span>
            <span className="feature-tag">📢 announcements</span>
            <span className="feature-tag">🗓 timetable</span>
          </div>

          <button
            className="google-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Signing you in...
              </>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {error && <div className="error-msg">{error}</div>}

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">why eduhub?</span>
            <div className="divider-line" />
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-num">1K+</span>
              <span className="stat-label">students</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">free</span>
              <span className="stat-label">always</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">24/7</span>
              <span className="stat-label">access</span>
            </div>
          </div>

          <p className="login-footer">
            By signing in, you agree that uploaded content<br />
            is for educational purposes only.
          </p>
        </div>
      </div>
    </>
  )
}
