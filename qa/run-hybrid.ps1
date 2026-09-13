param(
  [ValidateSet('smoke', 'load', 'all')]
  [string]$Mode = 'all'
)

$ErrorActionPreference = 'Stop'
$qaRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $qaRoot
try {
  if ($Mode -in @('smoke', 'all')) {
    npm run test:ui
  }
  if ($Mode -in @('load', 'all')) {
    if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
      throw 'Chưa cài k6. Cài k6 rồi chạy lại, hoặc dùng .\run-hybrid.ps1 -Mode smoke.'
    }
    k6 run k6/load.js
  }
} finally {
  Pop-Location
}
