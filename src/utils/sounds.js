// Web Audio API Sound Manager
// All sounds are generated programmatically — no audio files required.

// ---------------------------------------------------------------------------
// Note frequency table (Hz)
// ---------------------------------------------------------------------------
const NOTE = {
  C2: 65,
  C3: 131,
  C4: 262,
  D4: 294,
  E4: 330,
  F4: 349,
  G4: 392,
  A4: 440,
  Bb3: 233,
  Ab3: 208,
  G3: 196,
  C5: 523,
  D5: 587,
  E5: 659,
  F5: 698,
  G5: 784,
  A5: 880,
  B5: 988,
  C6: 1047,
  D6: 1175,
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------
let ctx         = null;
let masterGain  = null;
let bgIntervals = [];
let bgTimeouts  = [];
let _isMuted    = false;
let _unlocked   = false; // true once iOS audio pipeline is fully open

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Create and connect a master gain node to the audio context destination. */
function createMasterGain() {
  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
  masterGain.connect(ctx.destination);
}

/** Create a short buffer of white noise. */
function createNoiseBuffer(seconds = 0.1) {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Create a BufferSourceNode from a noise buffer, connected through a gain
 * envelope into masterGain.
 *
 * @param {AudioBuffer} buffer
 * @param {number} startGain
 * @param {number} decayTime   seconds over which gain falls to 0
 * @param {number} when        ctx.currentTime offset
 * @param {AudioNode} [filterNode] optional filter to insert before gain
 */
function playNoiseBuffer(buffer, startGain, decayTime, when = 0, filterNode = null) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(startGain, when);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, when + decayTime);

  if (filterNode) {
    source.connect(filterNode);
    filterNode.connect(gainNode);
  } else {
    source.connect(gainNode);
  }
  gainNode.connect(masterGain);

  source.start(when);
  source.stop(when + decayTime + 0.01);
}

/**
 * Play a single oscillator tone with an envelope.
 *
 * @param {string}  type        OscillatorType
 * @param {number}  startFreq
 * @param {number}  endFreq     frequency at end of duration (for glide)
 * @param {number}  duration    seconds
 * @param {number}  gain
 * @param {number}  when        absolute ctx time to start
 * @param {number}  [attack]    attack time in seconds (default 0.005)
 * @param {number}  [release]   release time in seconds (default 0.01)
 */
function playTone(type, startFreq, endFreq, duration, gain, when, attack = 0.005, release = 0.01) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, when);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, when + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, when);
  gainNode.gain.linearRampToValueAtTime(gain, when + attack);
  gainNode.gain.setValueAtTime(gain, when + duration - release);
  gainNode.gain.linearRampToValueAtTime(0.0001, when + duration);

  osc.connect(gainNode);
  gainNode.connect(masterGain);

  osc.start(when);
  osc.stop(when + duration + 0.01);
}

/**
 * Create the AudioContext + play a 1-frame silent buffer.
 * iOS Safari requires BOTH steps inside a synchronous user-gesture call stack
 * to fully unlock the audio pipeline. Safe to call multiple times.
 */
function tryUnlock() {
  if (_unlocked) return;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      createMasterGain();
    }
    // Playing a silent 1-frame buffer is the mandatory iOS unlock trick.
    // ctx.resume() alone is not sufficient on Safari — you must schedule audio.
    const silentBuf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const silentSrc = ctx.createBufferSource();
    silentSrc.buffer = silentBuf;
    silentSrc.connect(ctx.destination);
    silentSrc.start(0);
    ctx.resume().then(() => { _unlocked = true; });
  } catch (e) {
    console.warn('Web Audio unlock failed:', e);
  }
}

// ── Auto-unlock on the very first user interaction anywhere on the page ───────
// Fires in the capture phase — before React's handlers — so the AudioContext
// is created & unlocked synchronously in the gesture stack on iOS Safari.
if (typeof document !== 'undefined') {
  const _autoUnlock = () => {
    tryUnlock();
    document.removeEventListener('touchstart', _autoUnlock, true);
    document.removeEventListener('mousedown',  _autoUnlock, true);
    document.removeEventListener('keydown',    _autoUnlock, true);
  };
  document.addEventListener('touchstart', _autoUnlock, { capture: true, passive: true });
  document.addEventListener('mousedown',  _autoUnlock, { capture: true });
  document.addEventListener('keydown',    _autoUnlock, { capture: true });
}

