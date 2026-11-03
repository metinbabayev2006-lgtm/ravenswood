param([string]$Nachricht = 'Spiel aktualisieren')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$ravenswoodRemote = git remote get-url origin
if ($LASTEXITCODE -ne 0 -or $ravenswoodRemote -ne 'https://github.com/metinbabayev2006-lgtm/ravenswood.git') { throw 'Dieses Skript erwartet das Ravenswood-Repository als origin.' }
$ravenswoodBranch = git branch --show-current
if ($ravenswoodBranch -ne 'main') { throw 'Bitte zuerst den gewünschten Stand auf main bereitstellen.' }
if (-not (Test-Path -LiteralPath node_modules)) {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'Installation fehlgeschlagen.' }
}
npm run offline
if ($LASTEXITCODE -ne 0) { throw 'Build fehlgeschlagen; nichts hochgeladen.' }
git add --all
if ($LASTEXITCODE -ne 0) { throw 'Dateien konnten nicht vorgemerkt werden.' }
git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
  git commit -m $Nachricht
  if ($LASTEXITCODE -ne 0) { throw 'Commit fehlgeschlagen.' }
} elseif ($LASTEXITCODE -ne 0) { throw 'Änderungen konnten nicht geprüft werden.' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Upload fehlgeschlagen. Prüfe GitHub-Anmeldung und gegebenenfalls neuere Änderungen auf GitHub.' }
Write-Host 'Hochgeladen. GitHub erstellt den Download unter:'
Write-Host 'https://github.com/metinbabayev2006-lgtm/ravenswood/actions'
