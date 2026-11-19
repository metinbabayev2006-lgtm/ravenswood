// Board-only visibility. RoomInstance continues to show people in the same room.

export function boardCharacters(state) {
  return new Set((state?.players || [])
    .filter(p => !p.eliminated && !state.inside?.[p.id] && !(state.status === 'playing' && typeof state.positions?.[p.character] === 'string'))
    .map(p => p.character))
}
