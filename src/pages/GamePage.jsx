import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore.js'
import { Sounds } from '../utils/sounds.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const CANVAS_H = 400
const GROUND_Y = 330
const PLAYER_X = 90
const PLAYER_W = 36
const PLAYER_H_STAND = 90
const PLAYER_H_DUCK = 45
const GRAVITY = 0.62
const JUMP_FORCE = -15.5
const SPEED_BASE = 5.5
const SPEED_MAX = 13
const SPEED_INCREMENT = 0.007
const TOTAL_OBSTACLES = 74

// ─── Obstacle type weights ────────────────────────────────────────────────────
// wall_low 25%, wall_high 15%, gap 20%, enemy 20%, bird 12%, spike_wall 8%
const OBS_WEIGHTS = [
  { type: 'wall_low',   weight: 25 },
  { type: 'wall_high',  weight: 15 },
  { type: 'gap',        weight: 20 },
  { type: 'enemy',      weight: 20 },
  { type: 'bird',       weight: 12 },
  { type: 'spike_wall', weight:  8 },
]
const OBS_TOTAL_WEIGHT = OBS_WEIGHTS.reduce((s, o) => s + o.weight, 0)

function randomObstacleType() {
  let r = Math.random() * OBS_TOTAL_WEIGHT
  for (const o of OBS_WEIGHTS) {
    r -= o.weight
    if (r <= 0) return o.type
  }
  return 'wall_low'
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawWolfgang(ctx, x, y, height, isDucking, animFrame, isInvincible) {
  if (isInvincible && Math.floor(Date.now() / 100) % 2 === 0) return

  const w = PLAYER_W

  // Hair — long black
  ctx.fillStyle = '#111111'
  ctx.fillRect(x - 4, y - 2, w + 8, 18)                     // top hair crown
  ctx.fillRect(x - 6, y + 10, 10, height * 0.6)              // left side hair
  ctx.fillRect(x + w - 4, y + 10, 10, height * 0.6)          // right side hair

  // Head
  const headH = isDucking ? 18 : 22
  ctx.fillStyle = '#C8845A'
  ctx.fillRect(x + 5, y, 26, headH)

  // Eyes
  ctx.fillStyle = '#1A1A1A'
  ctx.fillRect(x + 9,  y + 7, 4, 4)
  ctx.fillRect(x + 19, y + 7, 4, 4)

  if (!isDucking) {
    // Neck
    ctx.fillStyle = '#C8845A'
    ctx.fillRect(x + 12, y + 22, 10, 6)

    // Torso
    const torsoY = y + 28
    const torsoH = height - 42
    ctx.fillStyle = '#1A1A1A'
    ctx.fillRect(x + 2, torsoY, w - 4, torsoH)

    // Beatles text
    ctx.fillStyle = '#D4AF37'
    ctx.font = 'bold 7px DM Sans, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Beatles', x + 4, torsoY + Math.floor(torsoH * 0.55))

    // Arms
    ctx.fillStyle = '#C8845A'
    ctx.fillRect(x - 4, torsoY + 2, 7, 20)
    ctx.fillRect(x + w - 3, torsoY + 2, 7, 20)

    // Legs
    const legTopY = torsoY + torsoH
    ctx.fillStyle = '#1A2855'
    const phase = animFrame % 2 === 0 ? 5 : -5
    ctx.fillRect(x + 3,      legTopY + phase,  12, 18)
    ctx.fillRect(x + w - 15, legTopY - phase,  12, 18)

    // Shoes
    ctx.fillStyle = '#111111'
    ctx.fillRect(x + 1,      legTopY + phase  + 18, 14, 6)
    ctx.fillRect(x + w - 17, legTopY - phase  + 18, 14, 6)
  } else {
    // Ducking body — squashed torso
    const torsoY = y + headH
    const torsoH = height - headH - 10
    ctx.fillStyle = '#1A1A1A'
    ctx.fillRect(x + 2, torsoY, w - 4, torsoH)

    ctx.fillStyle = '#D4AF37'
    ctx.font = 'bold 7px DM Sans, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Beatles', x + 4, torsoY + 10)

    // Arms tucked
    ctx.fillStyle = '#C8845A'
    ctx.fillRect(x - 3, torsoY + 2, 6, 12)
    ctx.fillRect(x + w - 3, torsoY + 2, 6, 12)

    // Legs side-by-side (no animation while ducking)
    ctx.fillStyle = '#1A2855'
    ctx.fillRect(x + 2,      torsoY + torsoH, 14, 8)
    ctx.fillRect(x + w - 16, torsoY + torsoH, 14, 8)

    // Shoes
    ctx.fillStyle = '#111111'
    ctx.fillRect(x,           torsoY + torsoH + 8, 16, 4)
    ctx.fillRect(x + w - 18,  torsoY + torsoH + 8, 16, 4)
  }
}

