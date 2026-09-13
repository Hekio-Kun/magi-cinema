param(
  [int]$Bots = 1000
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   KHOI DONG MAGI CINEMA VIRTUAL BOT SWARM ($Bots BOTS)   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Dang ket noi gia lap $Bots nguoi dung truc tuyen cung luc vao he thong..." -ForegroundColor Yellow
Write-Host "Hay mo https://hekio.tokyo/admin de quan sat so nguoi online tang len!" -ForegroundColor Yellow
Write-Host "Nhan Ctrl + C bat cu luc nao de ngat toan bo bot." -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

try {
  node swarm.mjs $Bots
} finally {
  Pop-Location
}
