param(
    [switch]$Restart,
    [switch]$NoHold
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
        $statusCode = & curl.exe -s -o NUL -w "%{http_code}" --max-time 2 $Uri
        if ($LASTEXITCODE -ne 0) {
            return $false
        }
        $status = 0
        return [int]::TryParse($statusCode, [ref]$status) -and $status -ge 200 -and $status -lt 500
    } catch {
        return $false
    }
}

function Test-TcpReady($HostName, $Port, $TimeoutMilliseconds) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $result = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne($TimeoutMilliseconds)) {
            return $false
        }
        $client.EndConnect($result)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
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

function Resolve-MavenCommand() {
    $cachedMaven = Get-ChildItem -Path "$env:USERPROFILE\.m2\wrapper\dists" `
        -Recurse `
        -Filter "mvn.cmd" `
        -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if ($cachedMaven) {
        return $cachedMaven.FullName
    }
    return $null
}

function Get-NewestWriteTime($Path) {
    $items = @(Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue)
    if ($items.Count -eq 0) {
        return [datetime]::MinValue
    }
    return ($items | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
}

function Get-BackendJar($BackendDir) {
    $jars = @(Get-ChildItem -LiteralPath (Join-Path $BackendDir "target") -Filter "*.jar" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike "*.original" } |
        Sort-Object LastWriteTime -Descending)
    if ($jars.Count -eq 0) {
        return $null
    }
    return $jars[0]
}

function Ensure-BackendJar($BackendDir) {
    $jar = Get-BackendJar $BackendDir
    $sourceNewest = Get-NewestWriteTime (Join-Path $BackendDir "src\main")
    $pomPath = Join-Path $BackendDir "pom.xml"
    if (Test-Path -LiteralPath $pomPath) {
        $pomNewest = (Get-Item -LiteralPath $pomPath).LastWriteTime
        if ($pomNewest -gt $sourceNewest) {
            $sourceNewest = $pomNewest
        }
    }
    if ($jar -and $jar.LastWriteTime -ge $sourceNewest) {
        return $jar.FullName
    }

    Write-Host "[build] backend jar"
    $mavenCommand = Resolve-MavenCommand
    if (-not $mavenCommand) {
        $mavenCommand = Join-Path $BackendDir "mvnw.cmd"
    }
    Push-Location $BackendDir
    try {
        $buildOutput = & $mavenCommand "-Dmaven.repo.local=$env:USERPROFILE\.m2\repository" "-DskipTests" "package" 2>&1
        $buildExitCode = $LASTEXITCODE
        $buildOutput | ForEach-Object { Write-Host $_ }
        if ($buildExitCode -ne 0) {
            throw "Backend jar build failed with exit code $buildExitCode."
        }
    } finally {
        Pop-Location
    }

    $jar = Get-BackendJar $BackendDir
    if (-not $jar) {
        throw "Backend jar was not created."
    }
    return $jar.FullName
}

function Resolve-RequiredCommand($CommandName) {
    $command = Get-Command $CommandName -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($command.Source)) {
        throw "Cannot resolve required command: $CommandName"
    }
    return $command.Source
}

function Stop-PortOwner($Port) {
    $owners = @(Get-ListeningProcessIds $Port)
    if ($owners.Count -eq 0) {
        Write-Host "[ok] no process is listening on port $Port"
    }
    foreach ($ownerProcessId in ($owners | Sort-Object -Unique)) {
        if ($ownerProcessId) {
            Stop-ProcessTree $ownerProcessId
            Write-Host "[ok] stopped process $ownerProcessId on port $Port"
        }
    }
    Start-Sleep -Milliseconds 500
    $remainingOwners = @()
    try {
        $remainingOwners = @(Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
            Where-Object { $_.State -eq "Listen" } |
            ForEach-Object { [int]$_.OwningProcess })
    } catch {
        $remainingOwners = @()
    }
    if ($remainingOwners.Count -gt 0) {
        throw "Port $Port is still occupied by process $($remainingOwners -join ', ') after stop attempt."
    }
}

function Get-ListeningProcessIds($Port) {
    $owners = @()
    try {
        $owners += @(Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
            Where-Object { $_.State -eq "Listen" } |
            ForEach-Object { [int]$_.OwningProcess })
    } catch {
        $owners = @()
    }
    return @($owners | Where-Object { $_ -gt 0 } | Sort-Object -Unique)
}

function Stop-ProcessTree($RootProcessId) {
    $allProcesses = @()
    try {
        $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction Stop)
    } catch {
        $allProcesses = @()
    }
    $childIds = @()
    if ($allProcesses.Count -gt 0) {
        $pending = @([int]$RootProcessId)
        while ($pending.Count -gt 0) {
            $currentId = [int]$pending[0]
            $pending = @($pending | Select-Object -Skip 1)
            $children = @($allProcesses | Where-Object { [int]$_.ParentProcessId -eq $currentId })
            foreach ($child in $children) {
                $childId = [int]$child.ProcessId
                $childIds += $childId
                $pending += $childId
            }
        }
    }
    foreach ($processId in (($childIds | Select-Object -Unique) | Sort-Object -Descending)) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $RootProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-RecordedDevProcesses($PidFile) {
    if (-not (Test-Path -LiteralPath $PidFile)) {
        return
    }
    Get-Content -LiteralPath $PidFile | ForEach-Object {
        $processId = 0
        if ([int]::TryParse($_, [ref]$processId) -and $processId -gt 0) {
            if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                Stop-ProcessTree $processId
                Write-Host "[ok] stopped recorded dev process $processId"
            }
        }
    }
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

function Stop-ProjectDevProcesses($BackendDir, $FrontendDir) {
    $backendPath = [string]$BackendDir
    $frontendPath = [string]$FrontendDir
    try {
        $processes = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
            $commandLine = $_.CommandLine
            if ([string]::IsNullOrWhiteSpace($commandLine)) {
                $false
            } else {
                $isBackend = (
                    $commandLine.Contains("com.ezone.backend.EzOneBackendApplication") -or
                    ($commandLine.Contains($backendPath) -and (
                        $commandLine.Contains("spring-boot:run") -or $commandLine.Contains("mvnw.cmd")
                    ))
                )
                $isFrontend = $commandLine.Contains($frontendPath) -and (
                    $commandLine.Contains("vite") -or $commandLine.Contains("npm")
                )
                $isBackend -or $isFrontend
            }
        }
    } catch {
        Write-Host "[warn] cannot inspect command lines for restart fallback; continuing with port-based restart: $($_.Exception.Message)"
        return
    }
    foreach ($process in $processes) {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "[ok] stopped project dev process $($process.ProcessId)"
    }
}

function Save-StartedProcessIds($PidFile, $ProcessIds) {
    if ($ProcessIds.Count -eq 0) {
        return
    }
    $pidDirectory = Split-Path -Parent $PidFile
    if (-not (Test-Path -LiteralPath $pidDirectory)) {
        New-Item -ItemType Directory -Path $pidDirectory | Out-Null
    }
    Set-Content -LiteralPath $PidFile -Value $ProcessIds
}

function Get-DevServerProcessIds() {
    $deadline = (Get-Date).AddSeconds(5)
    do {
        $rawProcessIds = @()
        $rawProcessIds += @(Get-ListeningProcessIds 8080)
        $rawProcessIds += @(Get-ListeningProcessIds 5173)
        $processIds = @($rawProcessIds | Where-Object { $_ -gt 0 } | Sort-Object -Unique)
        if ($processIds.Count -ge 2) {
            return $processIds
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    return $processIds
}

function Quote-CmdArgument($Value) {
    return '"' + ([string]$Value).Replace('"', '""') + '"'
}

function Start-LoggedProcess($FilePath, $ArgumentList, $WorkingDirectory, $StandardOutputPath, $StandardErrorPath) {
    $argumentText = (($ArgumentList | ForEach-Object { Quote-CmdArgument $_ }) -join " ")
    $command = @(
        "Set-Location -LiteralPath $(Quote-CmdArgument $WorkingDirectory)",
        "& $(Quote-CmdArgument $FilePath) $argumentText 1> $(Quote-CmdArgument $StandardOutputPath) 2> $(Quote-CmdArgument $StandardErrorPath)"
    ) -join "; "
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))

    return Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encodedCommand) `
        -WindowStyle Hidden `
        -PassThru
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$pidFile = Join-Path $root ".codex-run-logs\local-dev-pids.txt"
$backendEnv = Read-DotEnv (Join-Path $backendDir ".env")
$frontendEnv = Read-DotEnv (Join-Path $frontendDir ".env")
$startedProcessIds = @()

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
if (-not (Test-TcpReady $dbHost $dbPort 1500)) {
    throw "MySQL is not reachable at ${dbHost}:${dbPort}. Start MySQL first."
}
Write-Host "[ok] MySQL reachable at ${dbHost}:${dbPort}"

$apiBase = $frontendEnv["VITE_API_BASE_URL"].TrimEnd("/")
$backendHealth = $apiBase -replace "/api$", "/api/health"
$frontendUrl = "http://localhost:5173"

if ($Restart) {
    Write-Host "[restart] stopping local dev ports"
    Stop-RecordedDevProcesses $pidFile
    Stop-PortOwner 8080
    Stop-PortOwner 5173
    Stop-ProjectDevProcesses $backendDir $frontendDir
    Start-Sleep -Seconds 1
}

if (Test-HttpReady $backendHealth) {
    Write-Host "[ok] backend already running"
} else {
    Write-Host "[start] backend"
    $backendJar = Ensure-BackendJar $backendDir
    $javaCommand = Resolve-RequiredCommand "java.exe"
    $backendProcess = Start-LoggedProcess `
        $javaCommand `
        @("-jar", $backendJar, "--spring.profiles.active=mysql") `
        $backendDir `
        (Join-Path $backendDir "backend-server.log") `
        (Join-Path $backendDir "backend-server.err.log")
    $startedProcessIds += $backendProcess.Id
}
Wait-HttpReady "Backend" $backendHealth 90

