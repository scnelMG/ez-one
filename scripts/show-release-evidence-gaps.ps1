[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceFile
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

$evidencePath = Resolve-Path -LiteralPath $EvidenceFile

try {
  $evidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
} catch {
  throw "Release evidence file must be valid JSON: $($_.Exception.Message)"
}

$requiredTopLevel = Get-ReleaseEvidenceRequiredTopLevel
$requiredGates = Get-ReleaseEvidenceRequiredGates
$gateHints = Get-ReleaseEvidenceGateHints
$fieldHints = Get-ReleaseEvidenceFieldHints

function Test-PlaceholderEvidence {
  param([object]$Value)

  return Test-ReleaseEvidencePlaceholder -Value $Value
}

function Add-Gap {
  param(
    [System.Collections.Generic.List[object]]$Gaps,
    [string]$Path,
    [string]$Reason
  )

  $Gaps.Add([pscustomobject]@{
    Path = $Path
    Reason = $Reason
  })
}

function Test-EmptyEvidence {
  param([object]$Value)

  if ($null -eq $Value) {
    return $true
  }
  return ($Value -is [string] -and [string]::IsNullOrWhiteSpace($Value))
}

function Test-StringEvidenceField {
  param(
    [string]$Name,
    [string]$Path
  )

  return -not ($Path -eq "root" -and $Name -eq "gates")
}

function Test-NonEmptyString {
  param([object]$Value)

  return ($Value -is [string] -and -not [string]::IsNullOrWhiteSpace($Value))
}

function Test-DecisionTimestampFormat {
  param([string]$Value)

  if ($Value -notmatch "^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$") {
    return $false
  }

  $parsedTimestamp = [DateTimeOffset]::MinValue
  $styles = [System.Globalization.DateTimeStyles]::None
  return [DateTimeOffset]::TryParse($Value, [System.Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$parsedTimestamp)
}

function Test-GoCanaryFailureEvidence {
  param([string]$Value)

  $normalized = $Value.Trim().ToLowerInvariant()
  $hasExplicitZeroFailures = $normalized -match '\b0\s+(observed\s+)?failures?\b' -or $normalized -match '\bno\s+(observed\s+)?failures?\b'
  $hasExplicitZeroErrors = $normalized -match '\b0\s+(observed\s+)?errors?\b' -or $normalized -match '\bno\s+(observed\s+)?errors?\b'

  return ($hasExplicitZeroFailures -and $hasExplicitZeroErrors)
}

function Inspect-Field {
  param(
    [System.Collections.Generic.List[object]]$Gaps,
    [object]$Object,
    [string]$Name,
    [string]$Path
  )

  $fieldPath = "$Path.$Name"
  if ($null -eq $Object -or $Object.PSObject.Properties.Name -notcontains $Name) {
    Add-Gap -Gaps $Gaps -Path $fieldPath -Reason "missing"
    return
  }

  $value = $Object.PSObject.Properties[$Name].Value
  if (Test-EmptyEvidence -Value $value) {
    Add-Gap -Gaps $Gaps -Path $fieldPath -Reason "empty"
    return
  }

  if ((Test-StringEvidenceField -Name $Name -Path $Path) -and $value -isnot [string]) {
    Add-Gap -Gaps $Gaps -Path $fieldPath -Reason "invalid-type"
    return
  }

  if (Test-PlaceholderEvidence -Value $value) {
    Add-Gap -Gaps $Gaps -Path $fieldPath -Reason "placeholder"
  }
}

function Inspect-UnknownFields {
  param(
    [System.Collections.Generic.List[object]]$Gaps,
    [object]$Evidence,
    [string[]]$RequiredTopLevel,
    [System.Collections.IDictionary]$RequiredGates
  )

  foreach ($field in $Evidence.PSObject.Properties.Name) {
    if ($RequiredTopLevel -notcontains $field) {
      Add-Gap -Gaps $Gaps -Path "root.$field" -Reason "unknown"
    }
  }

  if ($Evidence.PSObject.Properties.Name -notcontains "gates" -or $null -eq $Evidence.gates) {
    return
  }

  foreach ($gateProperty in $Evidence.gates.PSObject.Properties) {
    $gateName = $gateProperty.Name
    if (-not $RequiredGates.Contains($gateName)) {
      Add-Gap -Gaps $Gaps -Path "gates.$gateName" -Reason "unknown"
      continue
    }

    $gate = $gateProperty.Value
    foreach ($field in $gate.PSObject.Properties.Name) {
      if ($RequiredGates[$gateName] -notcontains $field) {
        Add-Gap -Gaps $Gaps -Path "gates.$gateName.$field" -Reason "unknown"
      }
    }
  }
}

function Inspect-TopLevelFormats {
  param(
    [System.Collections.Generic.List[object]]$Gaps,
    [object]$Evidence
  )

  if ($null -eq $Evidence) {
    return
  }

  if ($Evidence.PSObject.Properties.Name -contains "releaseId") {
    $releaseId = $Evidence.releaseId
    if ((Test-NonEmptyString -Value $releaseId) -and $releaseId -notmatch "^[A-Za-z0-9_.-]+$") {
      Add-Gap -Gaps $Gaps -Path "root.releaseId" -Reason "invalid-format"
    }
  }

  if ($Evidence.PSObject.Properties.Name -contains "decision") {
    $decision = $Evidence.decision
    if ((Test-NonEmptyString -Value $decision) -and @("Go", "No-go") -notcontains $decision) {
      Add-Gap -Gaps $Gaps -Path "root.decision" -Reason "invalid-format"
    }
  }

  if ($Evidence.PSObject.Properties.Name -contains "decisionTimestamp") {
    $decisionTimestamp = $Evidence.decisionTimestamp
    if ((Test-NonEmptyString -Value $decisionTimestamp) -and -not (Test-DecisionTimestampFormat -Value $decisionTimestamp)) {
      Add-Gap -Gaps $Gaps -Path "root.decisionTimestamp" -Reason "invalid-format"
    }
  }
}

function Inspect-GoDecisionEvidence {
  param(
    [System.Collections.Generic.List[object]]$Gaps,
    [object]$Evidence
  )

  if ($null -eq $Evidence -or $Evidence.PSObject.Properties.Name -notcontains "decision") {
    return
  }

  if ($Evidence.decision -ne "Go") {
    return
  }

  if (
    $Evidence.PSObject.Properties.Name -notcontains "gates" -or
    $null -eq $Evidence.gates -or
    $Evidence.gates.PSObject.Properties.Name -notcontains "canary" -or
    $null -eq $Evidence.gates.canary -or
    $Evidence.gates.canary.PSObject.Properties.Name -notcontains "errorRateOrObservedFailures"
  ) {
    return
  }

  $value = $Evidence.gates.canary.errorRateOrObservedFailures
  if ($value -is [string] -and -not [string]::IsNullOrWhiteSpace($value) -and -not (Test-GoCanaryFailureEvidence -Value $value)) {
    Add-Gap -Gaps $Gaps -Path "gates.canary.errorRateOrObservedFailures" -Reason "invalid-go-canary"
  }
}

function Get-GapGroupName {
  param([string]$Path)

  if ($Path -match '^gates\.([^.]+)') {
    return $Matches[1]
  }
  return "root"
}

function Get-GapGroupNextCommands {
  param([string]$GroupName)

  $commands = [ordered]@{
    root = @(
      '.\scripts\set-release-decision.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Decision No-go -Owner <owner-name> -Reason "<concrete reason>"'
    )
    localReleaseGate = @(
      '.\scripts\release-local-gate.ps1 -LogFile $gateLog',
      '.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog'
    )
    productionEnvPolicy = @(
      '.\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env',
      '.\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env',
      '.\scripts\new-production-env-evidence-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json'
    )
    dbBackupMigrationRehearsal = @(
      '.\scripts\create-mysql-backup.ps1 -EnvFile .\secrets\ez-one.prod.env -OutputDirectory .\db-backups',
      '.\scripts\rehearse-mysql-restore.ps1 -BackupFile <backup.sql.gz> -TargetDatabase <restored-db>',
      '.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.prod.env -ExpectedAppEnv prod'
    )
    artifactBuildInstall = @(
      '.\scripts\package-release-artifacts.ps1 -ReleaseId <release-id> -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env',
      '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -ArtifactDirectory .\release-artifacts\<release-id>',
      'bash scripts/deploy-ec2-release.sh'
    )
    ec2Runtime = @(
      'BASE_URL=https://ez-one.kr SERVICE_NAME=ez-one-backend bash scripts/check-ec2-runtime.sh',
      'curl -I https://ez-one.kr',
      'curl https://ez-one.kr/api/health'
    )
    realIntegrationSmoke = @(
      '.\scripts\new-real-smoke-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -BaseUrl https://ez-one.kr',
      'Run browser smoke: Google login -> onboarding -> job save -> basket -> workspace -> essay/reference/document profile',
      'Run loaded Chrome extension smoke: posting preview/save and document autofill',
      'Verify Notion JOB_ONLY sync failure isolation with a test account'
    )
    canary = @(
      '.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace',
      '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog'
    )
    rollback = @(
      'bash scripts/rollback-ec2-release.sh',
      '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackDryRunLog $rollbackDryRunLog',
      '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackApplyLog $rollbackApplyLog'
    )
  }

  if ($commands.Contains($GroupName)) {
    return @($commands[$GroupName])
  }
  return @()
}

$gaps = New-Object System.Collections.Generic.List[object]

foreach ($field in $requiredTopLevel) {
  Inspect-Field -Gaps $gaps -Object $evidence -Name $field -Path "root"
}

if ($evidence.PSObject.Properties.Name -contains "gates") {
  foreach ($gateName in $requiredGates.Keys) {
    if ($null -eq $evidence.gates -or $evidence.gates.PSObject.Properties.Name -notcontains $gateName) {
      Add-Gap -Gaps $gaps -Path "gates.$gateName" -Reason "missing"
      continue
    }

    $gate = $evidence.gates.PSObject.Properties[$gateName].Value
    foreach ($field in $requiredGates[$gateName]) {
      Inspect-Field -Gaps $gaps -Object $gate -Name $field -Path "gates.$gateName"
    }
  }
}

Inspect-UnknownFields -Gaps $gaps -Evidence $evidence -RequiredTopLevel $requiredTopLevel -RequiredGates $requiredGates
Inspect-TopLevelFormats -Gaps $gaps -Evidence $evidence
Inspect-GoDecisionEvidence -Gaps $gaps -Evidence $evidence

if ($gaps.Count -eq 0) {
  Write-Host "[PASS] Release evidence has no empty or placeholder fields: $evidencePath"
  exit 0
}

Write-Host "[INFO] Release evidence gaps found: $($gaps.Count)"
$groupCounts = [ordered]@{}
foreach ($gap in $gaps) {
  $groupName = Get-GapGroupName -Path $gap.Path
  if (-not $groupCounts.Contains($groupName)) {
    $groupCounts[$groupName] = 0
  }
  $groupCounts[$groupName] += 1
}

Write-Host "[INFO] Next evidence groups to fill:"
foreach ($groupName in $groupCounts.Keys) {
  Write-Host ("- {0}: {1}" -f $groupName, $groupCounts[$groupName])
}

$hintGroups = @($groupCounts.Keys | Where-Object { $gateHints.Contains($_) })
if ($hintGroups.Count -gt 0) {
  Write-Host "[INFO] Runbook sections for remaining evidence:"
  foreach ($groupName in $hintGroups) {
    Write-Host ("- {0} -> {1}" -f $groupName, $gateHints[$groupName])
  }
}

Write-Host "[INFO] Field-level gaps:"
foreach ($gap in $gaps) {
  Write-Host ("- {0} ({1})" -f $gap.Path, $gap.Reason)
}

$hintedGaps = @($gaps | Where-Object { $fieldHints.Contains($_.Path) })
if ($hintedGaps.Count -gt 0) {
  Write-Host "[INFO] Suggested evidence examples:"
  foreach ($gap in $hintedGaps) {
    Write-Host ("- {0} -> {1}" -f $gap.Path, $fieldHints[$gap.Path])
  }
}

$firstNextCommand = $null
foreach ($groupName in $groupCounts.Keys) {
  $commands = @(Get-GapGroupNextCommands -GroupName $groupName)
  if ($commands.Count -gt 0) {
    $firstNextCommand = [pscustomobject]@{
      GroupName = $groupName
      Command = $commands[0]
    }
    break
  }
}
if ($null -ne $firstNextCommand) {
  Write-Host ("[INFO] First next command: {0} -> {1}" -f $firstNextCommand.GroupName, $firstNextCommand.Command)
}

Write-Host "[INFO] Suggested next commands:"
foreach ($groupName in $groupCounts.Keys) {
  foreach ($command in (Get-GapGroupNextCommands -GroupName $groupName)) {
    Write-Host ("- {0} -> {1}" -f $groupName, $command)
  }
}

exit 2
