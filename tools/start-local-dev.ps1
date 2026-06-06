param(
    [switch]$Restart
)

$ErrorActionPreference = "Stop"

function Read-DotEnv($Path) {
    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $values
    }
    Get-Content -LiteralPath $Path | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -notmatch '^\s*([^=]+)=(.*)$') {
            return
        }
        $values[$matches[1].Trim()] = $matches[2].Trim()
    }
    return $values
}

function Require-Key($Values, $Key, $Source) {
    if (-not $Values.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
        throw "$Source is missing required key: $Key"
    }
}

function Test-HttpReady($Uri) {
    try {
        $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Wait-HttpReady($Name, $Uri, $TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpReady $Uri) {
            Write-Host "[ok] $Name ready at $Uri"
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "$Name did not become ready at $Uri within ${TimeoutSeconds}s."
}

function Stop-PortOwner($Port) {
    $owners = @()
    try {
        $owners += Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess
    } catch {
        $owners = @()
    }
    if ($owners.Count -eq 0) {
        $pattern = "LISTENING\s+(\d+)$"
        $owners += netstat -ano -p tcp | ForEach-Object {
            if ($_ -match "[:.]$Port\s+.*$pattern") {
                [int]$matches[1]
            }
        }
    }
    foreach ($ownerProcessId in ($owners | Sort-Object -Unique)) {
        if ($ownerProcessId) {
            Stop-Process -Id $ownerProcessId -Force -ErrorAction SilentlyContinue
            Write-Host "[ok] stopped process $ownerProcessId on port $Port"
        }
    }
}

function Stop-ProjectDevProcesses($BackendDir, $FrontendDir) {
    $backendPath = [string]$BackendDir
    $frontendPath = [string]$FrontendDir
    try {
        $processes = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
            $commandLine = $_.CommandLine
            if ([string]::IsNullOrWhiteSpace($commandLine)) {
                return $false
            }
            $isBackend = $commandLine.Contains($backendPath) -and (
                $commandLine.Contains("spring-boot:run") -or $commandLine.Contains("mvnw.cmd")
            )
            $isFrontend = $commandLine.Contains($frontendPath) -and (
                $commandLine.Contains("vite") -or $commandLine.Contains("npm")
            )
            return $isBackend -or $isFrontend
        }
    } catch {
        Write-Host "[warn] cannot inspect command lines for restart fallback; continuing with port-based restart"
        return
    }
    foreach ($process in $processes) {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "[ok] stopped project dev process $($process.ProcessId)"
    }
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$backendEnv = Read-DotEnv (Join-Path $backendDir ".env")
$frontendEnv = Read-DotEnv (Join-Path $frontendDir ".env")

Require-Key $backendEnv "DB_HOST" "backend/.env"
Require-Key $backendEnv "DB_PORT" "backend/.env"
Require-Key $backendEnv "DB_NAME" "backend/.env"
Require-Key $backendEnv "DB_USER" "backend/.env"
Require-Key $backendEnv "DB_PASSWORD" "backend/.env"
Require-Key $backendEnv "GOOGLE_CLIENT_ID" "backend/.env"
Require-Key $backendEnv "GOOGLE_CLIENT_SECRET" "backend/.env"
Require-Key $frontendEnv "VITE_API_BASE_URL" "frontend/.env"
Require-Key $frontendEnv "VITE_GOOGLE_CLIENT_ID" "frontend/.env"
Require-Key $frontendEnv "VITE_GOOGLE_REDIRECT_URI" "frontend/.env"

$dbHost = $backendEnv["DB_HOST"]
$dbPort = [int]$backendEnv["DB_PORT"]
$dbCheck = Test-NetConnection $dbHost -Port $dbPort -WarningAction SilentlyContinue
if (-not $dbCheck.TcpTestSucceeded) {
    throw "MySQL is not reachable at ${dbHost}:${dbPort}. Start MySQL first."
}
Write-Host "[ok] MySQL reachable at ${dbHost}:${dbPort}"

$apiBase = $frontendEnv["VITE_API_BASE_URL"].TrimEnd("/")
$backendHealth = $apiBase -replace "/api$", "/api/health"
$frontendUrl = "http://localhost:5173"

if ($Restart) {
    Write-Host "[restart] stopping local dev ports"
    Stop-PortOwner 8080
    Stop-PortOwner 5173
    Stop-ProjectDevProcesses $backendDir $frontendDir
    Start-Sleep -Seconds 1
}

if (Test-HttpReady $backendHealth) {
    Write-Host "[ok] backend already running"
} else {
    Write-Host "[start] backend"
    Start-Process `
        -FilePath (Join-Path $backendDir "mvnw.cmd") `
        -ArgumentList "spring-boot:run" `
        -WorkingDirectory $backendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $backendDir "backend-server.log") `
        -RedirectStandardError (Join-Path $backendDir "backend-server.err.log") | Out-Null
}
Wait-HttpReady "Backend" $backendHealth 90

if (Test-HttpReady $frontendUrl) {
    Write-Host "[ok] frontend already running"
} else {
    Write-Host "[start] frontend"
    Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList "run", "dev:vite", "--", "--host", "localhost", "--port", "5173" `
        -WorkingDirectory $frontendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $frontendDir "frontend-server.log") `
        -RedirectStandardError (Join-Path $frontendDir "frontend-server.err.log") | Out-Null
}
Wait-HttpReady "Frontend" $frontendUrl 60

Write-Host "[ok] EZ-ONE local dev stack is ready: $frontendUrl"
