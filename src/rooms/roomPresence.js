// Wer ist gerade in welcher Raum-Instanz? (liest nur den Spielstand, ändert nichts)
import { PEOPLE } from '../../shared/game.js'

// { zimmerId: [{ id, name, character, color, active }] } – active = diese Person ist gerade am Zug
export function occupantsByRoom(state) {
  const out = {}
  if (!state?.inside) return out
  const activeId = state.players?.[state.turn]?.id
  for (const p of state.players || []) {
    const room = state.inside[p.id]
    if (!room) continue
    ;(out[room] ||= []).push({ id: p.id, name: p.name, character: p.character, color: PEOPLE.find(c => c.id === p.character)?.color || '#e5d6b1', active: p.id === activeId })
  }
  return out
}
// Figuren, die gerade nicht auf dem Brett stehen, weil ihre Person im Raum ist.
export const insideCharacters = state => new Set((state?.players || []).filter(p => state.inside?.[p.id]).map(p => p.character))