/** Guard: returns true if AudioContext is running. */
function isReady() {
  if (!ctx || !masterGain) return false;
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

/** Cancel all pending background music timers. */
function clearBgTimers() {
  bgIntervals.forEach((id) => clearInterval(id));
  bgTimeouts.forEach((id) => clearTimeout(id));
  bgIntervals = [];
  bgTimeouts = [];
}

// ---------------------------------------------------------------------------
// Sound effect implementations
// ---------------------------------------------------------------------------

const effects = {
  click() {
    const when = ctx.currentTime;
    playTone('sine', 440, 220, 0.05, 0.15, when, 0.002, 0.01);
  },

  correct() {
    const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    const stepDuration = 0.08;
    const when = ctx.currentTime;
    notes.forEach((freq, i) => {
      playTone('triangle', freq, freq, stepDuration, 0.18, when + i * stepDuration, 0.005, 0.02);
    });
  },

  wrong() {
    const when = ctx.currentTime;
    playTone('sawtooth', 440, 220, 0.3, 0.2, when, 0.01, 0.05);
  },

  jump() {
    const when = ctx.currentTime;
    playTone('square', 200, 600, 0.08, 0.15, when, 0.003, 0.01);
  },

  land() {
    const when = ctx.currentTime;
    playTone('sine', 100, 50, 0.06, 0.4, when, 0.001, 0.04);
  },

  coin() {
    const when = ctx.currentTime;
    playTone('sine', 880, 1200, 0.1, 0.2, when, 0.003, 0.02);
  },

  hit() {
    const when = ctx.currentTime;
    // Sawtooth pitch drop
    playTone('sawtooth', 300, 80, 0.2, 0.2, when, 0.002, 0.05);
    // Noise burst
    const buf = createNoiseBuffer(0.08);
    playNoiseBuffer(buf, 0.25, 0.08, when);
  },

  enemyDefeat() {
    const when = ctx.currentTime;
    playTone('square', 600, 200, 0.12, 0.2, when, 0.003, 0.06);
  },

  win() {
    const when = ctx.currentTime;
    const ascNotes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    const stepDur = 0.15;
    // Ascending arpeggio
    ascNotes.forEach((freq, i) => {
      playTone('triangle', freq, freq, stepDur, 0.18, when + i * stepDur, 0.005, 0.02);
    });
    // Held chord at end
    const chordStart = when + ascNotes.length * stepDur;
    const chordDur = 0.45;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((freq) => {
      playTone('triangle', freq, freq, chordDur, 0.12, chordStart, 0.01, 0.1);
    });
  },

  gameOver() {
    const notes = [NOTE.C5, NOTE.A4, NOTE.F4, NOTE.C4];
    const stepDur = 0.2;
    const when = ctx.currentTime;
    notes.forEach((freq, i) => {
      playTone('sine', freq, freq, stepDur, 0.18, when + i * stepDur, 0.01, 0.04);
    });
  },

  levelUp() {
    const when = ctx.currentTime;
    playTone('triangle', 300, 900, 0.3, 0.2, when, 0.01, 0.05);
  },

  questionLoad() {
    const when = ctx.currentTime;
    const dur = 0.2;
    const buf = createNoiseBuffer(dur);
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(200, when);
    hpf.frequency.exponentialRampToValueAtTime(4000, when + dur);
    playNoiseBuffer(buf, 0.18, dur, when, hpf);
  },

  birthdaySting() {
    // First 4 notes of Happy Birthday: C C D C F E
    // Using a fun subset: C4 C4 D4 C4
    const melody = [
      { freq: NOTE.C4, dur: 0.18 },
      { freq: NOTE.C4, dur: 0.18 },
      { freq: NOTE.D4, dur: 0.28 },
      { freq: NOTE.C4, dur: 0.28 },
      { freq: NOTE.F4, dur: 0.28 },
      { freq: NOTE.E4, dur: 0.45 },
    ];
    let when = ctx.currentTime;
    melody.forEach(({ freq, dur }) => {
      playTone('triangle', freq, freq, dur, 0.2, when, 0.01, 0.04);
      when += dur + 0.02;
    });
  },
};

// ---------------------------------------------------------------------------
// Background music track implementations
// ---------------------------------------------------------------------------

/**
 * Schedule a looping sequence of notes using setTimeout chains.
 * Returns an object with a `stop()` method.
 *
 * @param {Array<{freq:number|null, dur:number, type:string, gain:number}>} noteSeq
 * @param {number} loopLengthMs  total length of one loop in ms
 */
function scheduleNoteLoop(noteSeq, loopLengthMs) {
  let stopped = false;
  const timeouts = [];

  function scheduleLoop() {
    if (stopped || !isReady()) return;

    let offsetMs = 0;
    noteSeq.forEach(({ freq, dur, type, gain }) => {
      const t = setTimeout(() => {
        if (stopped || !isReady()) return;
        if (freq) {
          const when = ctx.currentTime;
          playTone(type, freq, freq, dur / 1000, gain, when, 0.01, dur / 1000 * 0.3);
        }
      }, offsetMs);
      timeouts.push(t);
      offsetMs += dur;
    });

    // Schedule next loop iteration
    const loopTimeout = setTimeout(scheduleLoop, loopLengthMs);
    timeouts.push(loopTimeout);
  }

  scheduleLoop();

  return {
    stop() {
      stopped = true;
      timeouts.forEach((id) => clearTimeout(id));
    },
  };
}

/**
 * Schedule a recurring kick/pulse using setInterval.
 * @param {Function} fn   called each interval
 * @param {number}   ms
 */
function scheduleInterval(fn, ms) {
  const id = setInterval(() => {
    if (isReady()) fn();
  }, ms);
  bgIntervals.push(id);
  return id;
}

// Active loop controller (has .stop())
let activeBgLoop = null;

const tracks = {
  home() {
    // Gentle birthday ambiance — C major, ~100 BPM (400ms per note)
    const seq = [
      NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4, NOTE.C4, null,
      NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.C5, NOTE.G4, NOTE.E4, null,
    ].map((freq) => ({ freq, dur: 400, type: 'sine', gain: 0.08 }));

    const loopMs = seq.length * 400;
    activeBgLoop = scheduleNoteLoop(seq, loopMs);
  },

  quiz() {
    // Tense loop — 250ms per note, triangle wave
    const melodyNotes = [
      NOTE.C3, NOTE.C3, NOTE.G3, NOTE.C3, NOTE.Bb3, NOTE.C3, null,
      NOTE.C3, NOTE.C3, NOTE.Ab3, NOTE.C3, NOTE.G3, null,
    ].map((freq) => ({ freq, dur: 250, type: 'triangle', gain: 0.06 }));

    const loopMs = melodyNotes.length * 250;
    activeBgLoop = scheduleNoteLoop(melodyNotes, loopMs);

    // Subtle bass pulse every 500ms
    scheduleInterval(() => {
      playTone('sine', NOTE.C2, NOTE.C2, 0.4, 0.04, ctx.currentTime, 0.01, 0.1);
    }, 500);
  },

  game() {
    // Upbeat arcade 8-bit — 120ms per note, square wave
    const seq = [
      NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.B5, NOTE.G5, NOTE.E5, NOTE.C5,
      NOTE.D5, NOTE.F5, NOTE.A5, NOTE.D6, NOTE.C6, NOTE.A5, NOTE.F5, NOTE.D5,
    ].map((freq) => ({ freq, dur: 120, type: 'square', gain: 0.05 }));

    const loopMs = seq.length * 120;
    activeBgLoop = scheduleNoteLoop(seq, loopMs);

    // Drum-like kick: brown noise burst every 480ms
    scheduleInterval(() => {
      const buf = createNoiseBuffer(0.05);
      playNoiseBuffer(buf, 0.08, 0.05, ctx.currentTime);
    }, 480);
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const Sounds = {
  isMuted: false,

  /**
   * Explicitly unlock audio — call this in any button handler for extra safety.
   * The global touchstart listener already handles the common case automatically.
   */
  init() {
    tryUnlock();
  },

  /**
   * Start background music for the given track.
   * @param {'home'|'quiz'|'game'} track
   */
  playBgMusic(track) {
    this.init(); // resume suspended context if coming back from background
    if (!isReady()) return;
    this.stopBgMusic();

    const startTrack = tracks[track];
    if (!startTrack) {
      console.warn(`Sounds.playBgMusic: unknown track "${track}"`);
      return;
    }
    startTrack();
  },

  /** Stop all background music. */
  stopBgMusic() {
    if (activeBgLoop) {
      activeBgLoop.stop();
      activeBgLoop = null;
    }
    clearBgTimers();
  },

  /** Toggle mute on/off. Updates `isMuted`. */
  toggleMute() {
    if (!isReady()) return;
    _isMuted = !_isMuted;
    this.isMuted = _isMuted;
    masterGain.gain.setValueAtTime(_isMuted ? 0 : 0.7, ctx.currentTime);
  },

  /**
   * Play a one-shot sound effect.
   * Implicitly calls init() so any tap/click can unlock audio on mobile.
   * @param {string} effect
   */
  play(effect) {
    this.init(); // safe to call repeatedly; resumes suspended ctx on iOS
    if (!isReady()) return;
    const fn = effects[effect];
    if (!fn) {
      console.warn(`Sounds.play: unknown effect "${effect}"`);
      return;
    }
    fn();
  },
};
