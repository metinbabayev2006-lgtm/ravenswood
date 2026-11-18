import test from 'node:test'
import assert from 'node:assert/strict'
import { boardCharacters, roomInteriorsVisible } from '../src/rooms/boardVisibility.js'

const players = [{ id: 'a', character: 'ruby' }, { id: 'b', character: 'gold' }, { id: 'c', character: 'sage' }]
test('Brett: ohne Beitritte keine Figuren; solo eine, zu zweit zwei', () => {
  assert.equal(boardCharacters(undefined).size, 0)
  for (const count of [1, 2, 3]) {
    assert.deepEqual([...boardCharacters({ status: 'lobby', players: players.slice(0, count) })], players.slice(0, count).map(p => p.character))
  }
})
test('Brett: Personen in Zimmern verschwinden, beim Verlassen werden sie wieder sichtbar', () => {
  const state = { status: 'playing', players, inside: { a: 'kitchen' }, positions: { ruby: 'kitchen', gold: 'study', sage: [6, 2] } }
  assert.deepEqual([...boardCharacters(state)], ['sage'])
  assert.deepEqual([...boardCharacters({ ...state, inside: {}, positions: { ...state.positions, ruby: [6, 3] } })], ['ruby', 'sage'])
})
test('Brett: Einrichtung nur vor dem Start ansehen, laufendes Spiel schließt jedes Dach', () => {
  assert.equal(roomInteriorsVisible(undefined, false), false)
  assert.equal(roomInteriorsVisible({ status: 'lobby' }, true), true)
  assert.equal(roomInteriorsVisible({ status: 'playing' }, true), false)
  assert.equal(roomInteriorsVisible({ status: 'playing' }, false), false)
})
