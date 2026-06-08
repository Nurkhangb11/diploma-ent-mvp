# Start backend + frontend with one command
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Stop-Port([int]$Port) {
    $seen = @{}
    $lines = netstat -ano | Select-String "LISTENING" | Select-String ":$Port\s"
    foreach ($line in $lines) {
        $procId = ($line.ToString().Trim() -split '\s+')[-1]
        if ($procId -match '^\d+$' -and -not $seen.ContainsKey($procId)) {
            $seen[$procId] = $true
            Write-Host "  free port $Port (PID $procId)"
            Start-Process -FilePath "taskkill" -ArgumentList "/PID", $procId, "/F" -Wait -NoNewWindow -ErrorAction SilentlyContinue | Out-Null
        }
    }
}

Write-Host ""
Write-Host "=== ENT Trainer ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Freeing ports 8080 and 3000..."
Stop-Port 8080
Stop-Port 3000
Start-Sleep -Milliseconds 800

if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "Go not found. Install from https://go.dev/dl/" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$Root\frontend\node_modules")) {
    Write-Host "[2/3] Installing frontend dependencies (first run)..."
    Push-Location "$Root\frontend"
    npm install
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Pop-Location
} else {
    Write-Host "[2/3] Frontend dependencies OK"
}

Write-Host "[3/3] Starting backend and frontend..."
Write-Host ""
Write-Host "  App:      http://localhost:3000" -ForegroundColor Green
Write-Host "  API:      http://localhost:8080" -ForegroundColor Green
Write-Host "  Stop:     Ctrl+C" -ForegroundColor Yellow
Write-Host ""

$backend = Start-Process -FilePath "go" -ArgumentList "run", "main.go" -WorkingDirectory $Root -PassThru -WindowStyle Hidden

function Stop-Backend {
    if ($backend -and -not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
}

$ready = $false
$apiPort = "8080"
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Path "$Root\.backend-port") {
        $apiPort = (Get-Content "$Root\.backend-port" -Raw).Trim()
    }
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$apiPort/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # still starting
    }
}

if (-not $ready) {
    Write-Host "Backend failed to start." -ForegroundColor Red
    Stop-Backend
    exit 1
}

Write-Host "  Backend ready on port $apiPort" -ForegroundColor Green
Write-Host ""

try {
    Push-Location "$Root\frontend"
    npm run dev
} finally {
    Write-Host ""
    Write-Host "Stopping backend..." -ForegroundColor Yellow
    Stop-Backend
    Stop-Port 8080
}
