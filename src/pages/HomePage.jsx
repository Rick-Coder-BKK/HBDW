import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sounds } from '../utils/sounds.js'

// ── Starfield ────────────────────────────────────────────────
function Starfield() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const grads = []

    // Small stars — 1 px, subtle
    for (let i = 0; i < 65; i++) {
      const x = Math.random() * 100
      const y = Math.random() * 100
      const o = (0.25 + Math.random() * 0.5).toFixed(2)
      grads.push(
        `radial-gradient(circle 1px at ${x}% ${y}%, rgba(245,226,122,${o}) 0%, transparent 100%)`
      )
    }

    // Larger stars — 1.5 px, brighter
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 100
      const y = Math.random() * 100
      const o = (0.6 + Math.random() * 0.4).toFixed(2)
      grads.push(
        `radial-gradient(circle 1.5px at ${x}% ${y}%, rgba(245,226,122,${o}) 0%, transparent 100%)`
      )
    }

    el.style.background = grads.join(',')
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

// ── Nav Bar ──────────────────────────────────────────────────
function NavBar({ onQuiz, onGame, gameUnlocked }) {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      background: 'rgba(13,13,26,0.75)',
      borderBottom: '1px solid rgba(212,175,55,0.15)',
      padding: '0 1.25rem',
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F5E27A, #D4AF37, #9A7B20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: '1rem',
            color: '#0D0D1A',
          }}>
            W
          </div>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#D4AF37',
            letterSpacing: '0.04em',
          }}>
            74. Geburtstag
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onQuiz}
            style={{
              background: 'transparent',
              border: '1px solid rgba(212,175,55,0.35)',
              borderRadius: 999,
              color: '#D4AF37',
              padding: '0.35rem 1rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(212,175,55,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            Quiz
          </button>
          <button
            onClick={onGame}
            style={{
              background: gameUnlocked ? 'linear-gradient(135deg,#F5E27A,#D4AF37,#9A7B20)' : 'transparent',
              border: gameUnlocked ? 'none' : '1px solid rgba(212,175,55,0.2)',
              borderRadius: 999,
              color: gameUnlocked ? '#0D0D1A' : 'rgba(212,175,55,0.4)',
              padding: '0.35rem 1rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              transition: 'opacity 0.2s',
            }}
          >
            Spiel
          </button>
        </div>
      </div>
    </nav>
  )
}

// ── Info Card ────────────────────────────────────────────────
function InfoCard({ emoji, title, lines }) {
  return (
    <div className="card" style={{ animation: 'fadeIn 0.4s ease both' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>{emoji}</div>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontWeight: 700,
        fontSize: '1.1rem',
        color: '#D4AF37',
        marginBottom: '0.5rem',
      }}>
        {title}
      </h3>
      {lines.map((line, i) => (
        <p key={i} style={{ color: '#9A90A0', fontSize: '0.92rem', lineHeight: 1.55 }}>
          {line}
        </p>
      ))}
    </div>
  )
}

