[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$checkScript = Join-Path $PSScriptRoot "check-release-evidence.ps1"
$templatePath = Join-Path $PSScriptRoot "..\docs\40_release-evidence.template.json"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-evidence-test-" + [Guid]::NewGuid().ToString("N"))

function New-CompleteEvidence {
  $evidenceNote = "release evidence recorded with command output path"
  return [ordered]@{
    releaseId = "release-test"
    owner = "release-owner"
    decision = "No-go"
    decisionTimestamp = "2026-06-28T19:10:00+09:00"
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

function Invoke-ReleaseEvidenceCheck {
  param([string]$EvidenceFile)

  try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $checkScript -EvidenceFile $EvidenceFile *> $null
    return $LASTEXITCODE
  } catch {
    return 1
  }
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  $template = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
  if ($template.gates.productionEnvPolicy.PSObject.Properties.Name -notcontains "clientEnvPolicyCheckOutput") {
    throw "docs/40_release-evidence.template.json must include gates.productionEnvPolicy.clientEnvPolicyCheckOutput."
  }

  $missingClientEnv = New-CompleteEvidence
  $missingClientEnv.gates.productionEnvPolicy.Remove("clientEnvPolicyCheckOutput")
  $missingClientEnvPath = Join-Path $tempRoot "missing-client-env.json"
  $missingClientEnv | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $missingClientEnvPath

  $missingExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $missingClientEnvPath
  if ($missingExit -eq 0) {
    throw "check-release-evidence.ps1 accepted evidence without gates.productionEnvPolicy.clientEnvPolicyCheckOutput."
  }

  $placeholderEvidence = New-CompleteEvidence
  $placeholderEvidence.gates.canary.errorRateOrObservedFailures = "pending"
  $placeholderEvidencePath = Join-Path $tempRoot "placeholder.json"
  $placeholderEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $placeholderEvidencePath

  $placeholderExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $placeholderEvidencePath
  if ($placeholderExit -eq 0) {
    throw "check-release-evidence.ps1 accepted placeholder evidence text."
  }

  $placeholderSentenceEvidence = New-CompleteEvidence
  $placeholderSentenceEvidence.gates.canary.thirtyMinuteCanaryOutput = "pending until canary finishes"
  $placeholderSentencePath = Join-Path $tempRoot "placeholder-sentence.json"
  $placeholderSentenceEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $placeholderSentencePath

  $placeholderSentenceExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $placeholderSentencePath
  if ($placeholderSentenceExit -eq 0) {
    throw "check-release-evidence.ps1 accepted placeholder evidence sentence."
  }

  $changeMeEvidence = New-CompleteEvidence
  $changeMeEvidence.gates.productionEnvPolicy.secretOwnerRotationNote = "CHANGE_ME_SECRET_OWNER"
  $changeMePath = Join-Path $tempRoot "change-me.json"
  $changeMeEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $changeMePath

  $changeMeExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $changeMePath
  if ($changeMeExit -eq 0) {
    throw "check-release-evidence.ps1 accepted CHANGE_ME evidence text."
  }

  $todoEvidence = New-CompleteEvidence
  $todoEvidence.gates.realIntegrationSmoke.loadedExtensionAutofill = "TODO after deploy"
  $todoPath = Join-Path $tempRoot "todo.json"
  $todoEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $todoPath

  $todoExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $todoPath
  if ($todoExit -eq 0) {
    throw "check-release-evidence.ps1 accepted TODO evidence text."
  }

  $vagueEvidence = New-CompleteEvidence
  $vagueEvidence.gates.ec2Runtime.healthOutput = "ok"
  $vaguePath = Join-Path $tempRoot "vague.json"
  $vagueEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $vaguePath

  $vagueExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $vaguePath
  if ($vagueExit -eq 0) {
    throw "check-release-evidence.ps1 accepted vague evidence text."
  }

  $objectEvidence = New-CompleteEvidence
  $objectEvidence.gates.ec2Runtime.healthOutput = [ordered]@{
    path = ".codex-run-logs/health.log"
  }
  $objectPath = Join-Path $tempRoot "object-evidence.json"
  $objectEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $objectPath

  $objectExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $objectPath
  if ($objectExit -eq 0) {
    throw "check-release-evidence.ps1 accepted non-string evidence."
  }

  $extraFieldEvidence = New-CompleteEvidence
  $extraFieldEvidence.gates.canary["staleEvidenceField"] = "old field"
  $extraFieldPath = Join-Path $tempRoot "extra-field.json"
  $extraFieldEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $extraFieldPath

  $extraFieldExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $extraFieldPath
  if ($extraFieldExit -eq 0) {
    throw "check-release-evidence.ps1 accepted an unknown release evidence field."
  }

  $invalidReleaseIdEvidence = New-CompleteEvidence
  $invalidReleaseIdEvidence.releaseId = "bad release id"
  $invalidReleaseIdPath = Join-Path $tempRoot "invalid-release-id.json"
  $invalidReleaseIdEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $invalidReleaseIdPath

  $invalidReleaseIdExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $invalidReleaseIdPath
  if ($invalidReleaseIdExit -eq 0) {
    throw "check-release-evidence.ps1 accepted an invalid releaseId."
  }

  $invalidTimestampEvidence = New-CompleteEvidence
  $invalidTimestampEvidence.decisionTimestamp = "not-a-date"
  $invalidTimestampPath = Join-Path $tempRoot "invalid-timestamp.json"
  $invalidTimestampEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $invalidTimestampPath

  $invalidTimestampExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $invalidTimestampPath
  if ($invalidTimestampExit -eq 0) {
    throw "check-release-evidence.ps1 accepted an invalid decisionTimestamp."
  }

  $goWithCanaryFailuresEvidence = New-CompleteEvidence
  $goWithCanaryFailuresEvidence.decision = "Go"
  $goWithCanaryFailuresEvidence.gates.canary.errorRateOrObservedFailures = "2 failures observed during the canary window"
  $goWithCanaryFailuresPath = Join-Path $tempRoot "go-with-canary-failures.json"
  $goWithCanaryFailuresEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $goWithCanaryFailuresPath

  $goWithCanaryFailuresExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $goWithCanaryFailuresPath
  if ($goWithCanaryFailuresExit -eq 0) {
    throw "check-release-evidence.ps1 accepted Go evidence with observed canary failures."
  }

  $completePath = Join-Path $tempRoot "complete.json"
  $completeEvidence = New-CompleteEvidence
  $completeEvidence.gates.canary.errorRateOrObservedFailures = "0 observed failures and 0 errors during the canary window"
  $completeEvidence | ConvertTo-Json -Depth 10 | Set-Content -Encoding ASCII -LiteralPath $completePath

  $completeExit = Invoke-ReleaseEvidenceCheck -EvidenceFile $completePath
  if ($completeExit -ne 0) {
    throw "check-release-evidence.ps1 rejected complete evidence with exit code $completeExit."
  }

  Write-Host "[PASS] release evidence contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
