# Runs the API with backend\.env loaded. Maven does not read that file itself,
# so starting Maven directly fails on the missing JWT secret.
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$envFile = Join-Path $backend '.env'

if (-not (Test-Path $envFile)) {
    Write-Host "  backend\.env is missing - run SETUP.bat once first." -ForegroundColor Red
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $k, $v = $line.Split('=', 2)
        Set-Item -Path "Env:\$($k.Trim())" -Value $v.Trim()
    }
}
Write-Host "  settings loaded from backend\.env" -ForegroundColor Green

# Full paths, and cd inside the cmd line itself: Set-Location moves PowerShell's
# location but not the working directory a child process inherits.
Set-Location $backend
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    cmd /c "cd /d `"$backend`" && mvn spring-boot:run"
} else {
    cmd /c "cd /d `"$backend`" && `"$backend\mvnw.cmd`" spring-boot:run"
}
