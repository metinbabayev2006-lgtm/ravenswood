// Board-only visibility. RoomInstance continues to show people in the same room.
export const roomInteriorsVisible = (state, inspect) => state?.status !== 'playing' && !!inspect

export function boardCharacters(state) {
  return new Set((state?.players || [])
    .filter(p => !state.inside?.[p.id] && !(state.status === 'playing' && typeof state.positions?.[p.character] === 'string'))
    .map(p => p.character))
}
