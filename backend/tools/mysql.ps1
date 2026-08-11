<#
  Green Haven — start / stop / inspect the local MySQL server.

      powershell -File backend\tools\mysql.ps1 start
      powershell -File backend\tools\mysql.ps1 stop
      powershell -File backend\tools\mysql.ps1 status
      powershell -File backend\tools\mysql.ps1 shell     # opens a mysql prompt
      powershell -File backend\tools\mysql.ps1 reload    # rebuild schema + reseed

  MySQL was installed from the Oracle zip into C:\Users\vnp12\mysql, which
  needs no administrator rights — but that also means it is NOT a Windows
  service, so it does not start automatically after a reboot. Run `start`
  once per session before using the API.
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'status', 'shell', 'reload')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

# Pass the password via MYSQL_PWD rather than -p on the command line. It keeps
# the password out of the process list AND suppresses the "using a password on
# the command line is insecure" warning, which PowerShell 5.1 would otherwise
# turn into a terminating NativeCommandError.


$Home_    = 'C:\Users\vnp12\mysql'
$Bin      = Join-Path $Home_ 'mysql-8.4.9-winx64\bin'
$Ini      = Join-Path $Home_ 'my.ini'
$Mysqld   = Join-Path $Bin 'mysqld.exe'
$Mysql    = Join-Path $Bin 'mysql.exe'
$Admin    = Join-Path $Bin 'mysqladmin.exe'
$User     = if ($env:MYSQL_USER) { $env:MYSQL_USER } else { 'priti' }
# From the environment, never from this file. A password written into a
# committed script is a published password.
$Password = $env:MYSQL_PWD
if (-not $Password) {
  Write-Host 'Set MYSQL_PWD first:  $env:MYSQL_PWD = "..."' -ForegroundColor Red
  exit 1
}
$Db       = 'green_haven'
# The schema and seed live in backend\db, deliberately OUTSIDE src\main\resources:
# everything under resources is packaged into the deployable JAR, and schema.sql
# opens by dropping all eleven tables. That is not something to ship.
$Res      = Join-Path $PSScriptRoot '..\db'

$env:MYSQL_PWD = $Password

function Test-Up {
    & $Mysql -h 127.0.0.1 -u $User -e 'SELECT 1' | Out-Null
    return ($LASTEXITCODE -eq 0)
}

switch ($Action) {
    'start' {
        if (Test-Up) { Write-Host 'MySQL already running on 127.0.0.1:3306' -ForegroundColor Green; break }
        Start-Process -FilePath $Mysqld -ArgumentList "--defaults-file=`"$Ini`"" -WindowStyle Hidden
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 1
            if (Test-Up) { Write-Host "MySQL started (took ${i}s)" -ForegroundColor Green; break }
        }
        if (-not (Test-Up)) {
            Write-Host 'Failed to start. Last lines of the error log:' -ForegroundColor Red
            Get-Content (Join-Path $Home_ 'mysql-error.log') -Tail 20
        }
    }

    'stop' {
        if (-not (Test-Up)) { Write-Host 'MySQL is not running.' -ForegroundColor Yellow; break }
        & $Admin -h 127.0.0.1 -u root shutdown
        Write-Host 'MySQL stopped.' -ForegroundColor Green
    }

    'status' {
        if (Test-Up) {
            Write-Host 'MySQL is UP on 127.0.0.1:3306' -ForegroundColor Green
            & $Mysql -h 127.0.0.1 -u $User $Db --table -e @'
SELECT 'category' AS entity, COUNT(*) AS n FROM category
UNION ALL SELECT 'badge', COUNT(*) FROM badge
UNION ALL SELECT 'plant', COUNT(*) FROM plant
UNION ALL SELECT 'plant_badge', COUNT(*) FROM plant_badge;
'@
        } else {
            Write-Host 'MySQL is DOWN. Start it with:  mysql.ps1 start' -ForegroundColor Yellow
        }
    }

    'shell' { & $Mysql -h 127.0.0.1 -u $User $Db }

    'reload' {
        if (-not (Test-Up)) { throw 'MySQL is not running. Run: mysql.ps1 start' }
        Write-Host 'Rebuilding schema ...' -ForegroundColor Cyan
        Get-Content -Raw -Encoding UTF8 (Join-Path $Res 'schema.sql') |
            & $Mysql -h 127.0.0.1 -u $User --default-character-set=utf8mb4 $Db
        Write-Host 'Reloading catalogue ...' -ForegroundColor Cyan
        Get-Content -Raw -Encoding UTF8 (Join-Path $Res 'data.sql') |
            & $Mysql -h 127.0.0.1 -u $User --default-character-set=utf8mb4 $Db
        Write-Host 'Done.' -ForegroundColor Green
    }
}
