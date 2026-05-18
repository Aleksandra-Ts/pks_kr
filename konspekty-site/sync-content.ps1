# Копирует обновлённые .md из папки winx в content/
$winx = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dest = Join-Path $PSScriptRoot "content"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Copy-Item (Join-Path $winx "*-konspekt.md") -Destination $dest -Force
Copy-Item (Join-Path $winx "primery-tem-kontrolnoj.md") -Destination $dest -Force
Copy-Item (Join-Path $winx "otvety-kontrolnaya.md") -Destination $dest -Force

Write-Host "Готово. Файлов в content/:" (Get-ChildItem (Join-Path $dest "*.md")).Count
