import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const scriptPath = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if (!scriptPath || !cssPath) throw new Error('Expected a built Vite page. Run npm run build first.');
let js = fs.readFileSync(path.join(dist, scriptPath), 'utf8');
const css = fs.readFileSync(path.join(dist, cssPath), 'utf8');
const mime = {'.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg','.svg':'image/svg+xml'};
for (const name of fs.readdirSync(path.join(dist, 'assets'))) {
  const type = mime[path.extname(name)];
  if (!type) continue;
  const uri = `data:${type};base64,${fs.readFileSync(path.join(dist, 'assets', name)).toString('base64')}`;
  js = js.replaceAll(`/assets/${name}`, uri);
}
if (/\bimport\s*\(/.test(js) || /["']\/assets\//.test(js)) throw new Error('Unbundled assets or dynamic imports remain.');
html = html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, '')
  .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, () => `<style>${css.replaceAll('</style', '<\\/style')}</style>`)
  .replace(/<link[^>]+rel="icon"[^>]*>/, '')
  .replace('</body>', () => `<script type="module">${js.replaceAll('</script', '<\\/script')}</script></body>`);
const out = path.join(root, 'offline');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'Ravenswood.html'), html);
fs.writeFileSync(path.join(out, 'LIES-MICH.txt'), `RAVENSWOOD – OFFLINE SPIELEN\r\n\r\n1. Die ZIP vollständig entpacken (unter Windows: Rechtsklick > Alle extrahieren).\r\n2. Ravenswood.html mit Chrome, Edge oder Firefox öffnen.\r\n3. Auf „Spiel starten“ klicken. Keine Installation, kein Konto, kein Server nötig.\r\n\r\nBilder und Musik sind in der HTML-Datei enthalten. Danach wird kein Internet benötigt.\r\nDie ZIP-Vorschau selbst führt das Spiel nicht aus: zuerst entpacken.\r\n\r\nSpielstände werden gespeichert, sofern der Browser lokalen Dateien Speicher erlaubt.\r\nJe nach Browser und Ablageort kann die Speicherung eingeschränkt sein.\r\nDas Verschieben oder Umbenennen der Datei kann einen anderen Spielstand öffnen.\r\n\r\nOriginalprojekt: Apollo-Blaze/Murder-Mystery auf GitHub.\r\nDeutsche spielbare Fassung mit Raumkarte und festen Dialogen.\r\n`);
console.log(`Offline-Datei erstellt: ${path.join(out, 'Ravenswood.html')} (${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MB)`);
