// Namensschilder über den Zimmern im 3D-Brett: zeigen, wer gerade in der Raum-Instanz ist.
import * as THREE from 'three'
import { ROOMS } from '../../shared/game.js'
import { occupantsByRoom } from './roomPresence.js'

const W = 640, H = 150
function paint(canvas, names, active) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#281b24'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = active ? '#ffd686' : '#a17b4a'; ctx.lineWidth = active ? 8 : 5; ctx.strokeRect(3, 3, W - 6, H - 6)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#a17b4a'; ctx.font = 'bold 24px Georgia'; ctx.fillText('IM RAUM', W / 2, 36)
  ctx.fillStyle = '#e5d6b1'; ctx.font = 'bold 54px Georgia'; ctx.fillText(names.join(' · '), W / 2, 94, W - 50)
}

export function createRoomTags(scene) {
  const tags = new Map()
  for (const r of ROOMS) {
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, transparent: true }))
    sprite.scale.set(3.1, 0.73, 1); sprite.position.set(r.x - 7, 3.2, r.y - 7); sprite.renderOrder = 999; sprite.visible = false
    scene.add(sprite); tags.set(r.id, { canvas, map, sprite, key: '' })
  }
  return {
    update(state) {
      const occ = occupantsByRoom(state)
      for (const [id, t] of tags) {
        const list = occ[id] || [], key = list.map(o => o.name + (o.active ? '*' : '')).join('|')
        if (key === t.key) continue
        t.key = key; t.sprite.visible = list.length > 0
        if (list.length) { paint(t.canvas, list.map(o => o.name), list.some(o => o.active)); t.map.needsUpdate = true }
      }
    },
    dispose() { for (const t of tags.values()) { t.sprite.removeFromParent(); t.sprite.material.dispose(); t.map.dispose() } tags.clear() },
  }
}
