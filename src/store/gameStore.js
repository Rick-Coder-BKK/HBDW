import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  gamePhase: 'idle',       // 'idle' | 'playing' | 'dead' | 'won'
  obstaclesCleared: 0,
  lives: 3,
  highScore: parseInt(localStorage.getItem('hbdw_game_high') || '0'),

  startGame: () => set({ gamePhase: 'playing', obstaclesCleared: 0, lives: 3 }),

  clearObstacle: () => {
    const { obstaclesCleared } = get()
    const next = obstaclesCleared + 1
    if (next >= 74) {
      const hs = Math.max(next, parseInt(localStorage.getItem('hbdw_game_high') || '0'))
      localStorage.setItem('hbdw_game_high', String(hs))
      set({ obstaclesCleared: next, gamePhase: 'won', highScore: hs })
    } else {
      set({ obstaclesCleared: next })
    }
  },

  loseLife: () => {
    const { lives } = get()
    if (lives <= 1) set({ lives: 0, gamePhase: 'dead' })
    else set({ lives: lives - 1 })
  },

  resetGame: () => set({
    gamePhase: 'idle',
    obstaclesCleared: 0,
    lives: 3,
  }),
}))
