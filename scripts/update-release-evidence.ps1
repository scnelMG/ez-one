[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceFile,

  [string]$ArtifactDirectory = "",

  [string]$DeployDryRunLog = "",

  [string]$DeployApplyLog = "",

  [string]$RollbackDryRunLog = "",

  [string]$RollbackApplyLog = "",

  [string]$CanaryLog = "",

  [switch]$RequireNotionSync
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

function Assert-FileExists {
  param(
    [string]$Path,
    [string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    if ($Name -eq "EvidenceFile") {
      throw @"
Release evidence file was not found: $Path
Run the full local Gate 0 first, then create release evidence with:
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog `$gateLog
"@
    }
    throw "$Name does not exist: $Path"
  }
}

function Assert-ContainsMarker {
  param(
    [string]$Text,
    [string]$Marker,
    [string]$SourceName
  )

  if (-not $Text.Contains($Marker)) {
    throw "$SourceName is missing required marker: $Marker"
  }
}

function Assert-MarkerCountAtLeast {
  param(
    [string]$Text,
    [string]$Marker,
    [int]$MinimumCount,
    [string]$SourceName
  )

  $actualCount = [regex]::Matches($Text, [regex]::Escape($Marker)).Count
  if ($actualCount -lt $MinimumCount) {
    throw "$SourceName marker count is too low: $Marker expected at least $MinimumCount, found $actualCount"
  }
}

function Get-TextBetweenMarkers {
  param(
    [string]$Text,
    [string]$StartMarker,
    [string]$EndMarker
  )

  $startIndex = $Text.IndexOf($StartMarker)
  if ($startIndex -lt 0) {
    throw "CanaryLog is missing required marker: $StartMarker"
  }

  $contentStartIndex = $startIndex + $StartMarker.Length
  if ([string]::IsNullOrWhiteSpace($EndMarker)) {
    return $Text.Substring($contentStartIndex)
  }

  $endIndex = $Text.IndexOf($EndMarker, $contentStartIndex)
  if ($endIndex -lt 0) {
    throw "CanaryLog is missing required marker: $EndMarker"
  }

  return $Text.Substring($contentStartIndex, $endIndex - $contentStartIndex)
}

function Assert-NoFailureMarkers {
  param(
    [string]$Text,
    [string]$SourceName
  )

  $failurePatterns = @(
    '(?m)^\[FAIL\]',
    'NativeCommandError',
    'FullyQualifiedErrorId',
    '(?i)\bexception\b',
    '(?i)\bstacktrace\b'
  )

  foreach ($pattern in $failurePatterns) {
    if ($Text -match $pattern) {
      throw "$SourceName contains failure marker: $pattern"
    }
  }
}

function Get-ManifestValue {
  param(
    [string[]]$Lines,
    [string]$Name
  )

  $prefix = "$Name="
  $line = $Lines | Where-Object { $_.StartsWith($prefix) } | Select-Object -First 1
  if ([string]::IsNullOrWhiteSpace($line)) {
    throw "RELEASE-MANIFEST.txt is missing required field: $Name"
  }
  return $line.Substring($prefix.Length)
}

function Get-ChecksumLine {
  param(
    [string[]]$Lines,
    [string]$FileName
  )

  $escapedFileName = [regex]::Escape($FileName)
  $line = $Lines | Where-Object { $_ -match "^[A-Fa-f0-9]{64}\s+$escapedFileName$" } | Select-Object -First 1
  if ([string]::IsNullOrWhiteSpace($line)) {
    throw "SHA256SUMS.txt is missing required artifact checksum: $FileName"
  }
  return $line
}

function Import-ArtifactEvidence {
  param(
    [object]$Evidence,
    [string]$Directory
  )

  $resolvedArtifactDirectory = Resolve-Path -LiteralPath $Directory
  $manifestPath = Join-Path $resolvedArtifactDirectory "RELEASE-MANIFEST.txt"
  $checksumPath = Join-Path $resolvedArtifactDirectory "SHA256SUMS.txt"

  Assert-FileExists -Path $manifestPath -Name "RELEASE-MANIFEST.txt"
  Assert-FileExists -Path $checksumPath -Name "SHA256SUMS.txt"

  $manifestLines = @(Get-Content -LiteralPath $manifestPath)
  $checksumLines = @(Get-Content -LiteralPath $checksumPath)
  $releaseId = Get-ManifestValue -Lines $manifestLines -Name "release_id"
  if ($releaseId -ne $Evidence.releaseId) {
    throw "RELEASE-MANIFEST.txt release_id does not match release evidence releaseId: manifest=$releaseId evidence=$($Evidence.releaseId)"
  }

  $gitWorktree = Get-ManifestValue -Lines $manifestLines -Name "git_worktree"
  if ($gitWorktree -ne "clean") {
    throw "RELEASE-MANIFEST.txt git_worktree must be clean for final release evidence."
  }

  $backendFileName = Get-ManifestValue -Lines $manifestLines -Name "backend_jar"
  $frontendFileName = Get-ManifestValue -Lines $manifestLines -Name "frontend_zip"
  $extensionFileName = Get-ManifestValue -Lines $manifestLines -Name "extension_zip"

  foreach ($fileName in @($backendFileName, $frontendFileName, $extensionFileName)) {
    Assert-FileExists -Path (Join-Path $resolvedArtifactDirectory $fileName) -Name "Artifact file"
  }

  $backendChecksum = Get-ChecksumLine -Lines $checksumLines -FileName $backendFileName
  $frontendChecksum = Get-ChecksumLine -Lines $checksumLines -FileName $frontendFileName
  $extensionChecksum = Get-ChecksumLine -Lines $checksumLines -FileName $extensionFileName
  $manifestChecksum = Get-ChecksumLine -Lines $checksumLines -FileName "RELEASE-MANIFEST.txt"

  $Evidence.gates.artifactBuildInstall.releaseArtifactDirectory = "Release artifacts directory: $($resolvedArtifactDirectory.Path)"
  $Evidence.gates.artifactBuildInstall.releaseManifestContent = "RELEASE-MANIFEST.txt at $manifestPath; release_id=$releaseId; backend_jar=$backendFileName; frontend_zip=$frontendFileName; extension_zip=$extensionFileName"
  $Evidence.gates.artifactBuildInstall.sha256SumsContent = "SHA256SUMS.txt at $checksumPath; includes $manifestChecksum"
  $Evidence.gates.artifactBuildInstall.backendJarChecksum = $backendChecksum
  $Evidence.gates.artifactBuildInstall.frontendZipChecksum = $frontendChecksum
  $Evidence.gates.artifactBuildInstall.extensionZipChecksum = $extensionChecksum

  Write-Host "[PASS] Artifact evidence imported from: $($resolvedArtifactDirectory.Path)"
}

function Import-DeployLogEvidence {
  param(
    [object]$Evidence,
    [string]$LogFile,
    [string]$Mode
  )

  $sourceName = "DeployDryRunLog"
  if ($Mode -eq "apply") {
    $sourceName = "DeployApplyLog"
  }

  $resolvedDeployLog = Resolve-Path -LiteralPath $LogFile
  $deployText = Get-Content -Raw -LiteralPath $resolvedDeployLog
  $commonMarkers = @(
    "[PASS] SHA256SUMS verified",
    "[PASS] backend artifact jar verified",
    "[PASS] frontend artifact zip verified",
    "[PASS] extension artifact zip verified",
    "[PASS] RELEASE-MANIFEST verified",
    "[PASS] deploy script completed"
  )

  foreach ($marker in $commonMarkers) {
    Assert-ContainsMarker -Text $deployText -Marker $marker -SourceName $sourceName
  }

  if ($Mode -eq "dry-run") {
    foreach ($marker in @(
        "[INFO] Dry run only. Re-run with DRY_RUN=false after confirming paths.",
        "[RUN] curl --fail --silent --show-error --max-time 20",
        "[RUN] BASE_URL="
      )) {
      Assert-ContainsMarker -Text $deployText -Marker $marker -SourceName $sourceName
    }

    Assert-NoFailureMarkers -Text $deployText -SourceName $sourceName
    $Evidence.gates.artifactBuildInstall.ec2DeployDryRunOutput = "deploy dry-run passed; log: $($resolvedDeployLog.Path)"
    Write-Host "[PASS] Deploy dry-run evidence imported from: $($resolvedDeployLog.Path)"
    return
  }

  foreach ($marker in @(
      "[PASS] backend deploy target checked",
      "[PASS] frontend deploy target checked",
      "[PASS] post-deploy health check passed",
      "[PASS] post-deploy EC2 runtime check passed"
    )) {
    Assert-ContainsMarker -Text $deployText -Marker $marker -SourceName $sourceName
  }

  Assert-NoFailureMarkers -Text $deployText -SourceName $sourceName
  $Evidence.gates.artifactBuildInstall.ec2DeployApplyOutput = "deploy apply passed; post-deploy health and runtime checks passed; log: $($resolvedDeployLog.Path)"
  Write-Host "[PASS] Deploy apply evidence imported from: $($resolvedDeployLog.Path)"
}

function Import-RollbackLogEvidence {
  param(
    [object]$Evidence,
    [string]$LogFile,
    [string]$Mode
  )

  $sourceName = "RollbackDryRunLog"
  if ($Mode -eq "apply") {
    $sourceName = "RollbackApplyLog"
  }

  $resolvedRollbackLog = Resolve-Path -LiteralPath $LogFile
  $rollbackText = Get-Content -Raw -LiteralPath $resolvedRollbackLog
  $commonMarkers = @(
    "[PASS] SHA256SUMS verified",
    "[PASS] backend artifact jar verified",
    "[PASS] frontend artifact zip verified",
    "[PASS] extension artifact zip verified",
    "[PASS] RELEASE-MANIFEST verified",
    "[PASS] rollback script completed"
  )

  foreach ($marker in $commonMarkers) {
    Assert-ContainsMarker -Text $rollbackText -Marker $marker -SourceName $sourceName
  }

  if ($Mode -eq "dry-run") {
    foreach ($marker in @(
        "[INFO] Dry run only. Re-run with DRY_RUN=false after confirming paths.",
        "[RUN] curl --fail --silent --show-error --max-time 20",
        "[RUN] BASE_URL="
      )) {
      Assert-ContainsMarker -Text $rollbackText -Marker $marker -SourceName $sourceName
    }

    Assert-NoFailureMarkers -Text $rollbackText -SourceName $sourceName
    $Evidence.gates.rollback.rollbackDryRunOutput = "rollback dry-run passed; log: $($resolvedRollbackLog.Path)"
    Write-Host "[PASS] Rollback dry-run evidence imported from: $($resolvedRollbackLog.Path)"
    return
  }

  foreach ($marker in @(
      "[PASS] backend rollback target checked",
      "[PASS] frontend rollback target checked",
      "[PASS] extension rollback artifact checked",
      "[PASS] post-rollback health check passed",
      "[PASS] post-rollback EC2 runtime check passed"
    )) {
    Assert-ContainsMarker -Text $rollbackText -Marker $marker -SourceName $sourceName
  }

  Assert-NoFailureMarkers -Text $rollbackText -SourceName $sourceName
  $Evidence.gates.rollback.rollbackCommandOutput = "rollback apply passed; log: $($resolvedRollbackLog.Path)"
  $Evidence.gates.rollback.postRollbackHealthCanaryOutput = "post-rollback health and runtime checks passed; log: $($resolvedRollbackLog.Path)"
  Write-Host "[PASS] Rollback apply evidence imported from: $($resolvedRollbackLog.Path)"
}

function Assert-CanaryElapsedSeconds {
  param([string]$Text)

  $match = [regex]::Match($Text, '\[INFO\] Canary elapsedSeconds=(\d+) startedAtUtc=([^\s]+) endedAtUtc=([^\s]+)')
  if (-not $match.Success) {
    throw "CanaryLog is missing elapsedSeconds evidence."
  }

  $elapsedSeconds = [int]$match.Groups[1].Value
  if ($elapsedSeconds -lt 1800) {
    throw "CanaryLog elapsedSeconds is too low: expected at least 1800, found $elapsedSeconds"
  }

  $startedAtUtc = [DateTimeOffset]::MinValue
  $endedAtUtc = [DateTimeOffset]::MinValue
  $dateStyles = [System.Globalization.DateTimeStyles]::AssumeUniversal
  if (-not [DateTimeOffset]::TryParse($match.Groups[2].Value, [System.Globalization.CultureInfo]::InvariantCulture, $dateStyles, [ref]$startedAtUtc)) {
    throw "CanaryLog startedAtUtc is not a valid timestamp."
  }
  if (-not [DateTimeOffset]::TryParse($match.Groups[3].Value, [System.Globalization.CultureInfo]::InvariantCulture, $dateStyles, [ref]$endedAtUtc)) {
    throw "CanaryLog endedAtUtc is not a valid timestamp."
  }

  $timestampDeltaSeconds = [int][Math]::Floor(($endedAtUtc - $startedAtUtc).TotalSeconds)
  if ($timestampDeltaSeconds -lt 1800) {
    throw "CanaryLog timestamp delta is too low: expected at least 1800, found $timestampDeltaSeconds"
  }
  if ([Math]::Abs($elapsedSeconds - $timestampDeltaSeconds) -gt 1) {
    throw "CanaryLog elapsedSeconds does not match timestamp delta: elapsedSeconds=$elapsedSeconds timestampDeltaSeconds=$timestampDeltaSeconds"
  }
}

function Import-CanaryLogEvidence {
  param(
    [object]$Evidence,
    [string]$LogFile,
    [bool]$RequireNotionSyncEvidence = $false
  )

  $resolvedCanaryLog = Resolve-Path -LiteralPath $LogFile
  $canaryText = Get-Content -Raw -LiteralPath $resolvedCanaryLog
  $requiredMarkers = @(
    "[INFO] Canary schedule: iterations=7 intervalSeconds=300 expectedDurationSeconds=1800",
    "[CANARY] Iteration 1 / 7",
    "[CANARY] Iteration 2 / 7",
    "[CANARY] Iteration 3 / 7",
    "[CANARY] Iteration 4 / 7",
    "[CANARY] Iteration 5 / 7",
    "[CANARY] Iteration 6 / 7",
    "[CANARY] Iteration 7 / 7",
    "[PASS] frontend shell",
    "[PASS] frontend login route",
    "[PASS] backend health",
    "[PASS] current user",
    "[PASS] onboarding profile",
    "[PASS] document profile",
    "[PASS] extension document profile",
    "[PASS] basket list",
    "[PASS] notion connection",
    "[PASS] workspace read",
    "[PASS] workspace defaults",
    "[PASS] workspace versions",
    "[PASS] workspace references",
    "[DONE] Release canary completed."
  )

  foreach ($marker in $requiredMarkers) {
    Assert-ContainsMarker -Text $canaryText -Marker $marker -SourceName "CanaryLog"
  }

  $repeatedPassMarkers = @(
    "[PASS] frontend shell",
    "[PASS] frontend login route",
    "[PASS] backend health",
    "[PASS] current user",
    "[PASS] onboarding profile",
    "[PASS] document profile",
    "[PASS] extension document profile",
    "[PASS] basket list",
    "[PASS] notion connection",
    "[PASS] workspace read",
    "[PASS] workspace defaults",
    "[PASS] workspace versions",
    "[PASS] workspace references"
  )
  if ($RequireNotionSyncEvidence) {
    $repeatedPassMarkers += "[PASS] notion sync-now"
  }

  foreach ($marker in $repeatedPassMarkers) {
    Assert-MarkerCountAtLeast -Text $canaryText -Marker $marker -MinimumCount 7 -SourceName "CanaryLog"
  }

  for ($iteration = 1; $iteration -le 7; $iteration += 1) {
    $startMarker = "[CANARY] Iteration $iteration / 7"
    $endMarker = ""
    if ($iteration -lt 7) {
      $nextIteration = $iteration + 1
      $endMarker = "[CANARY] Iteration $nextIteration / 7"
    } else {
      $endMarker = "[DONE] Release canary completed."
    }
    $iterationText = Get-TextBetweenMarkers -Text $canaryText -StartMarker $startMarker -EndMarker $endMarker
    foreach ($marker in $repeatedPassMarkers) {
      if (-not $iterationText.Contains($marker)) {
        throw "CanaryLog iteration $iteration is missing required marker: $marker"
      }
    }
  }

  Assert-CanaryElapsedSeconds -Text $canaryText
  Assert-NoFailureMarkers -Text $canaryText -SourceName "CanaryLog"

  $canaryLogPath = $resolvedCanaryLog.Path
  $Evidence.gates.canary.thirtyMinuteCanaryOutput = "30-minute production canary passed; log: $canaryLogPath"
  if ($RequireNotionSyncEvidence) {
    $Evidence.gates.canary.thirtyMinuteCanaryOutput = "30-minute production canary with Notion sync-now passed; log: $canaryLogPath"
  }
  Write-Host "[PASS] Canary evidence imported from: $canaryLogPath"
}

Assert-FileExists -Path $EvidenceFile -Name "EvidenceFile"
$resolvedEvidenceFile = Resolve-Path -LiteralPath $EvidenceFile

try {
  $evidence = Get-Content -Raw -LiteralPath $resolvedEvidenceFile | ConvertFrom-Json
} catch {
  throw "Release evidence file must be valid JSON: $($_.Exception.Message)"
}

Assert-ReleaseEvidenceMatchesSchema -Evidence $evidence

if (
  [string]::IsNullOrWhiteSpace($ArtifactDirectory) -and
  [string]::IsNullOrWhiteSpace($DeployDryRunLog) -and
  [string]::IsNullOrWhiteSpace($DeployApplyLog) -and
  [string]::IsNullOrWhiteSpace($RollbackDryRunLog) -and
  [string]::IsNullOrWhiteSpace($RollbackApplyLog) -and
  [string]::IsNullOrWhiteSpace($CanaryLog)
) {
  throw "Nothing to update. Provide -ArtifactDirectory, -DeployDryRunLog, -DeployApplyLog, -RollbackDryRunLog, -RollbackApplyLog, or -CanaryLog to import release evidence."
}

if (-not [string]::IsNullOrWhiteSpace($ArtifactDirectory)) {
  if (-not (Test-Path -LiteralPath $ArtifactDirectory -PathType Container)) {
    throw "ArtifactDirectory does not exist: $ArtifactDirectory"
  }
  Import-ArtifactEvidence -Evidence $evidence -Directory $ArtifactDirectory
}

if (-not [string]::IsNullOrWhiteSpace($DeployDryRunLog)) {
  Assert-FileExists -Path $DeployDryRunLog -Name "DeployDryRunLog"
  Import-DeployLogEvidence -Evidence $evidence -LogFile $DeployDryRunLog -Mode "dry-run"
}

if (-not [string]::IsNullOrWhiteSpace($DeployApplyLog)) {
  Assert-FileExists -Path $DeployApplyLog -Name "DeployApplyLog"
  Import-DeployLogEvidence -Evidence $evidence -LogFile $DeployApplyLog -Mode "apply"
}

if (-not [string]::IsNullOrWhiteSpace($RollbackDryRunLog)) {
  Assert-FileExists -Path $RollbackDryRunLog -Name "RollbackDryRunLog"
  Import-RollbackLogEvidence -Evidence $evidence -LogFile $RollbackDryRunLog -Mode "dry-run"
}

if (-not [string]::IsNullOrWhiteSpace($RollbackApplyLog)) {
  Assert-FileExists -Path $RollbackApplyLog -Name "RollbackApplyLog"
  Import-RollbackLogEvidence -Evidence $evidence -LogFile $RollbackApplyLog -Mode "apply"
}

if (-not [string]::IsNullOrWhiteSpace($CanaryLog)) {
  Assert-FileExists -Path $CanaryLog -Name "CanaryLog"
  Import-CanaryLogEvidence -Evidence $evidence -LogFile $CanaryLog -RequireNotionSyncEvidence $RequireNotionSync.IsPresent
}

$json = $evidence | ConvertTo-Json -Depth 20
Set-Content -LiteralPath $resolvedEvidenceFile -Encoding UTF8 -Value $json

Write-Host "[PASS] Release evidence updated: $resolvedEvidenceFile"
