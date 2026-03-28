import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizStore } from '../store/quizStore.js'
import { PRIZES, getSafeAmount } from '../data/prizes.js'
import { Sounds } from '../utils/sounds.js'

// ─── Colour tokens ─────────────────────────────────────────────────────────
const C = {
  gold:       '#D4AF37',
  goldLight:  '#F5E27A',
  goldDark:   '#9A7B20',
  bg:         '#0D0D1A',
  surface:    '#13131F',
  surface2:   '#1A1A2E',
  text:       '#F0EAD6',
  muted:      '#9A90A0',
  green:      '#4CAF50',
  red:        '#E53935',
  orange:     '#E07020',
}

const goldGradient  = `linear-gradient(135deg, ${C.goldDark}, ${C.gold}, ${C.goldLight}, ${C.gold})`
const goldGradientH = `linear-gradient(90deg, ${C.goldDark}, ${C.goldLight}, ${C.goldDark})`
const topBorder     = `3px solid transparent`

// ─── Window width hook ────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 800
  )
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ─── Star-field helper ─────────────────────────────────────────────────────
function useStarField(ref) {
  useEffect(() => {
    if (!ref.current) return
    const stars = Array.from({ length: 80 }, () => {
      const x = Math.random() * 100
      const y = Math.random() * 100
      const r = Math.random() * 1.5 + 0.3
      const a = Math.random() * 0.7 + 0.2
      return `radial-gradient(${r}px ${r}px at ${x}% ${y}%, rgba(212,175,55,${a.toFixed(2)}) 0%, transparent 100%)`
    })
    ref.current.style.background = stars.join(', ')
  }, [ref])
}

// ─── Confetti ─────────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const colors = [
      C.gold, C.goldLight, C.goldDark,
      '#FF6B6B', '#4ECDC4', '#45B7D1',
      '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
    ]

    const pieces = Array.from({ length: 120 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * -canvas.height,
      w:    Math.random() * 10 + 5,
      h:    Math.random() * 6  + 3,
      rot:  Math.random() * Math.PI * 2,
      dRot: (Math.random() - 0.5) * 0.15,
      vy:   Math.random() * 3 + 2,
      vx:   (Math.random() - 0.5) * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    let frame = 0
    let raf

    function draw() {
      if (frame >= 350) { ctx.clearRect(0, 0, canvas.width, canvas.height); return }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        p.x   += p.vx
        p.y   += p.vy
        p.rot += p.dRot
        if (p.y > canvas.height) p.y = -20
      })
      frame++
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        999,
        pointerEvents: 'none',
      }}
    />
  )
}

