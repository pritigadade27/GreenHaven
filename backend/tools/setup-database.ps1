# Create the database, tables and catalogue
$ErrorActionPreference = 'Stop'

# Locate the SQL files
$resources = Join-Path $PSScriptRoot '..\db'
$setupUser = Join-Path $resources 'setup-user.sql'
$schema    = Join-Path $resources 'schema.sql'
$data      = Join-Path $resources 'data.sql'

foreach ($f in @($setupUser, $schema, $data)) {
    if (-not (Test-Path $f)) { throw "Missing SQL file: $f" }
}

# Find the mysql client
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

# Pipe a SQL file into mysql
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
# Build the database in four steps, all as root
Write-Host '1/4  creating database + application user ...' -ForegroundColor Cyan
Invoke-Sql -File $setupUser -User 'root' -Password $plain

# As root, not priti: the application account is granted DML only and cannot
# CREATE TABLE, which is the point of granting it no more than it needs.
Write-Host '2/4  creating tables ...' -ForegroundColor Cyan
Invoke-Sql -File $schema -User 'root' -Password $plain -Database 'green_haven'

Write-Host '3/4  loading catalogue ...' -ForegroundColor Cyan
Invoke-Sql -File $data -User 'root' -Password $plain -Database 'green_haven'

# Numeric order matters: each migration builds on the one before it.
Write-Host '4/4  applying migrations ...' -ForegroundColor Cyan
Get-ChildItem (Join-Path $resources 'migration-*.sql') |
    Sort-Object { [int]($_.Name -replace '\D+(\d+).*', '$1') } |
    ForEach-Object {
        Write-Host "      $($_.Name)" -ForegroundColor DarkGray
        Invoke-Sql -File $_.FullName -User 'root' -Password $plain -Database 'green_haven'
    }

Write-Host ''
# Verify row counts
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