if (Test-HttpReady $frontendUrl) {
    Write-Host "[ok] frontend already running"
} else {
    Write-Host "[start] frontend"
    $nodeCommand = Resolve-RequiredCommand "node.exe"
    $viteEntry = Join-Path $frontendDir "node_modules\vite\bin\vite.js"
    if (-not (Test-Path -LiteralPath $viteEntry)) {
        throw "Vite entry was not found. Run npm install in frontend first."
    }
    $frontendProcess = Start-LoggedProcess `
        $nodeCommand `
        @($viteEntry, "--host", "localhost", "--port", "5173") `
        $frontendDir `
        (Join-Path $frontendDir "frontend-server.log") `
        (Join-Path $frontendDir "frontend-server.err.log")
    $startedProcessIds += $frontendProcess.Id
}
Wait-HttpReady "Frontend" $frontendUrl 60

Write-Host "[ok] EZ-ONE local dev stack is ready: $frontendUrl"

if ($startedProcessIds.Count -gt 0 -and -not $NoHold) {
    $portOwnerProcessIds = @(Get-DevServerProcessIds)
    if ($portOwnerProcessIds.Count -gt 0) {
        Save-StartedProcessIds $pidFile @($portOwnerProcessIds | Sort-Object -Unique)
    } else {
        Save-StartedProcessIds $pidFile $startedProcessIds
    }
    Write-Host "[hold] Dev servers started by this command are running. Press Ctrl+C to stop watching this terminal."
    Wait-Process -Id $startedProcessIds
} elseif ($startedProcessIds.Count -gt 0) {
    $portOwnerProcessIds = @(Get-DevServerProcessIds)
    if ($portOwnerProcessIds.Count -gt 0) {
        Save-StartedProcessIds $pidFile @($portOwnerProcessIds | Sort-Object -Unique)
    } else {
        Save-StartedProcessIds $pidFile $startedProcessIds
    }
    Write-Host "[ok] Dev servers are running in the background: $($startedProcessIds -join ', ')"
}