// ─── Intro screen ──────────────────────────────────────────────────────────
function IntroScreen({ onStart }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={styles.card}>
      <div style={styles.cardTopBorder} />

      <h1 style={styles.introTitle}>Wer wird Millionär?</h1>
      <p style={{ color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
        Willkommen zum Quiz für Wolfgangs 74. Geburtstag! Beantworte 15 Fragen
        und gewinne symbolisch€ 1.000.000.
      </p>

      <ul style={styles.bulletList}>
        <li style={styles.bulletItem}>
          <span style={styles.bulletDot} />
          <span>
            <strong style={{ color: C.gold }}>50:50</strong>
            {' '}— Zwei falsche Antworten werden entfernt.
          </span>
        </li>
        <li style={styles.bulletItem}>
          <span style={styles.bulletDot} />
          <span>
            <strong style={{ color: C.gold }}>Publikum</strong>
            {' '}— Das Publikum stimmt ab und gibt dir einen Hinweis.
          </span>
        </li>
        <li style={styles.bulletItem}>
          <span style={styles.bulletDot} />
          <span>
            <strong style={{ color: C.gold }}>Telefonjoker</strong>
            {' '}— Ein Freund flüstert dir die Antwort ins Ohr.
          </span>
        </li>
      </ul>

      <div style={styles.safeInfo}>
        <span>Sicherheitsstufen:</span>
        <span style={{ color: C.orange, fontWeight: 600 }}>
          €500 bei Frage 5
        </span>
        <span>&amp;</span>
        <span style={{ color: C.orange, fontWeight: 600 }}>
          €16.000 bei Frage 10
        </span>
      </div>

      <p style={styles.goldHighlight}>
        Viel Erfolg, Herr Professor. 🏆
      </p>

      <button
        style={{
          ...styles.ctaBtn,
          ...(hovered ? styles.ctaBtnHover : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onStart}
      >
        Quiz starten →
      </button>
    </div>
  )
}

// ─── Lifelines row ─────────────────────────────────────────────────────────
function Lifelines({ lifelines, answered, onFifty, onAudience, onPhone }) {
  const btns = [
    { key: 'fifty',    label: '50:50',          used: lifelines.fifty,    fn: onFifty    },
    { key: 'audience', label: '👥 Publikum',     used: lifelines.audience, fn: onAudience },
    { key: 'phone',    label: '📞 Telefonjoker', used: lifelines.phone,    fn: onPhone    },
  ]

  return (
    <div style={styles.lifelineRow}>
      {btns.map(b => (
        <button
          key={b.key}
          disabled={b.used || answered}
          onClick={b.fn}
          style={{
            ...styles.lifelineBtn,
            ...(b.used ? styles.lifelineBtnUsed : {}),
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}

// ─── Lifeline info panel ───────────────────────────────────────────────────
function LifelineInfo({ lifelines, audiencePercentages, phoneHint, hiddenIndices }) {
  const anyUsed = lifelines.fifty || lifelines.audience || lifelines.phone
  if (!anyUsed) return null

  const LETTERS = ['A', 'B', 'C', 'D']

  return (
    <div style={styles.lifelineInfo}>
      {lifelines.fifty && !lifelines.audience && !lifelines.phone && (
        <p style={{ margin: 0 }}>Zwei falsche Antworten wurden entfernt.</p>
      )}

      {lifelines.audience && audiencePercentages && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Publikumsabstimmung:</div>
          {audiencePercentages.map((pct, i) => {
            if (hiddenIndices.includes(i)) return null
            const barW = `${pct}%`
            return (
              <div key={i} style={styles.audienceRow}>
                <span style={styles.audienceLetter}>{LETTERS[i]}</span>
                <div style={styles.audienceBarTrack}>
                  <div style={{
                    ...styles.audienceBarFill,
                    width: barW,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
                <span style={styles.audiencePct}>{pct}%</span>
              </div>
            )
          })}
        </div>
      )}

      {lifelines.phone && phoneHint && (
        <p style={{ margin: 0 }}>
          <strong style={{ color: C.gold }}>Telefonjoker:</strong>{' '}
          {phoneHint}
        </p>
      )}
    </div>
  )
}

// ─── Prize ladder ──────────────────────────────────────────────────────────
function PrizeLadder({ currentQ, answered, lastCorrect }) {
  // Render Q15 → Q1 (top to bottom)
  const rungs = [...PRIZES].reverse() // index 14 first

  return (
    <div style={styles.ladderWrap}>
      <div style={styles.ladderTitle}>GEWINNLEITER</div>
      {rungs.map((prize, revIdx) => {
        const qIdx = 14 - revIdx  // 14 down to 0
        const isCurrentPlaying = qIdx === currentQ && !answered
        const isCurrentAnswered = qIdx === currentQ && answered
        const isCompleted = qIdx < currentQ || (isCurrentAnswered && lastCorrect)
        const isSafe = prize.safe

        let rowStyle = { ...styles.ladderRung }
        let textStyle = { ...styles.ladderText }
        let labelStyle = { ...styles.ladderLabel }

        if (isSafe) {
          rowStyle = { ...rowStyle, borderLeft: `3px solid ${C.orange}` }
        }
        if (isCurrentPlaying || (isCurrentAnswered && !lastCorrect)) {
          rowStyle = {
            ...rowStyle,
            background: `rgba(212,175,55,0.12)`,
            borderRadius: 6,
          }
          textStyle = { ...textStyle, color: C.gold, fontWeight: 700 }
          labelStyle = { ...labelStyle, color: C.gold, fontWeight: 700 }
        }
        if (isCompleted) {
          rowStyle = {
            ...rowStyle,
            background: `rgba(76,175,80,0.10)`,
            borderRadius: 6,
          }
          textStyle = { ...textStyle, color: C.green }
          labelStyle = { ...labelStyle, color: C.green }
        }

        return (
          <div key={qIdx} style={rowStyle}>
            <span style={labelStyle}>F{qIdx + 1}</span>
            <span style={textStyle}>{prize.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Answer button ─────────────────────────────────────────────────────────
function AnswerButton({ letter, answer, displayIdx, onClick, state, hidden, disabled }) {
  const [hovered, setHovered] = useState(false)

  if (hidden) {
    return <div style={{ visibility: 'hidden', pointerEvents: 'none', ...styles.answerBtn }} />
  }

  let btnStyle = { ...styles.answerBtn }
  let circleStyle = { ...styles.answerLetter }

  if (state === 'correct') {
    btnStyle = {
      ...btnStyle,
      borderColor: C.green,
      background: `rgba(76,175,80,0.12)`,
    }
    circleStyle = { ...circleStyle, background: `linear-gradient(135deg, #388E3C, #66BB6A)` }
  } else if (state === 'wrong') {
    btnStyle = {
      ...btnStyle,
      borderColor: C.red,
      background: `rgba(229,57,53,0.12)`,
    }
    circleStyle = { ...circleStyle, background: `linear-gradient(135deg, #B71C1C, #E53935)` }
  } else if (hovered && !disabled) {
    btnStyle = {
      ...btnStyle,
      borderColor: C.gold,
      background: `rgba(212,175,55,0.08)`,
    }
  }

  return (
    <button
      style={btnStyle}
      onClick={() => !disabled && onClick(displayIdx)}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={circleStyle}>{letter}</span>
      <span style={styles.answerText}>{answer.text}</span>
    </button>
  )
}

// ─── Playing screen ────────────────────────────────────────────────────────
function PlayingScreen({
  questions, currentQ, shuffledAnswers, hiddenIndices,
  answered, lastCorrect, selectedIndex, lifelines,
  audiencePercentages, phoneHintVisible,
  onSelectAnswer, onNextQuestion,
  onFifty, onAudience, onPhone,
}) {
  const question   = questions[currentQ]
  const prize      = PRIZES[currentQ]
  const LETTERS    = ['A', 'B', 'C', 'D']
  const windowWidth = useWindowWidth()
  const isMobile    = windowWidth <= 480

  const correctDisplayIdx = shuffledAnswers.findIndex(a => a.isCorrect)
  const phoneHint = question?.hint ?? null

  function getAnswerState(idx) {
    if (!answered) return 'default'
    if (idx === correctDisplayIdx) return 'correct'
    if (idx === selectedIndex) return 'wrong'
    return 'default'
  }

  return (
    <div>
      {/* Progress */}
      <div style={styles.progressRow}>
        <span style={{ color: C.muted, fontSize: '0.85rem' }}>
          Frage {currentQ + 1} von 15
        </span>
        <span style={{ color: C.gold, fontSize: '0.85rem', fontWeight: 600 }}>
          {question?.category}
        </span>
      </div>
      <div style={styles.progressTrack}>
        <div style={{
          ...styles.progressFill,
          width: `${((currentQ + 1) / 15) * 100}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Lifelines */}
      <Lifelines
        lifelines={lifelines}
        answered={answered}
        onFifty={onFifty}
        onAudience={onAudience}
        onPhone={onPhone}
      />

      <LifelineInfo
        lifelines={lifelines}
        audiencePercentages={audiencePercentages}
        phoneHint={phoneHintVisible ? phoneHint : null}
        hiddenIndices={hiddenIndices}
      />

      {/* Question card */}
      <div style={{ ...styles.card, marginTop: 20 }}>
        <div style={styles.cardTopBorder} />

        {/* Meta row */}
        <div style={styles.questionMeta}>
          <span style={styles.qNumber}>{currentQ + 1}</span>
          <span style={styles.qPrize}>{prize.label}</span>
          <span style={styles.qCategory}>{question?.category}</span>
        </div>

        {/* Question text */}
        <p style={styles.questionText}>{question?.question}</p>

        {/* Answers grid */}
        <div style={{ ...styles.answersGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
          {shuffledAnswers.map((answer, idx) => (
            <AnswerButton
              key={idx}
              letter={LETTERS[idx]}
              answer={answer}
              displayIdx={idx}
              onClick={onSelectAnswer}
              state={getAnswerState(idx)}
              hidden={hiddenIndices.includes(idx)}
              disabled={answered}
            />
          ))}
        </div>

        {/* Feedback bar */}
        {answered && (
          <div style={{
            ...styles.feedbackBar,
            background: lastCorrect
              ? `rgba(76,175,80,0.15)`
              : `rgba(229,57,53,0.15)`,
            borderColor: lastCorrect ? C.green : C.red,
            color:       lastCorrect ? C.green : C.red,
          }}>
            {lastCorrect
              ? '✓ Richtig! Ausgezeichnet, Herr Professor!'
              : `✗ Leider falsch! Die richtige Antwort war: ${shuffledAnswers[correctDisplayIdx]?.text}`
            }
          </div>
        )}

        {/* Next button */}
        {answered && (
          <NextBtn lastCorrect={lastCorrect} currentQ={currentQ} onClick={onNextQuestion} />
        )}
      </div>

      {/* Prize ladder */}
      <PrizeLadder currentQ={currentQ} answered={answered} lastCorrect={lastCorrect} />
    </div>
  )
}

function NextBtn({ lastCorrect, currentQ, onClick }) {
  const [hovered, setHovered] = useState(false)
  const isLast = currentQ === 14

  const label = lastCorrect
    ? (isLast ? '🏆 Zum Pokal!' : 'Weiter →')
    : '💔 Spiel beenden'

  return (
    <button
      style={{
        ...styles.ctaBtn,
        marginTop: 16,
        width: '100%',
        ...(hovered ? styles.ctaBtnHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

// ─── Won screen ────────────────────────────────────────────────────────────
function WonScreen({ navigate }) {
  return (
    <>
      <Confetti />
      <div style={{ textAlign: 'center', padding: '40px 0 24px' }}>
        {/* Trophy SVG */}
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={{ display: 'block', margin: '0 auto 16px' }}>
          <defs>
            <linearGradient id="trophyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={C.goldDark} />
              <stop offset="50%" stopColor={C.gold} />
              <stop offset="100%" stopColor={C.goldLight} />
            </linearGradient>
          </defs>
          {/* Cup body */}
          <path
            d="M25 10 H65 C65 10 68 35 55 48 L55 60 H60 C62 60 62 65 60 65 H30 C28 65 28 60 30 60 H35 L35 48 C22 35 25 10 25 10 Z"
            fill="url(#trophyGrad)"
          />
          {/* Handles */}
          <path d="M25 15 C10 15 10 38 22 38" stroke="url(#trophyGrad)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M65 15 C80 15 80 38 68 38" stroke="url(#trophyGrad)" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Base */}
          <rect x="20" y="65" width="50" height="7" rx="3" fill="url(#trophyGrad)" />
          {/* Star */}
          <text x="45" y="42" textAnchor="middle" fontSize="18" fill={C.bg}>★</text>
        </svg>

        <h1 style={{
          fontFamily:       'Playfair Display, serif',
          fontSize:         '2rem',
          fontWeight:       900,
          background:       goldGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip:  'text',
          margin:           '0 0 8px',
        }}>
          Herzlichen Glückwunsch! 🏆
        </h1>

        <p style={{ color: C.text, fontSize: '1.15rem', margin: '0 0 32px' }}>
          Sie haben <strong style={{ color: C.goldLight }}>€1.000.000</strong> gewonnen!
        </p>

        {/* Personal letter */}
        <div style={{ ...styles.card, textAlign: 'left' }}>
          <div style={styles.cardTopBorder} />
          <p style={{ color: C.text, lineHeight: 1.85, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
            Lieber Wolfgang,
            <br /><br />
            dieser Pokal gehört Dir – nicht weil er Dir einfach so geschenkt wurde,
            sondern weil Du ihn Dir verdient hast. Mit jedem Rätsel, jeder Gleichung,
            jeder Frage, die Du in Deinem Leben gelöst und gestellt hast, hast Du ihn
            Dir erarbeitet. 74 Jahre voller Neugier, Begeisterung und Leidenschaft für
            Mathematik und Physik – das ist eine Leistung, die weit mehr wert ist als
            jeder Geldbetrag.
            <br /><br />
            Es ist mein größter Wunsch, dass Du noch viele solcher Pokale gewinnst –
            und dass wir sie gemeinsam feiern können, genauso wie wir diesen besonderen
            Tag zusammen feiern.
            <br /><br />
            Alles Liebe und die herzlichsten Glückwünsche zu Deinem 74. Geburtstag.
            <br /><br />
            In Liebe, Dein Sohn Rick 🌟
          </p>
        </div>

        <WonNavBtn navigate={navigate} />
      </div>
    </>
  )
}

function WonNavBtn({ navigate }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      style={{
        ...styles.ctaBtn,
        marginTop: 32,
        ...(hovered ? styles.ctaBtnHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate('/game')}
    >
      Zum Arcade-Spiel →
    </button>
  )
}

// ─── Lost screen ───────────────────────────────────────────────────────────
function LostScreen({ currentQ, onReset }) {
  const [hovered, setHovered] = useState(false)
  const safe = getSafeAmount(currentQ)

  return (
    <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
      <div style={{ fontSize: '4rem', marginBottom: 12 }}>💔</div>
      <h2 style={{
        fontFamily: 'Playfair Display, serif',
        fontSize:   '1.8rem',
        color:      C.red,
        margin:     '0 0 12px',
      }}>
        Leider falsch!
      </h2>
      <p style={{ color: C.text, fontSize: '1.1rem', marginBottom: 8 }}>
        Du nimmst{' '}
        <strong style={{ color: C.gold }}>{safe}</strong>
        {' '}mit nach Hause.
      </p>
      <p style={{ color: C.muted, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.7 }}>
        Aber weißt du was? Nur schon das Mitspielen zeigt, wie neugierig
        und begeistert Du bist. Das ist das Wichtigste. 🌟
        <br />
        In Liebe, Dein Sohn Rick 🌟
      </p>
      <button
        style={{
          ...styles.ctaBtn,
          ...(hovered ? styles.ctaBtnHover : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onReset}
      >
        Nochmal versuchen
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
const homeBtnStyle = {
  position: 'fixed',
  top: '1rem',
  left: '1rem',
  zIndex: 600,
  background: 'rgba(13,13,26,0.85)',
  border: '1px solid rgba(212,175,55,0.4)',
  color: '#D4AF37',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '0.875rem',
  fontWeight: 600,
  padding: '0.45rem 1rem',
  borderRadius: '50px',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  transition: 'border-color 0.2s, background 0.2s',
}

export default function QuizPage() {
  const navigate = useNavigate()

  const {
    gamePhase, questions, currentQ,
    shuffledAnswers, hiddenIndices,
    answered, lastCorrect, selectedIndex,
    lifelines, audiencePercentages, phoneHintVisible,
    startGame, selectAnswer, nextQuestion,
    useFiftyFifty, useAudience, usePhone,
    resetQuiz,
  } = useQuizStore()

  const starRef   = useRef(null)
  const wrapRef   = useRef(null)
  const [muteToggle, setMuteToggle] = useState(0)

  useStarField(starRef)

  // Scroll to top on question change
  useEffect(() => {
    if (wrapRef.current) {
      wrapRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentQ, gamePhase])

  // Play questionLoad sound on each question transition
  useEffect(() => {
    if (gamePhase === 'playing') {
      Sounds.play('questionLoad')
    }
  }, [currentQ, gamePhase])

  function handleStartGame() {
    Sounds.init()
    Sounds.playBgMusic('quiz')
    startGame()
  }

  function handleSelectAnswer(i) {
    Sounds.play('click')
    selectAnswer(i)
  }

  function handleNextQuestion() {
    Sounds.play('click')
    nextQuestion()
  }

  function handleResetQuiz() {
    Sounds.play('click')
    resetQuiz()
  }

  // Play correct/wrong sound when answer is revealed
  useEffect(() => {
    if (answered) {
      if (lastCorrect) {
        Sounds.play('correct')
      } else {
        Sounds.play('wrong')
      }
    }
  }, [answered])

  // Play win/lose sounds on phase change
  useEffect(() => {
    if (gamePhase === 'won') {
      Sounds.stopBgMusic()
      Sounds.play('win')
    } else if (gamePhase === 'lost') {
      Sounds.stopBgMusic()
      Sounds.play('gameOver')
    }
  }, [gamePhase])

  return (
    <div style={styles.page}>
      <button
        style={homeBtnStyle}
        onClick={() => { Sounds.play('click'); navigate('/'); }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.background = 'rgba(13,13,26,0.85)'; }}
      >
        ← Home
      </button>
      {/* Star field background */}
      <div ref={starRef} style={styles.starField} />

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
          background: C.surface,
          border: `1px solid ${C.gold}`,
          color: C.gold,
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

      <div ref={wrapRef} style={styles.scrollArea}>
        <div style={styles.inner}>
          {/* Header */}
          <header style={styles.header}>
            <h2 style={styles.headerTitle}>
              Wer wird Millionär?
            </h2>
            <p style={styles.headerSub}>
              Wolfgang's 74. Geburtstag
            </p>
          </header>

          {gamePhase === 'idle' && (
            <IntroScreen onStart={handleStartGame} />
          )}

          {gamePhase === 'playing' && questions.length > 0 && (
            <PlayingScreen
              questions={questions}
              currentQ={currentQ}
              shuffledAnswers={shuffledAnswers}
              hiddenIndices={hiddenIndices}
              answered={answered}
              lastCorrect={lastCorrect}
              selectedIndex={selectedIndex}
              lifelines={lifelines}
              audiencePercentages={audiencePercentages}
              phoneHintVisible={phoneHintVisible}
              onSelectAnswer={handleSelectAnswer}
              onNextQuestion={handleNextQuestion}
              onFifty={useFiftyFifty}
              onAudience={useAudience}
              onPhone={usePhone}
            />
          )}

          {gamePhase === 'won' && (
            <WonScreen navigate={navigate} />
          )}

          {gamePhase === 'lost' && (
            <LostScreen currentQ={currentQ} onReset={handleResetQuiz} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Style objects ─────────────────────────────────────────────────────────
const styles = {
  page: {
    position:   'relative',
    minHeight:  '100vh',
    background: C.bg,
    color:      C.text,
    fontFamily: 'DM Sans, sans-serif',
    overflow:   'hidden',
  },

  starField: {
    position:      'fixed',
    inset:         0,
    pointerEvents: 'none',
    zIndex:        0,
  },

  scrollArea: {
    position:   'relative',
    zIndex:     1,
    overflowY:  'auto',
    maxHeight:  '100vh',
    padding:    '0 0 60px',
  },

  inner: {
    maxWidth:  660,
    margin:    '0 auto',
    padding:   '0 16px',
  },

  // Header
  header: {
    textAlign:    'center',
    padding:      '36px 0 24px',
    borderBottom: `1px solid rgba(212,175,55,0.15)`,
    marginBottom: 28,
  },

  headerTitle: {
    fontFamily:              'Playfair Display, serif',
    fontWeight:              900,
    fontSize:                '1.75rem',
    margin:                  '0 0 4px',
    background:              goldGradient,
    WebkitBackgroundClip:    'text',
    WebkitTextFillColor:     'transparent',
    backgroundClip:          'text',
  },

  headerSub: {
    color:    C.muted,
    fontSize: '0.85rem',
    margin:   0,
  },

  // Card
  card: {
    background:   C.surface,
    borderRadius: 16,
    padding:      '28px 24px',
    position:     'relative',
    boxShadow:    `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.15)`,
    overflow:     'hidden',
  },

  cardTopBorder: {
    position:   'absolute',
    top:        0,
    left:       0,
    right:      0,
    height:     3,
    background: goldGradientH,
    borderRadius: '16px 16px 0 0',
  },

  // Intro
  introTitle: {
    fontFamily: 'Playfair Display, serif',
    fontWeight: 900,
    fontSize:   '1.5rem',
    color:      C.goldLight,
    margin:     '8px 0 16px',
  },

  bulletList: {
    listStyle: 'none',
    padding:   0,
    margin:    '0 0 20px',
  },

  bulletItem: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        10,
    marginBottom: 10,
    color:      C.text,
    lineHeight: 1.5,
  },

  bulletDot: {
    display:      'inline-block',
    width:        8,
    height:       8,
    borderRadius: '50%',
    background:   goldGradient,
    marginTop:    6,
    flexShrink:   0,
  },

  safeInfo: {
    display:      'flex',
    flexWrap:     'wrap',
    gap:          8,
    alignItems:   'center',
    background:   C.surface2,
    borderRadius: 10,
    padding:      '10px 14px',
    fontSize:     '0.88rem',
    color:        C.muted,
    marginBottom: 20,
  },

  goldHighlight: {
    textAlign:  'center',
    color:      C.gold,
    fontWeight: 600,
    fontSize:   '1rem',
    marginBottom: 24,
  },

  ctaBtn: {
    display:      'block',
    margin:       '0 auto',
    padding:      '14px 36px',
    background:   goldGradient,
    color:        C.bg,
    fontFamily:   'DM Sans, sans-serif',
    fontWeight:   700,
    fontSize:     '1rem',
    border:       'none',
    borderRadius: 50,
    cursor:       'pointer',
    letterSpacing: '0.03em',
    boxShadow:    `0 4px 20px rgba(212,175,55,0.35)`,
    transition:   'transform 0.15s ease, box-shadow 0.15s ease',
  },

  ctaBtnHover: {
    transform:  'translateY(-2px)',
    boxShadow:  `0 8px 30px rgba(212,175,55,0.55)`,
  },

  // Progress
  progressRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },

  progressTrack: {
    height:       6,
    background:   C.surface2,
    borderRadius: 3,
    overflow:     'hidden',
    marginBottom: 18,
  },

  progressFill: {
    height:     '100%',
    background: goldGradientH,
    borderRadius: 3,
  },

  // Lifelines
  lifelineRow: {
    display:        'flex',
    justifyContent: 'center',
    gap:            10,
    marginBottom:   10,
    flexWrap:       'wrap',
  },

  lifelineBtn: {
    padding:      '8px 16px',
    background:   C.surface,
    border:       `1.5px solid ${C.gold}`,
    borderRadius: 50,
    color:        C.gold,
    fontFamily:   'DM Sans, sans-serif',
    fontWeight:   600,
    fontSize:     '0.85rem',
    cursor:       'pointer',
    transition:   'opacity 0.2s',
  },

  lifelineBtnUsed: {
    opacity:        0.4,
    textDecoration: 'line-through',
    cursor:         'default',
  },

  // Lifeline info
  lifelineInfo: {
    background:   `rgba(212,175,55,0.07)`,
    border:       `1px solid rgba(212,175,55,0.25)`,
    borderRadius: 12,
    padding:      '12px 16px',
    marginBottom: 4,
    color:        C.text,
    fontSize:     '0.88rem',
    lineHeight:   1.6,
  },

  audienceRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    marginBottom: 6,
  },

  audienceLetter: {
    width:      24,
    textAlign:  'center',
    color:      C.gold,
    fontWeight: 700,
    flexShrink: 0,
  },

  audienceBarTrack: {
    flex:         1,
    height:       18,
    background:   C.surface2,
    borderRadius: 4,
    overflow:     'hidden',
  },

  audienceBarFill: {
    height:     '100%',
    background: goldGradientH,
    borderRadius: 4,
  },

  audiencePct: {
    width:      38,
    textAlign:  'right',
    color:      C.goldLight,
    fontWeight: 600,
    flexShrink: 0,
    fontSize:   '0.85rem',
  },

  // Question meta
  questionMeta: {
    display:        'flex',
    alignItems:     'center',
    gap:            12,
    marginBottom:   16,
    flexWrap:       'wrap',
  },

  qNumber: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    width:           36,
    height:          36,
    borderRadius:    '50%',
    background:      goldGradient,
    color:           C.bg,
    fontWeight:      700,
    fontSize:        '0.9rem',
    flexShrink:      0,
  },

  qPrize: {
    color:      C.gold,
    fontWeight: 700,
    fontSize:   '1rem',
  },

  qCategory: {
    marginLeft:   'auto',
    background:   C.surface2,
    border:       `1px solid rgba(212,175,55,0.25)`,
    borderRadius: 50,
    padding:      '3px 12px',
    fontSize:     '0.78rem',
    color:        C.muted,
  },

  questionText: {
    fontSize:     '1.1rem',
    fontWeight:   500,
    lineHeight:   1.6,
    color:        C.text,
    margin:       '0 0 20px',
  },

  // Answers
  answersGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap:                 10,
  },

  answerBtn: {
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    padding:      '10px 14px',
    background:   C.surface2,
    border:       `1.5px solid rgba(212,175,55,0.2)`,
    borderRadius: 12,
    cursor:       'pointer',
    textAlign:    'left',
    transition:   'border-color 0.15s, background 0.15s',
    color:        C.text,
    fontFamily:   'DM Sans, sans-serif',
    fontSize:     '0.9rem',
    minHeight:    52,
  },

  answerLetter: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    width:           32,
    height:          32,
    borderRadius:    '50%',
    background:      goldGradient,
    color:           C.bg,
    fontWeight:      700,
    fontSize:        '0.85rem',
    flexShrink:      0,
  },

  answerText: {
    flex:       1,
    lineHeight: 1.4,
  },

  // Feedback
  feedbackBar: {
    padding:      '12px 16px',
    borderRadius: 10,
    border:       '1.5px solid',
    marginTop:    16,
    fontWeight:   600,
    fontSize:     '0.92rem',
    textAlign:    'center',
  },

  // Prize ladder
  ladderWrap: {
    marginTop:    28,
    background:   C.surface,
    borderRadius: 14,
    padding:      '16px 18px',
    boxShadow:    `0 4px 16px rgba(0,0,0,0.3)`,
  },

  ladderTitle: {
    fontVariant:  'small-caps',
    letterSpacing: '0.12em',
    color:        C.muted,
    fontSize:     '0.78rem',
    marginBottom: 10,
  },

  ladderRung: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '5px 8px',
    borderLeft:     '3px solid transparent',
  },

  ladderLabel: {
    fontSize:  '0.78rem',
    color:     C.muted,
    minWidth:  28,
  },

  ladderText: {
    fontSize:  '0.82rem',
    color:     C.muted,
    textAlign: 'right',
  },
}

