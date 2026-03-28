import { create } from 'zustand'
import { getGameQuestions } from '../data/questions.js'
import { getSafeAmount } from '../data/prizes.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const initialState = {
  gamePhase: 'idle',
  quizWon: typeof localStorage !== 'undefined'
    ? localStorage.getItem('hbdw_quiz_won') === 'true'
    : false,

  questions: [],
  currentQ: 0,

  shuffledAnswers: [],
  hiddenIndices: [],

  answered: false,
  lastCorrect: false,
  selectedIndex: -1,

  lifelines: { fifty: false, audience: false, phone: false },
  audiencePercentages: null,
  phoneHintVisible: false,
}

function buildShuffledAnswers(question) {
  const entries = question.answers.map((text) => ({
    text,
    isCorrect: text === question.correct,
  }))
  return shuffle(entries)
}

export const useQuizStore = create((set, get) => ({
  ...initialState,

  // --- Internal helper ---
  _loadQuestion(n) {
    const { questions } = get()
    const shuffledAnswers = buildShuffledAnswers(questions[n])
    set({
      currentQ: n,
      shuffledAnswers,
      hiddenIndices: [],
      answered: false,
      lastCorrect: false,
      selectedIndex: -1,
      audiencePercentages: null,
      phoneHintVisible: false,
    })
  },

  // --- Actions ---
  startGame() {
    const questions = getGameQuestions()
    set({
      questions,
      currentQ: 0,
      shuffledAnswers: [],
      hiddenIndices: [],
      answered: false,
      lastCorrect: false,
      selectedIndex: -1,
      lifelines: { fifty: false, audience: false, phone: false },
      audiencePercentages: null,
      phoneHintVisible: false,
      gamePhase: 'playing',
    })
    get()._loadQuestion(0)
  },

  selectAnswer(displayIdx) {
    const { answered, shuffledAnswers } = get()
    if (answered) return
    const isCorrect = shuffledAnswers[displayIdx].isCorrect
    set({
      answered: true,
      selectedIndex: displayIdx,
      lastCorrect: isCorrect,
    })
  },

  nextQuestion() {
    const { lastCorrect, currentQ } = get()
    if (!lastCorrect) {
      set({ gamePhase: 'lost' })
      return
    }
    if (currentQ < 14) {
      const next = currentQ + 1
      get()._loadQuestion(next)
    } else {
      // currentQ === 14 and correct — game won
      localStorage.setItem('hbdw_quiz_won', 'true')
      set({ gamePhase: 'won', quizWon: true })
    }
  },

  useFiftyFifty() {
    const { lifelines, answered, shuffledAnswers } = get()
    if (lifelines.fifty || answered) return

    const correctIdx = shuffledAnswers.findIndex((a) => a.isCorrect)
    const wrongIndices = shuffledAnswers
      .map((_, i) => i)
      .filter((i) => i !== correctIdx)

    const picked = shuffle(wrongIndices).slice(0, 2)

    set({
      hiddenIndices: picked,
      lifelines: { ...lifelines, fifty: true },
    })
  },

  useAudience() {
    const { lifelines, answered, shuffledAnswers, hiddenIndices } = get()
    if (lifelines.audience || answered) return

    const correctIdx = shuffledAnswers.findIndex((a) => a.isCorrect)
    const activeWrongIndices = shuffledAnswers
      .map((_, i) => i)
      .filter((i) => i !== correctIdx && !hiddenIndices.includes(i))

    const correctPct = Math.floor(Math.random() * 20) + 70 // 70–89
    const remaining = 100 - correctPct
    const wrongCount = activeWrongIndices.length

    // Distribute remaining % among active wrong answers
    let wrongPercentages = []
    if (wrongCount > 0) {
      // Random split: assign random amounts summing to `remaining`
      let left = remaining
      for (let i = 0; i < wrongCount - 1; i++) {
        const max = left - (wrongCount - 1 - i)
        const val = max > 0 ? Math.floor(Math.random() * (max + 1)) : 0
        wrongPercentages.push(val)
        left -= val
      }
      wrongPercentages.push(left)
    }

    const percentages = [0, 0, 0, 0]
    percentages[correctIdx] = correctPct
    activeWrongIndices.forEach((idx, i) => {
      percentages[idx] = wrongPercentages[i] ?? 0
    })
    // Hidden indices stay 0

    set({
      audiencePercentages: percentages,
      lifelines: { ...lifelines, audience: true },
    })
  },

  usePhone() {
    const { lifelines, answered } = get()
    if (lifelines.phone || answered) return
    set({
      phoneHintVisible: true,
      lifelines: { ...lifelines, phone: true },
    })
  },

  resetQuiz() {
    const { quizWon } = get()
    set({ ...initialState, quizWon })
  },

  // --- Computed helper ---
  correctDisplayIndex() {
    return get().shuffledAnswers.findIndex((a) => a.isCorrect)
  },
}))
