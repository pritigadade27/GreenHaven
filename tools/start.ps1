$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Say($msg, $colour = 'Gray') { Write-Host "  $msg" -ForegroundColor $colour }

Write-Host ""
Write-Host "  Green Haven - starting" -ForegroundColor Magenta
Write-Host ""

# Require setup to have run
$envFile = Join-Path $root 'backend\.env'
if (-not (Test-Path $envFile)) {
    Write-Host "  backend\.env is missing - run SETUP.bat first." -ForegroundColor Red
    Read-Host '  Press Enter to close'
    exit 1
}

# Read .env into environment variables
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $k, $v = $line.Split('=', 2)
        Set-Item -Path "Env:\$($k.Trim())" -Value $v.Trim()
    }
}
Say 'settings loaded' Green

$mvn = (Get-Command mvn -ErrorAction SilentlyContinue)
if ($mvn) { $mvnCmd = 'mvn' } else { $mvnCmd = '.\mvnw.cmd' }

$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

$pass = @('MYSQL_USER','MYSQL_PASSWORD','GREENHAVEN_JWT_SECRET','RAZORPAY_MODE',
          'ADMIN_EMAIL','ADMIN_PASSWORD','ADMIN_NAME')
$exports = ($pass | Where-Object { Test-Path "Env:\$_" } |
            ForEach-Object { "`$env:$_='$((Get-Item Env:\$_).Value)'" }) -join '; '

# Start the backend in its own window
Say 'starting the API on port 8080...' Cyan
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "cd '$backend'; $exports; $mvnCmd spring-boot:run"
) | Out-Null

Say 'waiting for it to come up' Cyan
# Poll the API until it answers
$up = $false
foreach ($i in 1..60) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:8080/api/categories' -TimeoutSec 3 -UseBasicParsing
        if ($r.StatusCode -eq 200) { $up = $true; break }
    } catch { }
}
if ($up) { Say 'API is up' Green } else { Say 'API did not answer in 2 minutes - check its window' Yellow }

# Start the frontend dev server
Say 'starting the site on port 5173...' Cyan
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command', "cd '$frontend'; npm run dev"
) | Out-Null

# Open the site in a browser
Start-Sleep -Seconds 6
Start-Process 'http://localhost:5173'

Write-Host ""
Write-Host "  Open at  http://localhost:5173" -ForegroundColor Green
Write-Host "  Admin at http://localhost:5173/admin/login" -ForegroundColor Green
Write-Host ""
Write-Host "  Two other windows opened - closing them stops the site." -ForegroundColor DarkGray
Write-Host ""
