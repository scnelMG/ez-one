param(
    [switch]$CheckFlyway
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
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $values[$key] = $value
    }
    return $values
}

function Require-Key($Values, $Key, $Source) {
    if (-not $Values.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
        throw "$Source is missing required key: $Key"
    }
}

function Test-Http($Name, $Uri) {
    try {
        $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 8
        Write-Host "[ok] $Name $($response.StatusCode) $Uri"
    } catch {
        throw "$Name is not reachable at $Uri. Start the matching dev server and retry."
    }
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendEnvPath = Join-Path $root "backend\.env"
$frontendEnvPath = Join-Path $root "frontend\.env"
$backend = Read-DotEnv $backendEnvPath
$frontend = Read-DotEnv $frontendEnvPath

Require-Key $backend "DB_HOST" "backend/.env"
Require-Key $backend "DB_PORT" "backend/.env"
Require-Key $backend "DB_NAME" "backend/.env"
Require-Key $backend "DB_USER" "backend/.env"
Require-Key $backend "DB_PASSWORD" "backend/.env"
Require-Key $backend "GOOGLE_CLIENT_ID" "backend/.env"
Require-Key $backend "GOOGLE_CLIENT_SECRET" "backend/.env"
Require-Key $backend "JWT_ACCESS_SECRET" "backend/.env"
Require-Key $backend "JWT_REFRESH_SECRET" "backend/.env"
Require-Key $frontend "VITE_API_BASE_URL" "frontend/.env"
Require-Key $frontend "VITE_GOOGLE_CLIENT_ID" "frontend/.env"
Require-Key $frontend "VITE_GOOGLE_REDIRECT_URI" "frontend/.env"

$dbPort = [int]$backend["DB_PORT"]
$dbHost = $backend["DB_HOST"]
$dbCheck = Test-NetConnection $dbHost -Port $dbPort -WarningAction SilentlyContinue
if (-not $dbCheck.TcpTestSucceeded) {
    throw "MySQL is not reachable at ${dbHost}:${dbPort}."
}
Write-Host "[ok] MySQL reachable at ${dbHost}:${dbPort}"

$apiBase = $frontend["VITE_API_BASE_URL"].TrimEnd("/")
$backendHealth = $apiBase -replace "/api$", "/api/health"
Test-Http "Backend health" $backendHealth
Test-Http "Frontend dev server" "http://localhost:5173"

if ($CheckFlyway) {
    Push-Location (Join-Path $root "backend")
    try {
        $env:FLYWAY_URL = "jdbc:mysql://$($backend["DB_HOST"]):$($backend["DB_PORT"])/$($backend["DB_NAME"])"
        $env:FLYWAY_USER = $backend["DB_USER"]
        $env:FLYWAY_PASSWORD = $backend["DB_PASSWORD"]
        $env:FLYWAY_LOCATIONS = "filesystem:src/main/resources/db/migration"
        & .\mvnw.cmd org.flywaydb:flyway-maven-plugin:11.7.2:info
        if ($LASTEXITCODE -ne 0) {
            throw "Flyway info failed."
        }
    } finally {
        Pop-Location
    }
}

Write-Host "[ok] Local login stack is ready."
