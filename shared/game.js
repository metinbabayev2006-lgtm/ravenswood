export const PEOPLE = [
  { id: 'ruby', name: 'Rubin', title: 'Die Erbin', color: '#d96464' },
  { id: 'gold', name: 'Gold', title: 'Der Gastgeber', color: '#e6be61' },
  { id: 'sage', name: 'Salbei', title: 'Die Botanikerin', color: '#7bac8d' },
  { id: 'blue', name: 'Saphir', title: 'Der Professor', color: '#77a7d2' },
  { id: 'plum', name: 'Pflaume', title: 'Die Pianistin', color: '#b38ac7' },
  { id: 'ivory', name: 'Elfenbein', title: 'Der Arzt', color: '#e5dfd2' },
]
export const ROOMS = [
  { id: 'kitchen', name: 'Küche', x: 0, y: 0, door: [4, 5], tone: '#546b60', icon: '◈', passage: 'study' },
  { id: 'ballroom', name: 'Ballsaal', x: 7, y: 0, door: [9, 5], tone: '#806b52', icon: '♫' },
  { id: 'garden', name: 'Wintergarten', x: 14, y: 0, door: [14, 5], tone: '#476b5d', icon: '❧', passage: 'lounge' },
  { id: 'dining', name: 'Speisezimmer', x: 0, y: 7, door: [5, 9], tone: '#8a6050', icon: '◇' },
  { id: 'billiard', name: 'Billardzimmer', x: 14, y: 7, door: [13, 9], tone: '#436c69', icon: '●' },
  { id: 'lounge', name: 'Salon', x: 0, y: 14, door: [4, 13], tone: '#81586a', icon: '♧', passage: 'garden' },
  { id: 'hall', name: 'Eingangshalle', x: 7, y: 14, door: [9, 13], tone: '#7c715d', icon: '⌂' },
  { id: 'study', name: 'Arbeitszimmer', x: 14, y: 14, door: [14, 13], tone: '#5e6480', icon: '✒', passage: 'kitchen' },
  { id: 'library', name: 'Bibliothek', x: 7, y: 7, door: [9, 6], tone: '#6d5a4b', icon: '▤' },
]
export const STARTS = [[6, 0], [12, 0], [18, 6], [18, 12], [12, 18], [6, 18]]
export const roomAt = (x, y) => ROOMS.find(r => x >= r.x && x < r.x + 5 && y >= r.y && y < r.y + 5)
export const corridor = (x, y) => x >= 0 && x < 19 && y >= 0 && y < 19 && !roomAt(x, y)
export function distance(from, to) {
  const start = typeof from === 'string' ? ROOMS.find(r => r.id === from)?.door : from
  const target = typeof to === 'string' ? ROOMS.find(r => r.id === to)?.door : to
  if (!start || !target || !corridor(...target)) return Infinity
  const queue = [[...start, 0]], seen = new Set([start.join(',')])
  for (let i = 0; i < queue.length; i++) {
    const [x, y, d] = queue[i]
    if (x === target[0] && y === target[1]) return d + (typeof from === 'string' ? 1 : 0) + (typeof to === 'string' ? 1 : 0)
    for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const key = `${a},${b}`
      if (corridor(a, b) && !seen.has(key)) { seen.add(key); queue.push([a, b, d + 1]) }
    }
  }
  return Infinity
}

// Corridor path, including both endpoint door tiles. Room entry/exit costs
// still come from distance(), exactly as the server validates a move.
export function corridorPath(from,to){
  const start=typeof from==='string'?ROOMS.find(r=>r.id===from)?.door:from
  const end=typeof to==='string'?ROOMS.find(r=>r.id===to)?.door:to
  if(!Array.isArray(start)||!Array.isArray(end)||start.length!==2||end.length!==2||!corridor(...start)||!corridor(...end))return []
  const queue=[start],parent=new Map([[start.join(','),null]])
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i]
    if(x===end[0]&&y===end[1]){const result=[];let p=end;while(p){result.unshift([...p]);p=parent.get(p.join(','))}return result}
    for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(corridor(...p)&&!parent.has(p.join(','))){parent.set(p.join(','),[x,y]);queue.push(p)}
  }
  return []
}
