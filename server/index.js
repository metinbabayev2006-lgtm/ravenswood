import http from 'node:http'
import { randomInt } from 'node:crypto'
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, createReadStream } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeRoom, join, act, view } from './game.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const data = resolve(process.env.DATA_DIR || resolve(root, 'data'))
mkdirSync(data, { recursive: true })
const file = resolve(data, 'rooms.json')
const rooms = new Map(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [])
const persist = () => { writeFileSync(file + '.tmp', JSON.stringify([...rooms])); renameSync(file + '.tmp', file) }
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const code = () => Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('')
const limits = new Map()
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)) }
    try {
      if (req.method === 'GET' && url.pathname === '/api/health') return send(200, { ok: true })
      if (!['GET', 'POST'].includes(req.method)) return send(405, { error: 'Methode nicht erlaubt.' })
      let input = {}
      if (req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'JSON erforderlich.' })
        const key = req.socket.remoteAddress, now = Date.now(), limit = limits.get(key)
        if (!limit || now > limit.until) limits.set(key, { count: 1, until: now + 60000 })
        else if (++limit.count > 180) return send(429, { error: 'Zu viele Anfragen. Bitte kurz warten.' })
        // A finite per-address window also bounds the in-memory limiter.
        for (const [ip, window] of limits) if (window.until < now) limits.delete(ip)
        let body = ''
        for await (const chunk of req) { body += chunk; if (body.length > 4096) return send(413, { error: 'Anfrage zu groß.' }) }
        try { input = JSON.parse(body) } catch { return send(400, { error: 'Ungültiges JSON.' }) }
        if (!input || typeof input !== 'object' || Array.isArray(input)) return send(400, { error: 'Ungültige Anfrage.' })
      }
      if (req.method === 'POST' && url.pathname === '/api/rooms') {
        // Remove abandoned rooms; played rooms stay available for seven days.
        for (const [id, r] of rooms) if (Date.now() - r.updated > 7 * 86400000) rooms.delete(id)
        if (rooms.size >= 1000) return send(503, { error: 'Der Server ist ausgelastet.' })
        let id; do { id = code() } while (rooms.has(id))
        const room = makeRoom(id), player = join(room, input.name)
        rooms.set(id, room); persist()
        return send(201, { token: player.token, code: id, state: view(room, player.token) })
      }
      const match = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|action))?$/)
      if (!match || !rooms.has(match[1])) return send(404, { error: 'Raum nicht gefunden. Prüfe den Raumcode.' })
      const room = rooms.get(match[1]), operation = match[2]
      if (req.method === 'POST' && operation === 'join') {
        const player = join(room, input.name); persist()
        return send(201, { token: player.token, code: room.code, state: view(room, player.token) })
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '')
      if (!token || !room.players.some(p => p.token === token)) return send(401, { error: 'Dein Raumzugang ist ungültig.' })
      if (req.method === 'POST' && operation === 'action') {
        // Validate and mutate a copy: rejected actions never partially change a room.
        const draft = structuredClone(room)
        act(draft, token, input); rooms.set(draft.code, draft); persist()
        return send(200, view(draft, token))
      }
      if (req.method === 'GET' && !operation) return send(200, view(room, token))
      return send(404, { error: 'Endpunkt nicht gefunden.' })
    } catch (error) {
      if (error.code) { console.error('Serverfehler:', error.code); return send(500, { error: 'Der Spielstand konnte nicht gespeichert werden.' }) }
      return send(400, { error: error.message || 'Die Anfrage konnte nicht verarbeitet werden.' })
    }
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end() }
  const dist = resolve(root, 'dist')
  let path
  try { path = resolve(dist, '.' + decodeURIComponent(url.pathname)) } catch { res.writeHead(400); return res.end() }
  if (path !== dist && !path.startsWith(dist + sep)) { res.writeHead(403); return res.end() }
  if (!existsSync(path) || !extname(path)) path = resolve(dist, 'index.html')
  if (!existsSync(path)) { res.writeHead(503); return res.end('Bitte zuerst npm run build ausführen.') }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' }
  res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream')
  res.setHeader('Cache-Control', extname(path) === '.html' ? 'no-cache' : 'public, max-age=3600')
  if (req.method === 'HEAD') return res.end()
  const stream = createReadStream(path)
  stream.on('error', () => { if (!res.headersSent) res.writeHead(404); res.end() }); stream.pipe(res)
})
const port = Number(process.env.PORT || 3001)
server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Ravenswood Multiplayer: http://localhost:${port}`))
