[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/show-release-evidence-gaps.ps1"
$docsToCheck = @(
  "README.md",
  "infra/README.md",
  "docs/39_production-deployment-runbook.md",
  "docs/41_beginner-deployment-guide.md",
  "docs/42_first-deployment-ko.md"
)
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-evidence-gaps-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

function Assert-Contains {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Haystack,

    [Parameter(Mandatory = $true)]
    [string]$Needle,

    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  if ($Haystack -notmatch [regex]::Escape($Needle)) {
    throw $Message
  }
}

function New-CompleteEvidence {
  $evidenceNote = "release evidence recorded with command output path"
  return [ordered]@{
    releaseId = "release-test"
    owner = "release-owner"
    decision = "No-go"
    decisionTimestamp = "2026-06-30T19:10:00+09:00"
    gates = [ordered]@{
      localReleaseGate = [ordered]@{
        commandTimestamp = $evidenceNote
        backendTestsPackage = $evidenceNote
        frontendAuditTestBuild = $evidenceNote
        extensionAuditTestBuild = $evidenceNote
        diffSecretMojibakeGuards = $evidenceNote
      }
      productionEnvPolicy = [ordered]@{
        envPolicyCheckOutput = $evidenceNote
        clientEnvPolicyCheckOutput = $evidenceNote
        ec2EnvFilePath = $evidenceNote
        secretOwnerRotationNote = $evidenceNote
      }
      dbBackupMigrationRehearsal = [ordered]@{
        backupFileAndChecksum = $evidenceNote
        restoreDryRunOutput = $evidenceNote
        restoreApplyOutput = $evidenceNote
        flywayInfoOutput = $evidenceNote
        flywayValidateOutput = $evidenceNote
        flywayMigrateOutput = $evidenceNote
        rollbackRestoreRehearsalOutput = $evidenceNote
      }
      artifactBuildInstall = [ordered]@{
        releaseArtifactDirectory = $evidenceNote
        releaseManifestContent = $evidenceNote
        sha256SumsContent = $evidenceNote
        backendJarChecksum = $evidenceNote
        frontendZipChecksum = $evidenceNote
        extensionZipChecksum = $evidenceNote
        previousArtifactPathsPreserved = $evidenceNote
        ec2DeployDryRunOutput = $evidenceNote
        ec2DeployApplyOutput = $evidenceNote
      }
      ec2Runtime = [ordered]@{
        systemdPreflightOutput = $evidenceNote
        reverseProxyOutput = $evidenceNote
        securityHeadersOutput = $evidenceNote
        logPaths = $evidenceNote
        healthOutput = $evidenceNote
      }
      realIntegrationSmoke = [ordered]@{
        googleLoginCookieRotation = $evidenceNote
        onboardingProfileSaveRead = $evidenceNote
        jobSaveBasketWorkspaceRead = $evidenceNote
        essayDraftVersionFlow = $evidenceNote
        referenceCrud = $evidenceNote
        documentProfileSaveRead = $evidenceNote
        notionJobOnlySyncIsolation = $evidenceNote
        loadedExtensionJobSave = $evidenceNote
        loadedExtensionAutofill = $evidenceNote
      }
      canary = [ordered]@{
        thirtyMinuteCanaryOutput = $evidenceNote
        backendProxyLogReview = $evidenceNote
        errorRateOrObservedFailures = $evidenceNote
        goNoGoDecisionTimeOwner = $evidenceNote
      }
      rollback = [ordered]@{
        previousBackendArtifactPath = $evidenceNote
        previousFrontendArtifactPath = $evidenceNote
        previousExtensionArtifactPath = $evidenceNote
        previousReleaseManifestPath = $evidenceNote
        previousChecksumFilePath = $evidenceNote
        dbBackupRestoreRehearsal = $evidenceNote
        rollbackDryRunOutput = $evidenceNote
        rollbackCommandOutput = $evidenceNote
        postRollbackHealthCanaryOutput = $evidenceNote
      }
    }
  }
}

function Invoke-GapReport {
  param([string]$EvidenceFile)

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -EvidenceFile $EvidenceFile 2>&1
    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

try {
  foreach ($relativePath in $docsToCheck) {
    $docPath = Join-Path $repoRoot $relativePath
    $docSource = Get-Content -Raw -LiteralPath $docPath
    Assert-Contains `
      -Haystack $docSource `
      -Needle "show-release-evidence-gaps.ps1" `
      -Message "$relativePath must document the release evidence gap report before final Go/No-go validation."
    Assert-Contains `
      -Haystack $docSource `
      -Needle "Suggested next commands" `
      -Message "$relativePath must explain that the release evidence gap report prints suggested next commands."
    Assert-Contains `
      -Haystack $docSource `
      -Needle "First next command" `
      -Message "$relativePath must explain that the release evidence gap report prints the first next command to run."
  }

  $completePath = Join-Path $tempRoot "complete.json"
  New-CompleteEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $completePath
  $completeResult = Invoke-GapReport -EvidenceFile $completePath
  if ($completeResult.ExitCode -ne 0 -or $completeResult.Output -notmatch "\[PASS\]") {
    throw "complete evidence should pass gap report. Output: $($completeResult.Output)"
  }

  $partialEvidence = New-CompleteEvidence
  $partialEvidence.gates.productionEnvPolicy.clientEnvPolicyCheckOutput = ""
  $partialEvidence.gates.realIntegrationSmoke.loadedExtensionAutofill = ""
  $partialEvidence.gates.canary.thirtyMinuteCanaryOutput = "pending until deploy"
  $partialEvidence.gates.rollback.Remove("rollbackCommandOutput")
  $partialPath = Join-Path $tempRoot "partial.json"
  $partialEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $partialPath

  $partialResult = Invoke-GapReport -EvidenceFile $partialPath
  if ($partialResult.ExitCode -ne 2) {
    throw "partial evidence should exit 2. Output: $($partialResult.Output)"
  }
  if ($partialResult.Output -notmatch [regex]::Escape("[INFO] Next evidence groups to fill:")) {
    throw "gap report should summarize the next evidence groups to fill. Output: $($partialResult.Output)"
  }
  foreach ($expectedGroup in @(
      "productionEnvPolicy: 1",
      "realIntegrationSmoke: 1",
      "canary: 1",
      "rollback: 1"
    )) {
    if ($partialResult.Output -notmatch [regex]::Escape($expectedGroup)) {
      throw "gap report did not include expected group summary '$expectedGroup'. Output: $($partialResult.Output)"
    }
  }
  if ($partialResult.Output -notmatch [regex]::Escape("[INFO] Runbook sections for remaining evidence:")) {
    throw "gap report should print runbook sections for remaining evidence. Output: $($partialResult.Output)"
  }
  foreach ($expectedHint in @(
      "productionEnvPolicy -> docs/39_production-deployment-runbook.md#gate-1-production-env-policy",
      "realIntegrationSmoke -> docs/39_production-deployment-runbook.md#gate-5-real-integration-smoke",
      "canary -> docs/39_production-deployment-runbook.md#gate-6-canary",
      "rollback -> docs/39_production-deployment-runbook.md#rollback"
    )) {
    if ($partialResult.Output -notmatch [regex]::Escape($expectedHint)) {
      throw "gap report did not include expected runbook hint '$expectedHint'. Output: $($partialResult.Output)"
    }
  }
  foreach ($expected in @(
      "gates.productionEnvPolicy.clientEnvPolicyCheckOutput (empty)",
      "gates.realIntegrationSmoke.loadedExtensionAutofill (empty)",
      "gates.canary.thirtyMinuteCanaryOutput (placeholder)",
      "gates.rollback.rollbackCommandOutput (missing)"
    )) {
    if ($partialResult.Output -notmatch [regex]::Escape($expected)) {
      throw "gap report did not include expected gap '$expected'. Output: $($partialResult.Output)"
    }
  }
  if ($partialResult.Output -notmatch [regex]::Escape("[INFO] Suggested evidence examples:")) {
    throw "gap report should print field-level evidence examples. Output: $($partialResult.Output)"
  }
  foreach ($expectedHint in @(
      "gates.productionEnvPolicy.clientEnvPolicyCheckOutput -> .\scripts\check-client-prod-env.ps1 command output",
      "gates.realIntegrationSmoke.loadedExtensionAutofill -> loaded Chrome extension smoke result for document autofill",
      "gates.canary.thirtyMinuteCanaryOutput -> .\scripts\run-release-canary.ps1 30-minute log imported by update-release-evidence.ps1",
      "gates.rollback.rollbackCommandOutput -> rollback-ec2-release.sh DRY_RUN=false command output"
    )) {
    if ($partialResult.Output -notmatch [regex]::Escape($expectedHint)) {
      throw "gap report did not include expected evidence hint '$expectedHint'. Output: $($partialResult.Output)"
    }
  }
  if ($partialResult.Output -notmatch [regex]::Escape("[INFO] Suggested next commands:")) {
    throw "gap report should print suggested next commands. Output: $($partialResult.Output)"
  }
  if ($partialResult.Output -notmatch [regex]::Escape("[INFO] First next command: productionEnvPolicy -> .\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env")) {
    throw "gap report should print the first concrete next command before the full suggested command list. Output: $($partialResult.Output)"
  }
  foreach ($expectedCommand in @(
      'productionEnvPolicy -> .\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env',
      'productionEnvPolicy -> .\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env',
      'productionEnvPolicy -> .\scripts\new-production-env-evidence-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json',
      'realIntegrationSmoke -> .\scripts\new-real-smoke-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -BaseUrl https://ez-one.kr',
      'canary -> .\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace',
      'rollback -> bash scripts/rollback-ec2-release.sh',
      'rollback -> .\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackApplyLog $rollbackApplyLog'
    )) {
    if ($partialResult.Output -notmatch [regex]::Escape($expectedCommand)) {
      throw "gap report did not include expected next command '$expectedCommand'. Output: $($partialResult.Output)"
    }
  }

  $unknownFieldEvidence = New-CompleteEvidence
  $unknownFieldEvidence.gates.canary["staleEvidenceField"] = "old evidence field"
  $unknownFieldPath = Join-Path $tempRoot "unknown-field.json"
  $unknownFieldEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $unknownFieldPath

  $unknownFieldResult = Invoke-GapReport -EvidenceFile $unknownFieldPath
  if ($unknownFieldResult.ExitCode -ne 2) {
    throw "evidence with unknown fields should exit 2. Output: $($unknownFieldResult.Output)"
  }
  foreach ($expected in @(
      "canary: 1",
      "canary -> docs/39_production-deployment-runbook.md#gate-6-canary",
      "gates.canary.staleEvidenceField (unknown)"
    )) {
    if ($unknownFieldResult.Output -notmatch [regex]::Escape($expected)) {
      throw "gap report did not include expected unknown-field output '$expected'. Output: $($unknownFieldResult.Output)"
    }
  }

  $objectFieldEvidence = New-CompleteEvidence
  $objectFieldEvidence.gates.ec2Runtime.healthOutput = [ordered]@{
    path = ".codex-run-logs/health.log"
  }
  $objectFieldPath = Join-Path $tempRoot "object-field.json"
  $objectFieldEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $objectFieldPath

  $objectFieldResult = Invoke-GapReport -EvidenceFile $objectFieldPath
  if ($objectFieldResult.ExitCode -ne 2) {
    throw "evidence with object fields should exit 2. Output: $($objectFieldResult.Output)"
  }
  foreach ($expected in @(
      "ec2Runtime: 1",
      "ec2Runtime -> docs/39_production-deployment-runbook.md#gate-4-ec2-runtime",
      "gates.ec2Runtime.healthOutput (invalid-type)"
    )) {
    if ($objectFieldResult.Output -notmatch [regex]::Escape($expected)) {
      throw "gap report did not include expected invalid-type output '$expected'. Output: $($objectFieldResult.Output)"
    }
  }

  $invalidFormatEvidence = New-CompleteEvidence
  $invalidFormatEvidence.releaseId = "bad release id"
  $invalidFormatEvidence.decision = "Maybe"
  $invalidFormatEvidence.decisionTimestamp = "2026-06-30 19:10:00"
  $invalidFormatPath = Join-Path $tempRoot "invalid-format.json"
  $invalidFormatEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $invalidFormatPath

  $invalidFormatResult = Invoke-GapReport -EvidenceFile $invalidFormatPath
  if ($invalidFormatResult.ExitCode -ne 2) {
    throw "evidence with invalid top-level formats should exit 2. Output: $($invalidFormatResult.Output)"
  }
  foreach ($expected in @(
      "root: 3",
      "root.releaseId (invalid-format)",
      "root.decision (invalid-format)",
      "root.decisionTimestamp (invalid-format)"
    )) {
    if ($invalidFormatResult.Output -notmatch [regex]::Escape($expected)) {
      throw "gap report did not include expected invalid-format output '$expected'. Output: $($invalidFormatResult.Output)"
    }
  }

  $goMissingExplicitZeroCanaryEvidence = New-CompleteEvidence
  $goMissingExplicitZeroCanaryEvidence.decision = "Go"
  $goMissingExplicitZeroCanaryEvidence.gates.canary.errorRateOrObservedFailures = "canary completed; no user reports"
  $goMissingExplicitZeroCanaryPath = Join-Path $tempRoot "go-missing-explicit-zero-canary.json"
  $goMissingExplicitZeroCanaryEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $goMissingExplicitZeroCanaryPath

  $goMissingExplicitZeroCanaryResult = Invoke-GapReport -EvidenceFile $goMissingExplicitZeroCanaryPath
  if ($goMissingExplicitZeroCanaryResult.ExitCode -ne 2) {
    throw "Go evidence without explicit 0 failures and 0 errors should exit 2. Output: $($goMissingExplicitZeroCanaryResult.Output)"
  }
  foreach ($expected in @(
      "canary: 1",
      "canary -> docs/39_production-deployment-runbook.md#gate-6-canary",
      "gates.canary.errorRateOrObservedFailures (invalid-go-canary)"
    )) {
    if ($goMissingExplicitZeroCanaryResult.Output -notmatch [regex]::Escape($expected)) {
      throw "gap report did not include expected Go canary output '$expected'. Output: $($goMissingExplicitZeroCanaryResult.Output)"
    }
  }

  Write-Host "[PASS] release evidence gaps contract test passed."
  exit 0
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
