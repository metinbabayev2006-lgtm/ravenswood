import { copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url)), target = resolve(root, '../ravenswood-online')
for (const [source, destination] of [['src/sound.js', 'game-ui/sound.js'], ['src/FirstSteps.jsx', 'game-ui/FirstSteps.jsx'], ['src/DiceTray.jsx', 'game-ui/DiceTray.jsx'], ['src/ThreeBoard.jsx', 'game-ui/ThreeBoard.jsx'], ['src/FlatBoard.jsx', 'game-ui/FlatBoard.jsx'], ['src/StartGame.jsx', 'game-ui/StartGame.jsx'], ['src/MovementControls.jsx', 'game-ui/MovementControls.jsx'], ['src/Board.jsx', 'game-ui/Board.jsx'], ['src/Artwork.jsx', 'game-ui/Artwork.jsx'], ['src/App.jsx', 'game-ui/App.jsx'], ['src/App.css', 'game-ui/App.css'], ['src/index.css', 'game-ui/index.css'], ['shared/game.js', 'shared/game.js'], ['server/game.js', 'server/game.js']]) {
  const dest = resolve(target, destination); mkdirSync(dirname(dest), { recursive: true }); copyFileSync(resolve(root, source), dest)
}
console.log('Oberfläche und Spielregeln nach ravenswood-online synchronisiert. Dort bauen und über Sites veröffentlichen.')
