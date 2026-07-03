param(
    [Parameter(Mandatory = $true)]
    [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path ".").Path
$evidenceRoot = Join-Path $repoRoot ".omo\evidence"
$receiptPath = Join-Path $repoRoot $EvidencePath
$receiptDir = Split-Path -Parent $receiptPath
$protectedReportPath = Join-Path $receiptDir "protected-paths.txt"

New-Item -ItemType Directory -Force -Path $receiptDir | Out-Null

function Convert-ToRepoRelativePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
    $rootPrefix = $repoRoot.TrimEnd("\") + "\"
    if (-not $resolvedPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside repo root: $resolvedPath"
    }

    $relativePath = $resolvedPath.Substring($rootPrefix.Length)
    return $relativePath -replace "\\", "/"
}

function Convert-AbsoluteToRepoRelativePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $rootPrefix = $repoRoot.TrimEnd("\") + "\"
    if (-not $Path.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside repo root: $Path"
    }

    return $Path.Substring($rootPrefix.Length) -replace "\\", "/"
}

function Test-GitIgnored {
    param([Parameter(Mandatory = $true)][string]$RepoRelativePath)

    & git check-ignore -q -- $RepoRelativePath
    return $LASTEXITCODE -eq 0
}

function Test-ActiveEvidencePath {
    param([Parameter(Mandatory = $true)][string]$RepoRelativePath)

    return $RepoRelativePath -like ".omo/evidence/task-*-production-extension-service-polish*"
}

function Test-SafeDeleteCandidate {
    param(
        [Parameter(Mandatory = $true)][System.IO.FileSystemInfo]$Item,
        [Parameter(Mandatory = $true)][string]$RepoRelativePath
    )

    if (Test-ActiveEvidencePath -RepoRelativePath $RepoRelativePath) {
        return $false
    }

    if ($Item.PSIsContainer) {
        return (
            $RepoRelativePath -like ".omo/evidence/task-*-chrome-web-store-publication-follow-up" -or
            $RepoRelativePath -eq ".omo/evidence/final-regression-p1-local-hardening-env-urls-cors" -or
            $RepoRelativePath -eq ".omo/evidence/final-post-ipv6-regression-retry-p1-local-hardening-env-urls-cors"
        )
    }

    $name = $Item.Name
    $hasSafeStandalonePrefix = (
        $name -like "f*" -or
        $name -like "final*" -or
        $name -like "global*" -or
        $name -like "p1*" -or
        $name -like "task-*"
    )

    return $hasSafeStandalonePrefix -and (Test-GitIgnored -RepoRelativePath $RepoRelativePath)
}

$protectedPaths = @(
    ".omo/drafts",
    ".omo/plans",
    ".omo/boulder.json",
    ".omo/start-work/ledger.jsonl",
    ".omo/evidence/task-7-production-extension-service-polish"
)

$missingProtectedPaths = @()
foreach ($protectedPath in $protectedPaths) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $protectedPath))) {
        $missingProtectedPaths += $protectedPath
    }
}

if ($missingProtectedPaths.Count -gt 0) {
    throw "Protected path missing: $($missingProtectedPaths -join ', ')"
}

$inventory = @()
if (Test-Path -LiteralPath $evidenceRoot) {
    foreach ($item in Get-ChildItem -Force -LiteralPath $evidenceRoot) {
        $relativePath = Convert-ToRepoRelativePath -Path $item.FullName
        $ignored = Test-GitIgnored -RepoRelativePath $relativePath
        $active = Test-ActiveEvidencePath -RepoRelativePath $relativePath
        $safeCandidate = Test-SafeDeleteCandidate -Item $item -RepoRelativePath $relativePath

        $reason = if ($safeCandidate) {
            "safe-delete-candidate"
        } elseif ($active) {
            "do-not-delete:active-production-extension-service-polish-evidence"
        } elseif (-not $ignored) {
            "do-not-delete:non-ignored"
        } else {
            "do-not-delete:outside-safe-prefix-list"
        }

        $inventory += [pscustomobject]@{
            Path = $relativePath
            Kind = if ($item.PSIsContainer) { "directory" } else { "file" }
            GitIgnored = $ignored
            Classification = $reason
            Exists = Test-Path -LiteralPath $item.FullName
        }
    }
}

$protectedReport = @(
    "Protected path assertion",
    "Timestamp: $((Get-Date).ToString('o'))",
    "Repo: $repoRoot",
    ""
)
foreach ($protectedPath in $protectedPaths) {
    $absolutePath = Join-Path $repoRoot $protectedPath
    $protectedReport += "do-not-delete`t$protectedPath`tExists=$((Test-Path -LiteralPath $absolutePath))"
}
$protectedReport += ""
$protectedReport += "Evidence inventory"
$protectedReport += ($inventory | Sort-Object Path | ForEach-Object {
    "$($_.Classification)`t$($_.Kind)`tGitIgnored=$($_.GitIgnored)`tExists=$($_.Exists)`t$($_.Path)"
})

Set-Content -Path $protectedReportPath -Value $protectedReport -Encoding UTF8

$receipt = @(
    "",
    "Cleanup protected-path assertion",
    "Timestamp: $((Get-Date).ToString('o'))",
    "Repo: $repoRoot",
    "EvidenceRoot: .omo/evidence",
    "ProtectedPathReport: $(Convert-AbsoluteToRepoRelativePath -Path $protectedReportPath)",
    "SafeDeleteCandidateCount: $(($inventory | Where-Object { $_.Classification -eq 'safe-delete-candidate' }).Count)",
    "DoNotDeleteCount: $(($inventory | Where-Object { $_.Classification -like 'do-not-delete:*' }).Count)",
    "ProtectedPathsPresent: true"
)

Add-Content -Path $receiptPath -Value $receipt -Encoding UTF8