// ── HomePage ─────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const gameUnlocked = localStorage.getItem('hbdw_quiz_won') === 'true'
  const [muteToggle, setMuteToggle] = useState(0)

  // Try to start home background music if AudioContext already exists (returning visitor)
  useEffect(() => {
    Sounds.playBgMusic('home')
  }, [])

  // Play birthday sting once on mount (after brief delay for user gesture workaround)
  useEffect(() => {
    const t = setTimeout(() => {
      Sounds.play('birthdaySting')
    }, 500)
    return () => clearTimeout(t)
  }, [])

  const goQuiz = () => {
    Sounds.init()
    Sounds.stopBgMusic()
    Sounds.playBgMusic('quiz')
    navigate('/quiz')
  }
  const goGame = () => navigate('/game')

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <Starfield />

      <NavBar onQuiz={goQuiz} onGame={goGame} gameUnlocked={gameUnlocked} />

      {/* Main content */}
      <main className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '56px' }}>

        {/* ── Hero ── */}
        <section style={{
          textAlign: 'center',
          padding: '4rem 0 2.5rem',
          animation: 'fadeIn 0.5s ease both',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-block',
            border: '1px solid rgba(212,175,55,0.5)',
            borderRadius: 999,
            padding: '0.3rem 1.1rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: '#D4AF37',
            background: 'rgba(212,175,55,0.08)',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
          }}>
            74. Geburtstag &middot; 28. März 2026
          </div>

          {/* Name */}
          <h1
            className="playfair gold-text"
            style={{
              fontWeight: 900,
              fontSize: 'clamp(3rem, 11vw, 5.5rem)',
              lineHeight: 1.05,
              marginBottom: '1rem',
              letterSpacing: '-0.01em',
            }}
          >
            Wolfgang
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
            color: '#F0EAD6',
            marginBottom: '0.5rem',
            fontWeight: 400,
          }}>
            Herzlichen Glückwunsch zum Geburtstag!
          </p>

          {/* Tagline */}
          <p style={{
            fontSize: '0.92rem',
            color: '#9A90A0',
            marginBottom: '2.5rem',
            letterSpacing: '0.04em',
          }}>
            Bonn, 28. März 2026
          </p>

          {/* Floating emoji row */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            fontSize: '2.2rem',
            marginBottom: '2.5rem',
          }}>
            {[
              { emoji: '🎂', delay: '0s' },
              { emoji: '🎉', delay: '0.4s' },
              { emoji: '🎓', delay: '0.8s' },
            ].map(({ emoji, delay }) => (
              <span
                key={emoji}
                style={{
                  display: 'inline-block',
                  animation: `float 3s ease-in-out ${delay} infinite`,
                }}
              >
                {emoji}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button className="btn-gold" onClick={goQuiz}>
              Quiz starten &rarr;
            </button>
            <button
              className="btn-ghost"
              onClick={goGame}
              style={!gameUnlocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={!gameUnlocked ? 'Zuerst das Quiz gewinnen!' : ''}
            >
              Arcade-Spiel
            </button>
          </div>

          {!gameUnlocked && (
            <p style={{
              marginTop: '0.75rem',
              fontSize: '0.8rem',
              color: '#9A90A0',
            }}>
              Gewinne das Quiz, um das Arcade-Spiel freizuschalten
            </p>
          )}
        </section>

        {/* ── Info cards ── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3rem',
        }}>
          <InfoCard
            emoji="🎓"
            title="Wer wird Millionär?"
            lines={[
              '15 Fragen in 5 Stufen.',
              '3 Joker: Publikum, 50:50, Telefonjoker.',
              'Erreiche den Millionengewinn!',
            ]}
          />
          <InfoCard
            emoji="🎮"
            title="Arcade-Bonus"
            lines={[
              '74 Hindernisse warten auf dich.',
              'Wolfgang ist der Held.',
              'Wirst du bis ans Ende kommen?',
            ]}
          />
          <InfoCard
            emoji="🏆"
            title="Für Herr Professor"
            lines={[
              'Persönliche Fragen über Familie,',
              'Physik & Beethoven.',
              'Nur echte Kenner bestehen!',
            ]}
          />
        </section>

        {/* ── Footer ── */}
        <footer style={{
          textAlign: 'center',
          paddingBottom: '2.5rem',
          color: '#9A90A0',
          fontSize: '0.85rem',
        }}>
          Mit ❤️ von Rick &middot; 28. März 2026
        </footer>
      </main>

      {/* Mute toggle */}
      <button
        onClick={() => { Sounds.toggleMute(); setMuteToggle(v => v + 1) }}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 500,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(13,13,26,0.85)',
          border: '1px solid #D4AF37',
          color: '#D4AF37',
          fontSize: '1.2rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={Sounds.isMuted ? 'Ton einschalten' : 'Ton ausschalten'}
      >
        {Sounds.isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
