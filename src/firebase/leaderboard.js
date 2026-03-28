import { db } from './config.js'
import {
  collection, addDoc, getDocs,
  query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'

export async function saveScore(playerName, prizeReached) {
  if (!db) return
  try {
    await addDoc(collection(db, 'scores'), {
      playerName,
      prizeReached,
      timestamp: serverTimestamp(),
    })
  } catch (e) {
    console.warn('Could not save score:', e)
  }
}

export async function getLeaderboard() {
  if (!db) return []
  try {
    const q = query(
      collection(db, 'scores'),
      orderBy('prizeReached', 'desc'),
      limit(10),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.warn('Could not load leaderboard:', e)
    return []
  }
}