function drawEnemy(ctx, enemy) {
  const cx = enemy.x + 18
  const cy = GROUND_Y - 14
  const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.005)
  const r = Math.floor(204 * pulse)

  // Body
  ctx.beginPath()
  ctx.arc(cx, cy, 18, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${r}, 51, 51)`
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath(); ctx.arc(cx - 6, cy - 5, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 6, cy - 5, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#111111'
  ctx.beginPath(); ctx.arc(cx - 5, cy - 5, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 7, cy - 5, 2, 0, Math.PI * 2); ctx.fill()

  // 4 legs — alternating
  ctx.strokeStyle = '#BB2222'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const legX = cx - 9 + i * 6
    const legOff = (i % 2 === 0 ? 1 : -1) * (enemy.animFrame % 2 === 0 ? 4 : -4)
    ctx.beginPath()
    ctx.moveTo(legX, cy + 14)
    ctx.lineTo(legX + legOff, cy + 26)
    ctx.stroke()
  }
}

function drawBird(ctx, bird) {
  const bx = bird.x
  const by = bird.y

  // Body oval
  ctx.fillStyle = '#2A3A6A'
  ctx.beginPath()
  ctx.ellipse(bx + 12, by + 7, 12, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Wings — two bezier arcs above body
  ctx.fillStyle = '#2A3A6A'
  // Left wing
  ctx.beginPath()
  ctx.moveTo(bx + 4, by + 5)
  ctx.bezierCurveTo(bx - 6, by - 8, bx - 2, by - 12, bx + 6, by + 2)
  ctx.closePath()
  ctx.fill()
  // Right wing
  ctx.beginPath()
  ctx.moveTo(bx + 20, by + 5)
  ctx.bezierCurveTo(bx + 30, by - 8, bx + 26, by - 12, bx + 18, by + 2)
  ctx.closePath()
  ctx.fill()

  // Beak — small gold triangle
  ctx.fillStyle = '#D4AF37'
  ctx.beginPath()
  ctx.moveTo(bx + 23, by + 6)
  ctx.lineTo(bx + 28, by + 8)
  ctx.lineTo(bx + 23, by + 10)
  ctx.closePath()
  ctx.fill()
}

function drawObstacle(ctx, obs, speed) {
  const { type, x } = obs

  if (type === 'wall_low') {
    const h = 40
    const wallY = GROUND_Y - h
    ctx.fillStyle = '#2A2A5A'
    ctx.fillRect(x, wallY, 28, h)
    ctx.fillStyle = '#D4AF37'
    ctx.fillRect(x, wallY, 28, 3)
    ctx.strokeStyle = '#D4AF3760'
    ctx.lineWidth = 1
    ctx.strokeRect(x, wallY, 28, h)
  } else if (type === 'wall_high') {
    const h = 75
    const wallY = GROUND_Y - h
    ctx.fillStyle = '#3A2A5A'
    ctx.fillRect(x, wallY, 28, h)
    ctx.fillStyle = '#D4AF37'
    ctx.fillRect(x, wallY, 28, 3)
    ctx.strokeStyle = '#D4AF3760'
    ctx.lineWidth = 1
    ctx.strokeRect(x, wallY, 28, h)
  } else if (type === 'spike_wall') {
    const h = 50
    const wallY = GROUND_Y - h
    ctx.fillStyle = '#4A1A1A'
    ctx.fillRect(x, wallY, 32, h)
    ctx.fillStyle = '#D4AF37'
    ctx.fillRect(x, wallY, 32, 3)
    // Spikes on top
    ctx.fillStyle = '#FF4444'
    const spikeCount = 4
    const sw = 32 / spikeCount
    for (let i = 0; i < spikeCount; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * sw, wallY)
      ctx.lineTo(x + i * sw + sw / 2, wallY - 10)
      ctx.lineTo(x + i * sw + sw, wallY)
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = '#D4AF3760'
    ctx.lineWidth = 1
    ctx.strokeRect(x, wallY, 32, h)
  } else if (type === 'enemy') {
    drawEnemy(ctx, obs)
  } else if (type === 'bird') {
    drawBird(ctx, obs)
  }
  // gap is handled by ground drawing
}

// ─── Obstacle dimensions ──────────────────────────────────────────────────────
function obsWidth(type) {
  if (type === 'gap')        return 90
  if (type === 'enemy')      return 36
  if (type === 'bird')       return 30
  if (type === 'spike_wall') return 32
  if (type === 'wall_high')  return 28
  return 28 // wall_low
}

// ─── Spawn a new obstacle ─────────────────────────────────────────────────────
function spawnObstacle(canvasW, speed, cleared = 0) {
  const type = randomObstacleType()
  const gapW = type === 'gap' ? Math.min(155, 90 + Math.floor(cleared * 0.8)) : obsWidth(type)
  const w = gapW
  const obs = { type, x: canvasW + 10, w, counted: false }
  if (type === 'enemy') {
    obs.vx = -(speed + 1.5)
    obs.animFrame = 0
  }
  if (type === 'bird') {
    obs.baseY = GROUND_Y - 110 - Math.random() * 20
    obs.sineOffset = Math.random() * Math.PI * 2
    obs.y = obs.baseY
  }
  return obs
}

// ─── Particle helpers ─────────────────────────────────────────────────────────
function spawnParticles(particles, x, y, count, colors) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 4 + 1
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 40 + Math.floor(Math.random() * 20),
      maxLife: 60,
      size: Math.random() * 5 + 2,
    })
  }
}

const GOLD_COLORS   = ['#D4AF37', '#FFD700', '#FFF0A0', '#FFAA00']
const HIT_COLORS    = ['#FF4444', '#FF8800', '#FF2200', '#FFCC00']
const DEFEAT_COLORS = ['#D4AF37', '#FF6B6B', '#4ECDC4', '#FFFFFF', '#FFD700']

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

// ─── Main component ───────────────────────────────────────────────────────────
export default function GamePage() {
  const navigate = useNavigate()
  const {
    gamePhase,
    obstaclesCleared,
    lives,
    startGame,
    clearObstacle,
    loseLife,
    resetGame,
  } = useGameStore()

  const quizWon =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('hbdw_quiz_won') === 'true'
      : false

  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const animFrameRef = useRef(null)
  const gameLoopRef  = useRef(null)

  // Synced refs so game loop always sees latest React state
  const livesRef              = useRef(lives)
  const obstaclesClearedRef   = useRef(obstaclesCleared)
  const gamePhaseRef          = useRef(gamePhase)
  livesRef.current             = lives
  obstaclesClearedRef.current  = obstaclesCleared
  gamePhaseRef.current         = gamePhase

  // All mutable game state — no React re-renders needed inside the loop
  const gsRef = useRef({
    playerY:        GROUND_Y - PLAYER_H_STAND,
    playerVY:       0,
    isDucking:      false,
    onGround:       true,
    wasOnGround:    true,
    obstacles:      [],
    particles:      [],
    comboTexts:     [],
    frame:          0,
    speed:          SPEED_BASE,
    bgScrollX:      0,
    shakeFrames:    0,
    invincible:     false,
    invincibleFrames: 0,
    animFrame:      0,
    nextSpawnIn:    72,
    clearedLocal:   0,
    combo:          0,
    stars:          [],
    confetti:       [],
  })

  // ── Star generation ──────────────────────────────────────────────────────
  function ensureStars(cw) {
    if (gsRef.current.stars.length > 0) return
    const stars = []
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * cw,
        y: Math.random() * (GROUND_Y - 20),
        r: Math.random() * 1.8 + 0.3,
        gold: Math.random() < 0.15,
        twinkleOffset: Math.random() * Math.PI * 2,
      })
    }
    gsRef.current.stars = stars
  }

  // ── Confetti spawn ───────────────────────────────────────────────────────
  function spawnConfetti(cw) {
    const pieces = []
    const colors = ['#D4AF37', '#FFD700', '#FF6B6B', '#4ECDC4', '#FFFFFF', '#C084FC', '#FF9900']
    for (let i = 0; i < 120; i++) {
      pieces.push({
        x:    Math.random() * cw,
        y:    Math.random() * 200 - 250,
        vx:   (Math.random() - 0.5) * 5,
        vy:   Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        w:    Math.random() * 10 + 5,
        h:    Math.random() * 5 + 3,
        rot:  Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
        life: 350,
      })
    }
    gsRef.current.confetti = pieces
  }

  // ── Collision check helpers ───────────────────────────────────────────────
  function checkCollisions(gs, cw) {
    if (gs.invincible) return

    const playerH   = gs.isDucking ? PLAYER_H_DUCK : PLAYER_H_STAND
    const playerTop    = gs.playerY
    const playerBottom = gs.playerY + playerH
    const playerLeft   = PLAYER_X + 4
    const playerRight  = PLAYER_X + PLAYER_W - 4

    for (const obs of gs.obstacles) {
      const { type, x, w } = obs

      if (type === 'wall_low') {
        const h      = 40
        const obsTop = GROUND_Y - h
        if (playerRight > x + 2 && playerLeft < x + w - 2 &&
            playerBottom > obsTop && playerTop < GROUND_Y) {
          triggerHit(gs)
          return
        }
      } else if (type === 'wall_high') {
        const h      = 75
        const obsTop = GROUND_Y - h
        if (playerRight > x + 2 && playerLeft < x + w - 2 &&
            playerBottom > obsTop && playerTop < GROUND_Y) {
          triggerHit(gs)
          return
        }
      } else if (type === 'spike_wall') {
        // Must clear completely — collision = any overlap
        const h      = 60  // 50 body + 10 spikes
        const obsTop = GROUND_Y - h
        if (playerRight > x + 2 && playerLeft < x + w - 2 &&
            playerBottom > obsTop && playerTop < GROUND_Y) {
          triggerHit(gs)
          return
        }
      } else if (type === 'gap') {
        const playerMidX = PLAYER_X + PLAYER_W / 2
        if (playerMidX > x && playerMidX < x + w &&
            playerBottom > GROUND_Y + 10) {
          // Fell into gap — snap back and punish
          gs.playerY  = GROUND_Y - playerH
          gs.playerVY = 0
          gs.onGround = true
          triggerHit(gs)
          return
        }
      } else if (type === 'enemy') {
        const enemyCenterX = obs.x + 18
        const enemyTop     = GROUND_Y - 32

        // Landing on top kills enemy
        const playerFalling  = gs.playerVY > 0
        const feetNearTop    = Math.abs(playerBottom - enemyTop) < 15
        const overlapX       = playerRight > obs.x + 4 && playerLeft < obs.x + obs.w - 4

        if (overlapX && playerFalling && feetNearTop && !gs.onGround) {
          // Defeat enemy
          spawnParticles(gs.particles, enemyCenterX, enemyTop, 10, DEFEAT_COLORS)
          obs.defeated = true
          gs.playerVY  = JUMP_FORCE * 0.6  // small bounce
          gs.combo++
          Sounds.play('enemyDefeat')
          return
        }

        // Side collision
        const enemyLeft  = obs.x + 4
        const enemyRight = obs.x + obs.w - 4
        if (playerRight > enemyLeft && playerLeft < enemyRight &&
            playerBottom > enemyTop + 4 && playerTop < GROUND_Y) {
          if (!feetNearTop) {
            triggerHit(gs)
            return
          }
        }
      } else if (type === 'bird') {
        // Bird is in the air — ducking avoids it
        if (gs.isDucking) continue
        const birdTop    = obs.y
        const birdBottom = obs.y + 14
        const birdLeft   = obs.x
        const birdRight  = obs.x + obs.w + 4

        if (playerRight > birdLeft && playerLeft < birdRight &&
            playerBottom > birdTop && playerTop < birdBottom) {
          triggerHit(gs)
          return
        }
      }
    }
  }

  function triggerHit(gs) {
    gs.invincible       = true
    gs.invincibleFrames = 90
    gs.shakeFrames      = 8
    gs.combo            = 0
    spawnParticles(gs.particles, PLAYER_X + PLAYER_W / 2, gs.playerY + 20, 12, HIT_COLORS)
    loseLife()
    Sounds.play('hit')
  }

  // ── Main game loop ─────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    const cw     = canvas.width
    const ch     = canvas.height
    const gs     = gsRef.current

    gs.frame++
    gs.animFrame = Math.floor(gs.frame / 8) % 2

    // ── Physics ─────────────────────────────────────────────────────────────
    gs.playerVY += GRAVITY
    gs.playerY  += gs.playerVY

    // Determine current player height
    const playerH = gs.isDucking ? PLAYER_H_DUCK : PLAYER_H_STAND

    // Over a gap?
    const playerMidX = PLAYER_X + PLAYER_W / 2
    const overGap = gs.obstacles.some(
      (o) => o.type === 'gap' && playerMidX > o.x && playerMidX < o.x + o.w
    )

    gs.wasOnGround = gs.onGround
    if (!overGap && gs.playerY >= GROUND_Y - playerH) {
      // Landed
      if (!gs.wasOnGround && gs.playerVY > 0) {
        Sounds.play('land')
      }
      gs.playerY  = GROUND_Y - playerH
      gs.playerVY = 0
      gs.onGround = true
    } else {
      gs.onGround = false
    }

    // Duck adjust — feet stay on ground
    if (gs.isDucking && gs.onGround) {
      gs.playerY = GROUND_Y - PLAYER_H_DUCK
    }

    // ── Speed ramp ──────────────────────────────────────────────────────────
    gs.speed = Math.min(SPEED_MAX, SPEED_BASE + gs.clearedLocal * SPEED_INCREMENT)

    // ── Scroll background ────────────────────────────────────────────────────
    gs.bgScrollX -= gs.speed * 0.6
    if (gs.bgScrollX <= -cw) gs.bgScrollX += cw

    // ── Spawn obstacles ──────────────────────────────────────────────────────
    gs.nextSpawnIn--
    if (gs.nextSpawnIn <= 0) {
      gs.obstacles.push(spawnObstacle(cw, gs.speed, gs.clearedLocal))
      // After obstacle 25, occasional double-spawn (second obstacle close behind)
      if (gs.clearedLocal >= 25 && Math.random() < 0.25) {
        const second = spawnObstacle(cw, gs.speed, gs.clearedLocal)
        // stagger it 120-160px behind the first
        second.x += 120 + Math.floor(Math.random() * 40)
        gs.obstacles.push(second)
      }
      const base = gs.clearedLocal < 20 ? 72
                 : gs.clearedLocal < 40 ? 55
                 : gs.clearedLocal < 60 ? 42
                 : 32
      const spread = Math.max(10, 28 - Math.floor(gs.clearedLocal / 5))
      gs.nextSpawnIn = base + Math.floor(Math.random() * spread)
    }

    // ── Move obstacles ───────────────────────────────────────────────────────
    for (const obs of gs.obstacles) {
      if (obs.type === 'enemy') {
        obs.x += obs.vx || -gs.speed
        obs.animFrame = gs.frame % 2
      } else if (obs.type === 'bird') {
        obs.x -= gs.speed
        obs.sineOffset = (obs.sineOffset || 0) + 0.09
        obs.y = obs.baseY + Math.sin(obs.sineOffset) * 22
      } else {
        obs.x -= gs.speed
      }
    }

    // ── Clear off-screen obstacles ───────────────────────────────────────────
    for (let i = gs.obstacles.length - 1; i >= 0; i--) {
      const obs = gs.obstacles[i]
      if (obs.x + obs.w < 0) {
        gs.obstacles.splice(i, 1)
        if (!obs.counted && !obs.defeated) {
          obs.counted = true
          gs.clearedLocal++
          gs.combo++
          clearObstacle()
          Sounds.play('coin')

          // Particle burst
          spawnParticles(gs.particles, obs.x + obs.w + 20, GROUND_Y - 30, 8, GOLD_COLORS)

          // Speed milestone
          if (gs.clearedLocal % 10 === 0) {
            Sounds.play('levelUp')
          }
        }
      } else if (obs.defeated) {
        gs.obstacles.splice(i, 1)
        obs.counted = true
        gs.clearedLocal++
        clearObstacle()
      }
    }

    // ── Collision detection ──────────────────────────────────────────────────
    checkCollisions(gs, cw)

    // ── Invincibility cooldown ───────────────────────────────────────────────
    if (gs.invincible) {
      gs.invincibleFrames--
      if (gs.invincibleFrames <= 0) gs.invincible = false
    }

    // ── Shake cooldown ───────────────────────────────────────────────────────
    if (gs.shakeFrames > 0) gs.shakeFrames--

    // ── Particles ────────────────────────────────────────────────────────────
    for (let i = gs.particles.length - 1; i >= 0; i--) {
      const p = gs.particles[i]
      p.vy += 0.2
      p.x  += p.vx
      p.y  += p.vy
      p.life--
      if (p.life <= 0) gs.particles.splice(i, 1)
    }

    // ── Confetti ──────────────────────────────────────────────────────────────
    if (gs.confetti.length > 0) {
      for (let i = gs.confetti.length - 1; i >= 0; i--) {
        const p = gs.confetti[i]
        p.x  += p.vx
        p.y  += p.vy
        p.rot += p.rotV
        p.life--
        if (p.life <= 0) gs.confetti.splice(i, 1)
      }
    }

    // ── Combo texts ───────────────────────────────────────────────────────────
    for (let i = gs.comboTexts.length - 1; i >= 0; i--) {
      gs.comboTexts[i].life--
      gs.comboTexts[i].y -= 0.5
      if (gs.comboTexts[i].life <= 0) gs.comboTexts.splice(i, 1)
    }
    // Show combo text on new combo (when cleared or enemy defeated)
    if (gs.combo >= 3 && gs.frame % 30 === 0) {
      gs.comboTexts.push({
        text: `+${gs.combo} COMBO!`,
        x: PLAYER_X + 40,
        y: (gsRef.current.playerY || GROUND_Y - 100) - 20,
        life: 60,
      })
    }

    // ── DRAW ──────────────────────────────────────────────────────────────────
    ctx.save()
    if (gs.shakeFrames > 0) {
      ctx.translate(Math.random() * 8 - 4, Math.random() * 8 - 4)
    }

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
    skyGrad.addColorStop(0, '#0D0D1A')
    skyGrad.addColorStop(1, '#1A1A2E')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, cw, ch)

    // Stars
    for (const s of gs.stars) {
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(gs.frame * 0.03 + s.twinkleOffset)
      ctx.fillStyle   = s.gold ? '#D4AF37' : '#FFFFFF'
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Scrolling ground layer (parallax)
    ctx.fillStyle = '#111128'
    ctx.fillRect(gs.bgScrollX,      GROUND_Y + 4, cw, ch - GROUND_Y - 4)
    ctx.fillRect(gs.bgScrollX + cw, GROUND_Y + 4, cw, ch - GROUND_Y - 4)

    // Draw ground with gap holes
    const gaps = gs.obstacles.filter((o) => o.type === 'gap')
    let gx = 0
    const sortedGaps = [...gaps].sort((a, b) => a.x - b.x)
    for (const gap of sortedGaps) {
      if (gx < gap.x) {
        ctx.fillStyle = '#12122A'
        ctx.fillRect(gx, GROUND_Y, gap.x - gx, ch - GROUND_Y)
        ctx.fillStyle = '#D4AF37'
        ctx.fillRect(gx, GROUND_Y, gap.x - gx, 3)
      }
      gx = gap.x + gap.w
    }
    if (gx < cw) {
      ctx.fillStyle = '#12122A'
      ctx.fillRect(gx, GROUND_Y, cw - gx, ch - GROUND_Y)
      ctx.fillStyle = '#D4AF37'
      ctx.fillRect(gx, GROUND_Y, cw - gx, 3)
    }

    // Obstacles
    for (const obs of gs.obstacles) {
      drawObstacle(ctx, obs, gs.speed)
    }

    // Wolfgang
    drawWolfgang(
      ctx,
      PLAYER_X,
      Math.round(gs.playerY),
      playerH,
      gs.isDucking,
      gs.animFrame,
      gs.invincible
    )

    // Ducking indicator
    if (gs.isDucking) {
      ctx.fillStyle = 'rgba(212,175,55,0.8)'
      ctx.font = 'bold 12px DM Sans, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('↓ DUCKEN', PLAYER_X + 42, gs.playerY + 10)
    }

    // Particles
    for (const p of gs.particles) {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle   = p.color
      ctx.fillRect(p.x, p.y, p.size, p.size)
    }
    ctx.globalAlpha = 1

    // Confetti
    for (const p of gs.confetti) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = Math.min(1, p.life / 60)
      ctx.fillStyle   = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    // Combo texts
    for (const ct of gs.comboTexts) {
      ctx.globalAlpha = ct.life / 60
      ctx.fillStyle   = '#FFD700'
      ctx.font        = 'bold 14px DM Sans, sans-serif'
      ctx.textAlign   = 'left'
      ctx.fillText(ct.text, ct.x, ct.y)
    }
    ctx.globalAlpha = 1

    // Milestone flash (every 10 obstacles)
    if (gs.clearedLocal > 0 && gs.clearedLocal % 10 === 0 && gs.frame % 60 < 40) {
      ctx.globalAlpha = 0.7
      ctx.fillStyle   = '#FFD700'
      ctx.font        = 'bold 22px DM Sans, sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText(`×${gs.clearedLocal}!`, cw / 2, CANVAS_H / 2 - 40)
      ctx.globalAlpha = 1
    }

    // ── HUD ──────────────────────────────────────────────────────────────────
    // Obstacle counter
    ctx.font      = 'bold 14px DM Sans, sans-serif'
    ctx.fillStyle = '#D4AF37'
    ctx.textAlign = 'left'
    ctx.fillText(`Hindernisse: ${gs.clearedLocal}/74`, 12, 24)

    // Speed bar
    ctx.fillStyle = '#888888'
    ctx.font      = '12px DM Sans, sans-serif'
    ctx.fillText('Tempo:', 12, 42)
    const speedRatio = (gs.speed - SPEED_BASE) / (SPEED_MAX - SPEED_BASE)
    ctx.fillStyle = '#1A1A2E'
    ctx.fillRect(62, 32, 70, 10)
    ctx.fillStyle = '#D4AF37'
    ctx.fillRect(62, 32, Math.floor(70 * Math.max(0, speedRatio)), 10)
    ctx.strokeStyle = '#D4AF3760'
    ctx.lineWidth   = 1
    ctx.strokeRect(62, 32, 70, 10)

    // Lives
    ctx.font      = '16px sans-serif'
    ctx.textAlign = 'right'
    const liveCount = livesRef.current
    ctx.fillStyle   = '#FF4444'
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < liveCount ? 1 : 0.25
      ctx.fillText('❤', cw - 12 - i * 22, 24)
    }
    ctx.globalAlpha = 1

    ctx.restore()

    // Continue loop
    animFrameRef.current = requestAnimationFrame(() => gameLoopRef.current?.())
  }, [clearObstacle, loseLife])

  gameLoopRef.current = gameLoop

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas    = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const cw = Math.min(container.clientWidth, 900)
      canvas.width  = cw
      canvas.height = CANVAS_H
      ensureStars(cw)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase])

  // ── Start / stop loop by phase ────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase === 'playing') {
      const cw = canvasRef.current ? canvasRef.current.width : 900
      // Reset all game state
      gsRef.current = {
        playerY:          GROUND_Y - PLAYER_H_STAND,
        playerVY:         0,
        isDucking:        false,
        onGround:         true,
        wasOnGround:      true,
        obstacles:        [],
        particles:        [],
        comboTexts:       [],
        frame:            0,
        speed:            SPEED_BASE,
        bgScrollX:        0,
        shakeFrames:      0,
        invincible:       false,
        invincibleFrames: 0,
        animFrame:        0,
        nextSpawnIn:      90,
        clearedLocal:     0,
        combo:            0,
        stars:            [],
        confetti:         [],
      }
      ensureStars(cw)
      animFrameRef.current = requestAnimationFrame(() => gameLoopRef.current?.())
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const cw  = canvas.width
      const ch  = canvas.height

      if (gamePhase === 'won') {
        Sounds.stopBgMusic()
        Sounds.play('win')

        // Draw base scene + overlay
        const drawWonFrame = () => {
          const gs = gsRef.current

          // Sky
          const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
          skyGrad.addColorStop(0, '#0D0D1A')
          skyGrad.addColorStop(1, '#1A1A2E')
          ctx.fillStyle = skyGrad
          ctx.fillRect(0, 0, cw, ch)

          // Stars
          for (const s of gs.stars) {
            ctx.beginPath()
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
            ctx.globalAlpha = 0.6
            ctx.fillStyle   = s.gold ? '#D4AF37' : '#FFFFFF'
            ctx.fill()
          }
          ctx.globalAlpha = 1

          // Ground
          ctx.fillStyle = '#12122A'
          ctx.fillRect(0, GROUND_Y, cw, ch - GROUND_Y)
          ctx.fillStyle = '#D4AF37'
          ctx.fillRect(0, GROUND_Y, cw, 3)

          // Wolfgang standing still
          drawWolfgang(ctx, PLAYER_X, GROUND_Y - PLAYER_H_STAND, PLAYER_H_STAND, false, 0, false)

          // Confetti
          const gs2 = gsRef.current
          for (const p of gs2.confetti) {
            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.rot)
            ctx.globalAlpha = Math.min(1, p.life / 60)
            ctx.fillStyle   = p.color
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
            ctx.restore()
          }
          ctx.globalAlpha = 1

          // Dark overlay
          ctx.fillStyle = 'rgba(10,10,26,0.72)'
          ctx.fillRect(0, 0, cw, ch)

          // Win text
          ctx.textAlign = 'center'
          const grad = ctx.createLinearGradient(cw / 2 - 180, 0, cw / 2 + 180, 0)
          grad.addColorStop(0, '#D4AF37')
          grad.addColorStop(0.5, '#FFD700')
          grad.addColorStop(1, '#D4AF37')
          ctx.fillStyle = grad
          ctx.font      = 'bold 30px Playfair Display, serif'
          ctx.fillText('🏆 Du hast gewonnen!', cw / 2, ch / 2 - 20)

          ctx.fillStyle = '#FFFFFF'
          ctx.font      = '17px DM Sans, sans-serif'
          ctx.fillText('Wolfgang hat alle 74 Hindernisse gemeistert!', cw / 2, ch / 2 + 20)
        }

        spawnConfetti(cw)

        const winLoop = () => {
          const gs = gsRef.current
          if (!canvasRef.current) return

          // Update confetti
          for (let i = gs.confetti.length - 1; i >= 0; i--) {
            const p = gs.confetti[i]
            p.x  += p.vx; p.y += p.vy
            p.rot += p.rotV; p.life--
            if (p.life <= 0) gs.confetti.splice(i, 1)
          }

          drawWonFrame()
          animFrameRef.current = requestAnimationFrame(winLoop)
        }
        animFrameRef.current = requestAnimationFrame(winLoop)
      } else if (gamePhase === 'dead') {
        Sounds.stopBgMusic()
        Sounds.play('gameOver')

        const gs = gsRef.current
        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
        skyGrad.addColorStop(0, '#0D0D1A')
        skyGrad.addColorStop(1, '#1A1A2E')
        ctx.fillStyle = skyGrad
        ctx.fillRect(0, 0, cw, ch)

        // Ground
        ctx.fillStyle = '#12122A'
        ctx.fillRect(0, GROUND_Y, cw, ch - GROUND_Y)
        ctx.fillStyle = '#D4AF37'
        ctx.fillRect(0, GROUND_Y, cw, 3)

        // Wolfgang fallen
        drawWolfgang(ctx, PLAYER_X, GROUND_Y - PLAYER_H_DUCK, PLAYER_H_DUCK, true, 0, false)

        // Overlay
        ctx.fillStyle = 'rgba(10,10,26,0.75)'
        ctx.fillRect(0, 0, cw, ch)

        ctx.textAlign = 'center'
        ctx.fillStyle = '#FF4444'
        ctx.font      = 'bold 32px Playfair Display, serif'
        ctx.fillText('Game Over', cw / 2, ch / 2 - 20)

        ctx.fillStyle = '#CCCCCC'
        ctx.font      = '16px DM Sans, sans-serif'
        ctx.fillText(
          `Wolfgang hat ${gs.clearedLocal} von 74 Hindernissen geschafft.`,
          cw / 2, ch / 2 + 18
        )
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase])

  // ── Jump / Duck input ─────────────────────────────────────────────────────
  const handleJump = useCallback(() => {
    if (gamePhaseRef.current !== 'playing') return
    const gs = gsRef.current
    if (gs.onGround && !gs.isDucking) {
      gs.playerVY = JUMP_FORCE
      gs.onGround = false
      Sounds.play('jump')
    }
  }, [])

  const handleDuckStart = useCallback(() => {
    if (gamePhaseRef.current !== 'playing') return
    gsRef.current.isDucking = true
  }, [])

  const handleDuckEnd = useCallback(() => {
    gsRef.current.isDucking = false
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault()
        handleJump()
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleDuckStart()
      }
    }
    const onKeyUp = (e) => {
      if (e.key === 'ArrowDown') {
        handleDuckEnd()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [handleJump, handleDuckStart, handleDuckEnd])

  // Mobile swipe handling
  const touchStartY = useRef(null)
  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    touchStartY.current = e.touches[0].clientY
    handleJump()
  }, [handleJump])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    if (touchStartY.current !== null) {
      const dy = e.touches[0].clientY - touchStartY.current
      if (dy > 30) {
        handleDuckStart()
      }
    }
  }, [handleDuckStart])

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault()
    touchStartY.current = null
    handleDuckEnd()
  }, [handleDuckEnd])

  // ── Styles ────────────────────────────────────────────────────────────────
  const pageStyle = {
    minHeight:      '100vh',
    background:     '#0D0D1A',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '24px 16px',
    fontFamily:     '"DM Sans", sans-serif',
    color:          '#FFFFFF',
  }

  const goldText = {
    background:            'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)',
    WebkitBackgroundClip:  'text',
    WebkitTextFillColor:   'transparent',
    backgroundClip:        'text',
  }

  // ── Idle screen ───────────────────────────────────────────────────────────
  if (gamePhase === 'idle') {
    return (
      <div style={pageStyle}>
      <button
        style={homeBtnStyle}
        onClick={() => { Sounds.play('click'); Sounds.stopBgMusic(); navigate('/'); }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.background = 'rgba(13,13,26,0.85)'; }}
      >
        ← Home
      </button>
        {quizWon ? (
          <div style={{
            maxWidth: 600, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          }}>
            <div style={{
              display: 'inline-block', background: '#1A1A2E',
              border: '1px solid #D4AF37', borderRadius: 20,
              padding: '6px 18px', fontSize: 14, color: '#D4AF37', letterSpacing: '0.05em',
            }}>
              🎮 Arcade-Bonus
            </div>

            <h1 style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: 'clamp(26px, 5vw, 40px)',
              margin: 0, lineHeight: 1.2,
              ...goldText,
            }}>
              Wolfgang vs. 74 Hindernisse
            </h1>

            <p style={{ fontSize: 16, color: '#CCCCCC', lineHeight: 1.8, margin: 0, maxWidth: 500 }}>
              Du hast das Quiz gemeistert! Jetzt muss Wolfgang 74 Hindernisse überwinden.
              Springe über Wände, überquere Abgründe, weiche Vögeln aus und beseitige Feinde.
            </p>

            <div style={{
              background: '#12122A', border: '1px solid #D4AF3740',
              borderRadius: 10, padding: '14px 24px',
              fontSize: 14, color: '#AAAAAA', lineHeight: 2, textAlign: 'left',
            }}>
              <div><span style={{ color: '#D4AF37', fontWeight: 700 }}>Leertaste / ↑ / Tippen</span> — springen</div>
              <div><span style={{ color: '#D4AF37', fontWeight: 700 }}>↓ / Wischen nach unten</span> — ducken (Vögel ausweichen)</div>
              <div><span style={{ color: '#D4AF37', fontWeight: 700 }}>Auf Feind springen</span> — Feind besiegen</div>
            </div>

            <button
              onClick={() => {
                Sounds.init()
                Sounds.playBgMusic('game')
                startGame()
              }}
              style={{
                marginTop: 8, padding: '14px 40px',
                background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
                border: 'none', borderRadius: 8,
                fontSize: 17, fontWeight: 700, color: '#0D0D1A',
                cursor: 'pointer', letterSpacing: '0.03em',
                boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(212,175,55,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,175,55,0.4)' }}
            >
              Spiel starten →
            </button>
          </div>
        ) : (
          <div style={{
            maxWidth: 480, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          }}>
            <div style={{ fontSize: 52 }}>🔒</div>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 24, margin: 0, color: '#777777' }}>
              Spiel gesperrt
            </h2>
            <p style={{ color: '#888888', lineHeight: 1.7, margin: 0 }}>
              Löse zuerst das Quiz, um dieses Spiel freizuschalten!
            </p>
            <button
              onClick={() => navigate('/quiz')}
              style={{
                padding: '12px 28px', background: 'transparent',
                border: '1px solid #D4AF37', borderRadius: 8,
                fontSize: 15, color: '#D4AF37', cursor: 'pointer',
              }}
            >
              Quiz lösen →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Playing / Dead / Won ──────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <button
        style={homeBtnStyle}
        onClick={() => { Sounds.play('click'); Sounds.stopBgMusic(); navigate('/'); }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.background = 'rgba(13,13,26,0.85)'; }}
      >
        ← Home
      </button>
      <div
        ref={containerRef}
        style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={900}
          height={CANVAS_H}
          onClick={handleJump}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'block',
            borderRadius: '8px 8px 0 0',
            border: '2px solid #D4AF3740',
            borderBottom: 'none',
            cursor: gamePhase === 'playing' ? 'pointer' : 'default',
            touchAction: 'none',
            width: '100%',
          }}
        />

        {/* Progress bar */}
        <div style={{
          width: '100%', height: 8,
          background: '#1A1A2E',
          border: '1px solid #D4AF3740',
          borderTop: 'none', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (obstaclesCleared / TOTAL_OBSTACLES) * 100)}%`,
            background: 'linear-gradient(90deg, #D4AF37, #FFD700)',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Controls hint */}
        {gamePhase === 'playing' && (
          <p style={{ textAlign: 'center', color: '#666666', fontSize: 12, margin: '6px 0 0' }}>
            <kbd style={{ color: '#D4AF37', background: '#1A1A2E', padding: '1px 6px', borderRadius: 4, border: '1px solid #D4AF3750' }}>SPACE</kbd>
            {' / '}
            <kbd style={{ color: '#D4AF37', background: '#1A1A2E', padding: '1px 6px', borderRadius: 4, border: '1px solid #D4AF3750' }}>↑</kbd>
            {' springen  ·  '}
            <kbd style={{ color: '#D4AF37', background: '#1A1A2E', padding: '1px 6px', borderRadius: 4, border: '1px solid #D4AF3750' }}>↓</kbd>
            {' ducken'}
          </p>
        )}

        {/* Won extras */}
        {gamePhase === 'won' && (
          <div style={{
            textAlign: 'center', marginTop: 28,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          }}>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(18px, 3.5vw, 26px)', margin: 0, ...goldText }}>
              🏆 Geschafft! Wolfgang hat alle 74 Hindernisse gemeistert!
            </h2>
            <button
              onClick={resetGame}
              style={{
                padding: '11px 30px', background: 'transparent',
                border: '1px solid #D4AF37', borderRadius: 8,
                fontSize: 15, color: '#D4AF37', cursor: 'pointer', letterSpacing: '0.02em',
              }}
            >
              Nochmal spielen
            </button>
          </div>
        )}

        {/* Dead extras */}
        {gamePhase === 'dead' && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => {
                Sounds.init()
                Sounds.playBgMusic('game')
                startGame()
              }}
              style={{
                padding: '12px 36px',
                background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
                border: 'none', borderRadius: 8,
                fontSize: 16, fontWeight: 700, color: '#0D0D1A',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(212,175,55,0.35)',
              }}
            >
              Nochmal versuchen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
