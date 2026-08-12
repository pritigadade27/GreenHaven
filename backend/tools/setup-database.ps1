<
  Green Haven — creates the database, the application user, the schema and the
  seed data in one go.

  Usage (from anywhere):
      powershell -ExecutionPolicy Bypass -File "backend\tools\setup-database.ps1"

  It will ask for your MySQL *root* password once. Everything after that is
  automatic. Safe to re-run: the schema drops and recreates its own tables, so
  a second run simply reloads a clean catalogue.

$ErrorActionPreference = 'Stop'

$resources = Join-Path $PSScriptRoot '..\src\main\resources'
$setupUser = Join-Path $resources 'setup-user.sql'
$schema    = Join-Path $resources 'schema.sql'
$data      = Join-Path $resources 'data.sql'

foreach ($f in @($setupUser, $schema, $data)) {
    if (-not (Test-Path $f)) { throw "Missing SQL file: $f" }
}

$mysql = (Get-Command mysql -ErrorAction SilentlyContinue).Source
if (-not $mysql) {
    $candidates = @(
        'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
        'C:\xampp\mysql\bin\mysql.exe',
        'C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe'
    )
    $mysql = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $mysql) {
    Write-Host ''
    Write-Host 'MySQL client not found.' -ForegroundColor Red
    Write-Host 'Install MySQL Community Server first:' -ForegroundColor Yellow
    Write-Host '  https://dev.mysql.com/downloads/installer/'
    Write-Host 'Then run this script again.'
    exit 1
}
Write-Host "Using mysql client: $mysql" -ForegroundColor DarkGray

$rootPw = Read-Host 'MySQL root password' -AsSecureString
$plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPw))

function Invoke-Sql {
    param([string]$File, [string]$User, [string]$Password, [string]$Database)
    $args = @("-u$User", "-p$Password", '--default-character-set=utf8mb4')
    if ($Database) { $args += $Database }
    Get-Content -Raw -Encoding UTF8 $File | & $mysql @args
    if ($LASTEXITCODE -ne 0) { throw "mysql failed on $(Split-Path -Leaf $File)" }
}

$appPassword = $env:MYSQL_PWD
if (-not $appPassword) {
  Write-Host 'Set MYSQL_PWD first:  $env:MYSQL_PWD = "..."' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '1/3  creating database + application user ...' -ForegroundColor Cyan
Invoke-Sql -File $setupUser -User 'root' -Password $plain

Write-Host '2/3  creating tables ...' -ForegroundColor Cyan
Invoke-Sql -File $schema -User 'priti' -Password $appPassword -Database 'green_haven'

Write-Host '3/3  loading catalogue ...' -ForegroundColor Cyan
Invoke-Sql -File $data -User 'priti' -Password $appPassword -Database 'green_haven'

Write-Host ''
Write-Host 'Verifying:' -ForegroundColor Green
$check = @'
SELECT 'categories' AS entity, COUNT(*) AS rows_loaded FROM category
UNION ALL SELECT 'badges',  COUNT(*) FROM badge
UNION ALL SELECT 'plants',  COUNT(*) FROM plant
UNION ALL SELECT 'plant_badge', COUNT(*) FROM plant_badge;
'@
$env:MYSQL_PWD = $appPassword
$check | & $mysql '-upriti' '--default-character-set=utf8mb4' 'green_haven'

Write-Host ''
Write-Host 'Done. Start the API with:  mvn spring-boot:run' -ForegroundColor Green
