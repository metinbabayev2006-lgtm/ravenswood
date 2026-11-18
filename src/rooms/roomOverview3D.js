import * as THREE from 'three'
import { COLS, ROWS, ROOM_MAPS } from './roomData.js'
import { roomSurfaceCanvases } from './roomRenderer.js'

// The overview is a miniature of the playable room: every object comes from
// ROOM_MAPS, including its footprint, height, colour and direction.
export function buildRoomOverview(parent, room, { box, sphere, textures }) {
  const def = ROOM_MAPS[room.id]
  const root = new THREE.Group()
  root.name = `room-overview:${room.id}`
  root.position.set(2.5, .19, 2.5)
  // Turn the shared north-facing entrance towards this room's board corridor.
  root.rotation.y = room.door[1] < room.y ? 0 : room.door[1] > room.y + 4 ? Math.PI : room.door[0] < room.x ? Math.PI / 2 : -Math.PI / 2
  parent.add(root)
  const content = new THREE.Group()
  content.position.set(-2.5, 0, -2.5)
  content.scale.set(5 / COLS, .43, 5 / ROWS)
  root.add(content)
  const wood = '#6b4a35', brass = '#c9a35f', dark = '#251c1b'
  const b = (g, x, y, z, w, h, d, c = wood) => box(g, x, y, z, w, h, d, c)
  const s = (g, x, y, z, r, c) => sphere(g, x, y, z, r, c)
  const surface = (canvas, w, h) => {
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 4
    textures.push(map)
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: .92, side: THREE.DoubleSide }))
  }
  const surfaces = roomSurfaceCanvases(def)
  const floor = surface(surfaces.floor, COLS, ROWS)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(COLS / 2, .012, ROWS / 2)
  floor.receiveShadow = true
  content.add(floor)
  // The back wall uses the same wallpaper, windows, curtains and wall art.
  const wall = surface(surfaces.wall, COLS, 2.7)
  wall.position.set(COLS / 2, 1.35, -.025)
  content.add(wall)
  b(content, COLS / 2, 2.73, 0, COLS + .2, .09, .16, def.wall.trim)
  // Low cutaway walls keep the furniture visible when rotating the board.
  for (const x of [0, COLS]) b(content, x, .13, ROWS / 2, .12, .26, ROWS, def.wall.base)
  b(content, COLS / 2, .08, ROWS, COLS, .16, .12, def.wall.trim)

  const legs = (g, w, d, h, color = dark) => {
    for (const x of [-w * .4, w * .4]) for (const z of [-d * .36, d * .36]) b(g, x, h / 2, z, .12, h, .12, color)
  }
  const tabletop = (g, o, color = wood) => {
    legs(g, o.w, o.d, o.h - .1)
    b(g, 0, o.h - .06, 0, o.w, .12, o.d, color)
  }
  for (const o of def.objects) {
    const g = new THREE.Group(), { w, d, h } = o
    g.name = o.spot || o.kind
    g.userData.roomObject = o
    g.position.set(o.x + w / 2, 0, o.y + d / 2)
    content.add(g)
    const color = o.color || wood
    switch (o.kind) {
      case 'chair': case 'stool': case 'bench': {
        const seat = h * .52
        legs(g, w, d, seat)
        b(g, 0, seat, 0, w, .13, d, o.color || '#805347')
        if (o.kind !== 'stool') {
          // roomRenderer puts n-facing chair backs on their north edge.
          if (o.face === 'e' || o.face === 'w') b(g, (o.face === 'w' ? -1 : 1) * (w / 2 - .06), h * .76, 0, .12, h * .55, d, color)
          else b(g, 0, h * .76, (o.face === 's' ? 1 : -1) * (d / 2 - .06), w, h * .55, .12, color)
        }
        break
      }
      case 'table': case 'desk': case 'console': case 'island': case 'cart': {
        tabletop(g, o, o.cloth || (o.kind === 'island' ? '#b98b5a' : wood))
        if (o.kind === 'desk') {
          b(g, 0, h + .015, 0, w * .65, .025, d * .68, '#2f5a46')
          b(g, -.2, h + .04, 0, .7, .025, .55, '#f1ead6')
          b(g, w * .34, h * .45, 0, w * .23, h * .85, d * .86)
        }
        if (o.set) for (let i = 0; i < 4; i++) for (const z of [-d * .32, d * .32]) {
          const plate = s(g, -w * .36 + i * w * .24, h + .055, z, .23, '#efe9dc'); plate.scale.y = .14
        }
        if (o.items === 'book') b(g, 0, h + .06, 0, .8, .08, .55, '#e9d7aa')
        if (o.kind === 'cart' || o.glasses) for (let i = 0; i < 3; i++) b(g, -.4 + i * .4, h + .18, 0, .12, .34, .12, ['#52735a', '#b79a58', '#8d3c48'][i])
        break
      }
      case 'counter': case 'stove': case 'fridge': {
        b(g, 0, h / 2, 0, w, h, d, '#acb9ad')
        if (o.kind === 'fridge') {
          b(g, 0, h * .66, d / 2 + .015, w * .92, .035, .03, '#70877b')
          b(g, w * .32, h * .55, d / 2 + .05, .06, .45, .06, brass)
        } else {
          b(g, 0, h + .025, 0, w, .08, d, '#e3e0cf')
          if (o.sink) { b(g, 0, h + .075, 0, w * .6, .03, d * .65, '#6d8c91'); b(g, 0, h + .24, -d * .3, .08, .35, .08, '#c5cbd0') }
          if (o.kind === 'stove') for (const x of [-w / 4, w / 4]) for (const z of [-d / 4, d / 4]) { const ring = s(g, x, h + .08, z, .22, '#272c2b'); ring.scale.y = .12 }
        }
        break
      }
      case 'shelf': case 'cabinet': {
        b(g, 0, h / 2, -d * .43, w, h, d * .14, '#38271d')
        for (const x of [-w / 2, w / 2]) b(g, x, h / 2, 0, .1, h, d)
        const rows = Math.max(2, Math.floor(h / .46))
        for (let j = 0; j <= rows; j++) b(g, 0, j * h / rows, 0, w, .075, d)
        if (o.kind === 'shelf' || o.glass) for (let j = 0; j < rows; j++) for (let i = 0; i < Math.floor(w / .25); i++) {
          b(g, -w / 2 + .18 + i * .25, j * h / rows + .18, d * .1, .17, .28 + (i % 3) * .025, d * .55, ['#7c353f', '#b3985b', '#426d61', '#596782', '#b58764'][(i + j) % 5])
        }
        else { b(g, 0, h / 2, d * .35, w * .94, h * .9, .1); for (const x of [-.12, .12]) s(g, x, h / 2, d / 2, .04, brass) }
        break
      }
      case 'sofa': case 'armchair': {
        b(g, 0, h * .3, 0, w, h * .5, d, o.color || '#9c3549')
        b(g, 0, h * .74, -d * .4, w, h * .52, d * .2, o.color || '#9c3549')
        for (const x of [-w * .44, w * .44]) b(g, x, h * .5, 0, w * .12, h * .65, d, o.color || '#9c3549')
        for (let i = 0; i < Math.max(1, Math.floor(w)); i++) b(g, -w * .29 + i * .9, h * .6, 0, Math.min(.8, w * .6), .15, d * .65, o.color || '#a84559')
        break
      }
      case 'pool': {
        tabletop(g, o, '#6b4a35'); b(g, 0, h + .05, 0, w - .4, .04, d - .4, '#24765d')
        for (const x of [-w * .45, 0, w * .45]) for (const z of [-d * .43, d * .43]) { const pocket = s(g, x, h + .08, z, .14, '#101914'); pocket.scale.y = .2 }
        for (let i = 0; i < 6; i++) s(g, .4 + i % 3 * .22, h + .15, -.2 + Math.floor(i / 3) * .22, .09, ['#efe9dc', '#b54749', '#e6be61'][i % 3])
        break
      }
      case 'piano': {
        tabletop(g, o, '#201e25'); b(g, 0, h * .8, -d * .12, w, h * .4, d * .72, '#201e25')
        b(g, 0, h, d * .36, w * .83, .08, d * .22, '#eee6d4')
        for (let i = 0; i < 15; i++) b(g, -w * .39 + i * w * .054, h + .06, d * .31, .065, .06, d * .13, '#15151a')
        break
      }
      case 'planter': case 'palm': case 'bed': {
        b(g, 0, Math.min(h, .45) / 2, 0, w, Math.min(h, .45), d, '#72503d')
        if (o.kind === 'palm') b(g, 0, h * .5, 0, .16, h * .8, .16, '#8f754a')
        for (let i = 0; i < (o.kind === 'bed' ? 6 : 4); i++) {
          const leaf = s(g, Math.sin(i * 2.4) * w * .27, o.kind === 'palm' ? h * .83 : Math.min(h, .45) + .25, Math.cos(i * 2.4) * d * .25, o.kind === 'palm' ? .5 : .28, ['#3b6b49', '#62835a', '#486f51'][i % 3])
          leaf.scale.set(o.kind === 'palm' ? 1.4 : 1, .55, 1)
        }
        break
      }
      case 'fountain': {
        b(g, 0, .25, 0, w, .5, d, '#a4b3af'); b(g, 0, .52, 0, w * .84, .025, d * .76, '#609caa')
        b(g, 0, h * .6, 0, .24, h, .24, '#b8c3bc'); const bowl = s(g, 0, h, 0, .64, '#b8c3bc'); bowl.scale.y = .25
        break
      }
      case 'fireplace': {
        b(g, 0, h / 2, -d * .23, w, h, d * .5, '#ad9f8b')
        b(g, 0, h * .38, d * .05, w * .66, h * .6, d * .2, '#211919')
        b(g, 0, h, 0, w + .15, .14, d + .12, '#c4b59d')
        for (let i = 0; i < 5; i++) s(g, -.6 + i * .3, .22 + i % 2 * .15, d * .2, .18, i % 2 ? '#ffb54f' : '#cd592c')
        break
      }
      case 'stairs': {
        for (let i = 0; i < 7; i++) { const rise = h * (7 - i) / 7; b(g, 0, rise / 2, -d / 2 + (i + .5) * d / 7, w, rise, d / 7, '#9c9589'); b(g, 0, rise + .025, -d / 2 + (i + .5) * d / 7, w * .5, .04, d / 7, '#7d1f2e') }
        break
      }
      case 'globe': case 'statue': case 'armor': case 'pillar': {
        b(g, 0, .08, 0, w, .16, d, o.kind === 'globe' ? wood : '#b6b7ad')
        if (o.kind === 'globe') { b(g, 0, h * .3, 0, .12, h * .6, .12); s(g, 0, h * .74, 0, w * .4, '#6295a0') }
        else if (o.kind === 'pillar') { b(g, 0, h / 2, 0, w * .65, h, d * .65, '#c9c4b6'); b(g, 0, h, 0, w, .14, d, '#d6d0c4') }
        else { b(g, 0, h * .45, 0, w * .45, h * .65, d * .4, '#a3aaa6'); s(g, 0, h * .87, 0, w * .2, '#c6c9be') }
        break
      }
      case 'lamp': {
        b(g, 0, .06, 0, w, .12, d, dark); b(g, 0, h / 2, 0, .07, h, .07, brass)
        const shade = s(g, 0, h * .86, 0, w * .65, '#f4d79d'); shade.scale.y = .65
        break
      }
      case 'clock': {
        b(g, 0, h / 2, 0, w, h, d, '#503628'); s(g, 0, h * .78, d / 2 + .02, w * .34, '#dec897').scale.z = .12
        b(g, 0, h * .35, d / 2 + .03, .05, h * .4, .04, brass)
        break
      }
      case 'cuerack': case 'ladder': {
        for (const x of [-w / 2, w / 2]) b(g, x, h / 2, 0, .08, h, .1)
        if (o.kind === 'ladder') for (let i = 1; i < 8; i++) b(g, 0, i * h / 8, 0, w, .06, .1, '#b98b5a')
        else for (let i = 0; i < 6; i++) b(g, -w * .4 + i * w * .16, h / 2, 0, .045, h, .045, '#d7bd8f')
        break
      }
      case 'safe': {
        b(g, 0, h / 2, 0, w, h, d, '#5c6168'); s(g, 0, h / 2, d / 2 + .025, .18, brass).scale.z = .15
        break
      }
      case 'gramophone': {
        b(g, 0, h * .2, 0, w, h * .4, d); const horn = s(g, .1, h * .72, 0, w * .42, brass); horn.scale.set(1, .75, .8)
        break
      }
      case 'crates': case 'barrel': {
        b(g, 0, h / 2, 0, w, h, d, '#9a7650')
        for (const y of [h * .2, h * .8]) b(g, 0, y, d / 2 + .015, w, .07, .04, '#514432')
        break
      }
      default: throw new Error(`Missing overview furniture: ${o.kind}`)
    }
  }
  return root
}
