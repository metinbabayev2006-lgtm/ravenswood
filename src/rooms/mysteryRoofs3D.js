import * as THREE from 'three'

// Every roof and window looks the same, whether anyone is inside or not.
function slateTexture(textures) {
  const existing = textures.find(t => t.name === 'manor-slate')
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = 768; canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#141722'; ctx.fillRect(0, 0, 768, 512)
  for (let row = 0; row < 16; row++) for (let col = -1; col < 16; col++) {
    const x = col * 52 + (row % 2) * 26, y = row * 32
    const n = (row * 19 + col * 13 + 101) % 7
    ctx.fillStyle = ['#303342', '#353745', '#2c303d', '#3a3b49', '#34333f', '#2e3341', '#3d3946'][n]
    ctx.fillRect(x + 1, y + 1, 50, 30)
    ctx.fillStyle = '#5b5b6a'; ctx.fillRect(x + 2, y + 1, 49, 1)
    ctx.fillStyle = '#11151f'; ctx.fillRect(x + 1, y + 29, 50, 3)
    ctx.fillStyle = 'rgba(205,191,169,.10)'; ctx.fillRect(x + 7 + n * 3, y + 6, 1, 13)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.name = 'manor-slate'; texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4; textures.push(texture)
  return texture
}

export function buildMysteryRoof(parent, room, { box, label, textures }) {
  const roof = new THREE.Group()
  roof.name = `closed-room:${room.id}`
  parent.add(roof)
  box(roof, 2.5, .68, 2.5, 5, .96, 5, '#33252e')
  box(roof, 2.5, .3, 2.5, 5.03, .16, 5.03, '#51404a')
  box(roof, 2.5, 1.12, 2.5, 5.16, .12, 5.16, '#76604d')
  box(roof, 2.5, 1.2, 2.5, 5.25, .08, 5.25, '#211e26')
  const low = 1.23, high = 2.13, edge = -.12, far = 5.12
  const a = [edge, low, edge], b = [far, low, edge], c = [far, low, far], d = [edge, low, far]
  const north = [2.5, high, 1.5], south = [2.5, high, 3.5]
  const material = new THREE.MeshStandardMaterial({ map: slateTexture(textures), roughness: .87, side: THREE.DoubleSide })
  const face = (points, uv) => {
    const vertices = [], texcoords = []
    for (let i = 1; i < points.length - 1; i++) for (const k of [0, i, i + 1]) { vertices.push(...points[k]); texcoords.push(...uv[k]) }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2))
    geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true; mesh.receiveShadow = true; roof.add(mesh)
  }
  face([a, d, south, north], [[0, 0], [1, 0], [.69, 1], [.31, 1]])
  face([c, b, north, south], [[0, 0], [1, 0], [.69, 1], [.31, 1]])
  face([b, a, north], [[0, 0], [1, 0], [.5, .7]])
  face([d, c, south], [[0, 0], [1, 0], [.5, .7]])
  const seam = (from, to, width = .04, color = '#8f7258') => {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), delta = end.clone().sub(start)
    const beam = box(roof, 0, 0, 0, width, delta.length(), width, color)
    beam.position.copy(start.add(end).multiplyScalar(.5))
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())
  }
  for (const [from, to] of [[a, north], [b, north], [c, south], [d, south]]) seam(from, to)
  seam(north, south, .12, '#9d8060')
  for (const [from, to] of [[a, b], [b, c], [c, d], [d, a]]) seam(from, to, .065, '#57464a')
  // Small, sealed chimney: no smoke or lighting tied to room occupancy.
  box(roof, 3.55, 1.99, 2.3, .4, .7, .48, '#55434a')
  for (const y of [1.78, 1.98, 2.18]) box(roof, 3.55, y, 2.3, .415, .025, .495, '#75616a')
  box(roof, 3.55, 2.36, 2.3, .53, .12, .61, '#b09b7d')
  box(roof, 3.55, 2.43, 2.3, .3, .025, .35, '#181720')
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, .43), new THREE.MeshBasicMaterial({ map: label(room.name), side: THREE.DoubleSide }))
  sign.rotation.x = -Math.PI / 2 + Math.atan2(.9, 1.62)
  sign.position.set(2.5, 1.61, 4.5)
  roof.add(sign)
  for (const a of [1.15, 3.85]) for (const edge of [0, 5]) {
    box(roof, a, .78, edge, .63, .45, .045, '#8e745c')
    box(roof, a, .78, edge === 0 ? -.028 : 5.028, .49, .33, .018, '#d1a46c')
    box(roof, a, .78, edge === 0 ? -.04 : 5.04, .035, .36, .025, '#40323c')
    box(roof, edge, .78, a, .045, .45, .63, '#8e745c')
    box(roof, edge === 0 ? -.028 : 5.028, .78, a, .018, .33, .49, '#d1a46c')
    box(roof, edge === 0 ? -.04 : 5.04, .78, a, .025, .36, .035, '#40323c')
  }
  return roof
}
