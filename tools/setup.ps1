$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot

function Say($msg, $colour = 'Gray') { Write-Host "  $msg" -ForegroundColor $colour }
function Ok($msg)   { Write-Host "  [ok] $msg" -ForegroundColor Green }
function Bad($msg)  { Write-Host "  [--] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "  Green Haven - setup" -ForegroundColor Magenta
Write-Host "  ===================" -ForegroundColor Magenta
Write-Host ""

$missing = @()

$java = $null
try { $java = (cmd /c 'java -version 2>&1') -join ' ' } catch { }
if ($java -match '"?(\d+)(\.|")') {
    $ver = [int]$Matches[1]
    if ($ver -ge 17) { Ok "Java $ver" } else { Bad "Java $ver - need 17 or newer"; $missing += 'java' }
} else { Bad 'Java not found'; $missing += 'java' }

$node = $null
try { $node = (cmd /c 'node -v 2>&1') -join ' ' } catch { }
if ($node -match 'v(\d+)') {
    $ver = [int]$Matches[1]
    if ($ver -ge 18) { Ok "Node $node" } else { Bad "Node $node - need 18 or newer"; $missing += 'node' }
} else { Bad 'Node.js not found'; $missing += 'node' }

$mysql = $null
$candidates = @('mysql.exe')
$candidates += (Get-ChildItem 'C:\Program Files\MySQL' -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue |
                Select-Object -Expand FullName)
$candidates += (Get-ChildItem "$env:USERPROFILE\mysql" -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue |
                Select-Object -Expand FullName)
foreach ($c in $candidates) {
    $found = Get-Command $c -ErrorAction SilentlyContinue
    if ($found) { $mysql = $found.Source; break }
}
if ($mysql) { Ok "MySQL client - $mysql" } else { Bad 'MySQL not found'; $missing += 'mysql' }

if ($missing.Count -gt 0) {
    Write-Host ""
    Bad 'Install the missing pieces first, then run this again:'
    if ($missing -contains 'java')  { Say '  Java 17   https://adoptium.net/temurin/releases/?version=17' Yellow }
    if ($missing -contains 'node')  { Say '  Node 20   https://nodejs.org/en/download' Yellow }
    if ($missing -contains 'mysql') { Say '  MySQL 8   https://dev.mysql.com/downloads/installer/  (pick Server + Workbench)' Yellow }
    Write-Host ""
    Read-Host '  Press Enter to close'
    exit 1
}

Write-Host ""
Say 'Database' Cyan

$sqlFile = Join-Path $root 'database\green_haven_full.sql'
if (-not (Test-Path $sqlFile)) { Bad "Missing $sqlFile"; Read-Host '  Press Enter'; exit 1 }

Say 'MySQL root password (blank if you set none):'
$secure = Read-Host '  root password' -AsSecureString
$rootPw = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
          [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

$env:MYSQL_PWD = $rootPw

function Ask-Mysql($sql) {
    return (cmd /c "`"$mysql`" -h 127.0.0.1 -u root -N -e `"$sql`" 2>nul")
}

$already = Ask-Mysql 'SELECT COUNT(*) FROM green_haven.plant'

if ($already -match '^\d+$' -and [int]$already -ge 154) {
    Ok "green_haven already loaded ($already products) - leaving it alone"
} else {
    Say 'Loading schema, catalogue and every migration...'
    $cmd = '"' + $mysql + '" -h 127.0.0.1 -u root --default-character-set=utf8mb4 < "' + $sqlFile + '"'
    cmd /c $cmd 2>&1 | Select-String -Pattern 'ERROR' | ForEach-Object { Bad $_ }
    $count = Ask-Mysql 'SELECT COUNT(*) FROM green_haven.plant'
    if ($count -match '^\d+$' -and [int]$count -eq 154) { Ok "$count products loaded" }
    else { Bad "Expected 154 products, got '$count'"; Read-Host '  Press Enter'; exit 1 }
}

$appPw = 'GreenHaven@' + (Get-Random -Minimum 100000 -Maximum 999999)
$grant = @"
CREATE USER IF NOT EXISTS 'priti'@'localhost' IDENTIFIED BY '$appPw';
CREATE USER IF NOT EXISTS 'priti'@'127.0.0.1' IDENTIFIED BY '$appPw';
ALTER USER 'priti'@'localhost' IDENTIFIED BY '$appPw';
ALTER USER 'priti'@'127.0.0.1' IDENTIFIED BY '$appPw';
GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
$grantFile = Join-Path $env:TEMP ('gh-grant-' + [Guid]::NewGuid().ToString('N') + '.sql')
$grant | Set-Content -Path $grantFile -Encoding ascii
cmd /c "`"$mysql`" -h 127.0.0.1 -u root < `"$grantFile`" 2>&1" |
    Select-String -Pattern 'ERROR' | ForEach-Object { Bad $_ }
Remove-Item $grantFile -Force -ErrorAction SilentlyContinue
Ok "application user 'priti' ready"
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue

Write-Host ""
Say 'Configuration' Cyan

$envFile = Join-Path $root 'backend\.env'
if (Test-Path $envFile) {
    Ok 'backend\.env already exists - keeping your settings'
} else {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $jwt = [Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', ''
    $adminPw = 'Admin@' + (Get-Random -Minimum 100000 -Maximum 999999)

    @"
MYSQL_USER=priti
MYSQL_PASSWORD=$appPw

GREENHAVEN_JWT_SECRET=$jwt

RAZORPAY_MODE=simulated

ADMIN_EMAIL=admin@greenhaven.com
ADMIN_PASSWORD=$adminPw
ADMIN_NAME=Green Haven Admin
"@ | Set-Content -Path $envFile -Encoding utf8
    Ok 'backend\.env written with fresh secrets'
    Say "admin sign-in:  admin@greenhaven.com  /  $adminPw" Yellow
}

Write-Host ""
Say 'Frontend packages (this takes a minute)' Cyan
Push-Location (Join-Path $root 'frontend')
cmd /c 'npm install --no-fund --no-audit'
$npmOk = ($LASTEXITCODE -eq 0)
Pop-Location
if ($npmOk) { Ok 'packages installed' } else { Bad 'npm install failed'; Read-Host '  Press Enter'; exit 1 }

Write-Host ""
Write-Host "  Setup complete." -ForegroundColor Green
Write-Host "  Starting the site now - double-click START.bat next time." -ForegroundColor Green
Write-Host ""
& (Join-Path $PSScriptRoot 'start.ps1')
