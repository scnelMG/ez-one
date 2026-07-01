[CmdletBinding()]
param()

function Get-ReleaseEvidenceRequiredTopLevel {
  return @("releaseId", "owner", "decision", "decisionTimestamp", "gates")
}

function Get-ReleaseEvidenceRequiredGates {
  return [ordered]@{
    localReleaseGate = @(
      "commandTimestamp",
      "backendTestsPackage",
      "frontendAuditTestBuild",
      "extensionAuditTestBuild",
      "diffSecretMojibakeGuards"
    )
    productionEnvPolicy = @(
      "envPolicyCheckOutput",
      "clientEnvPolicyCheckOutput",
      "ec2EnvFilePath",
      "secretOwnerRotationNote"
    )
    dbBackupMigrationRehearsal = @(
      "backupFileAndChecksum",
      "restoreDryRunOutput",
      "restoreApplyOutput",
      "flywayInfoOutput",
      "flywayValidateOutput",
      "flywayMigrateOutput",
      "rollbackRestoreRehearsalOutput"
    )
    artifactBuildInstall = @(
      "releaseArtifactDirectory",
      "releaseManifestContent",
      "sha256SumsContent",
      "backendJarChecksum",
      "frontendZipChecksum",
      "extensionZipChecksum",
      "previousArtifactPathsPreserved",
      "ec2DeployDryRunOutput",
      "ec2DeployApplyOutput"
    )
    ec2Runtime = @(
      "systemdPreflightOutput",
      "reverseProxyOutput",
      "securityHeadersOutput",
      "logPaths",
      "healthOutput"
    )
    realIntegrationSmoke = @(
      "googleLoginCookieRotation",
      "onboardingProfileSaveRead",
      "jobSaveBasketWorkspaceRead",
      "essayDraftVersionFlow",
      "referenceCrud",
      "documentProfileSaveRead",
      "notionJobOnlySyncIsolation",
      "loadedExtensionJobSave",
      "loadedExtensionAutofill"
    )
    canary = @(
      "thirtyMinuteCanaryOutput",
      "backendProxyLogReview",
      "errorRateOrObservedFailures",
      "goNoGoDecisionTimeOwner"
    )
    rollback = @(
      "previousBackendArtifactPath",
      "previousFrontendArtifactPath",
      "previousExtensionArtifactPath",
      "previousReleaseManifestPath",
      "previousChecksumFilePath",
      "dbBackupRestoreRehearsal",
      "rollbackDryRunOutput",
      "rollbackCommandOutput",
      "postRollbackHealthCanaryOutput"
    )
  }
}

function Get-ReleaseEvidenceGateHints {
  return [ordered]@{
    localReleaseGate = "docs/39_production-deployment-runbook.md#gate-0-local-release-gate"
    productionEnvPolicy = "docs/39_production-deployment-runbook.md#gate-1-production-env-policy"
    dbBackupMigrationRehearsal = "docs/39_production-deployment-runbook.md#gate-2-db-backup-and-migration-rehearsal"
    artifactBuildInstall = "docs/39_production-deployment-runbook.md#gate-3-artifact-build-and-install"
    ec2Runtime = "docs/39_production-deployment-runbook.md#gate-4-ec2-runtime"
    realIntegrationSmoke = "docs/39_production-deployment-runbook.md#gate-5-real-integration-smoke"
    canary = "docs/39_production-deployment-runbook.md#gate-6-canary"
    rollback = "docs/39_production-deployment-runbook.md#rollback"
  }
}

function Get-ReleaseEvidenceFieldHints {
  return [ordered]@{
    "root.releaseId" = "stable release id, for example release-20260630-001"
    "root.owner" = "release owner name or team responsible for Go/No-go"
    "root.decision" = "Go or No-go"
    "root.decisionTimestamp" = "ISO-8601 timestamp with timezone, for example 2026-06-30T21:30:00+09:00"
    "gates.localReleaseGate.commandTimestamp" = ".\scripts\release-local-gate.ps1 -LogFile command timestamp and log path"
    "gates.localReleaseGate.backendTestsPackage" = "backend test and package output from the full local release gate"
    "gates.localReleaseGate.frontendAuditTestBuild" = "frontend audit, test, and production build output from the full local release gate"
    "gates.localReleaseGate.extensionAuditTestBuild" = "extension audit, test, production build, and local-dev build output from the full local release gate"
    "gates.localReleaseGate.diffSecretMojibakeGuards" = "local release gate guard output for diff, secrets, and mojibake checks"
    "gates.productionEnvPolicy.envPolicyCheckOutput" = ".\scripts\check-prod-env.ps1 command output"
    "gates.productionEnvPolicy.clientEnvPolicyCheckOutput" = ".\scripts\check-client-prod-env.ps1 command output"
    "gates.productionEnvPolicy.ec2EnvFilePath" = "EC2 production env path and owner/permission note"
    "gates.productionEnvPolicy.secretOwnerRotationNote" = "who owns each production secret and the planned rotation action/date"
    "gates.dbBackupMigrationRehearsal.backupFileAndChecksum" = ".\scripts\create-mysql-backup.ps1 backup file path and SHA256"
    "gates.dbBackupMigrationRehearsal.restoreDryRunOutput" = ".\scripts\rehearse-mysql-restore.ps1 dry-run output"
    "gates.dbBackupMigrationRehearsal.restoreApplyOutput" = ".\scripts\rehearse-mysql-restore.ps1 -Apply output against staging/restored DB"
    "gates.dbBackupMigrationRehearsal.flywayInfoOutput" = ".\scripts\rehearse-flyway-release.ps1 info output"
    "gates.dbBackupMigrationRehearsal.flywayValidateOutput" = ".\scripts\rehearse-flyway-release.ps1 validate output"
    "gates.dbBackupMigrationRehearsal.flywayMigrateOutput" = ".\scripts\rehearse-flyway-release.ps1 migrate rehearsal output"
    "gates.dbBackupMigrationRehearsal.rollbackRestoreRehearsalOutput" = "restore rehearsal output proving DB rollback input is usable"
    "gates.artifactBuildInstall.releaseArtifactDirectory" = ".\scripts\package-release-artifacts.ps1 output directory"
    "gates.artifactBuildInstall.releaseManifestContent" = "RELEASE-MANIFEST.txt path or excerpt"
    "gates.artifactBuildInstall.sha256SumsContent" = "SHA256SUMS.txt path or excerpt"
    "gates.artifactBuildInstall.backendJarChecksum" = "backend JAR checksum from SHA256SUMS.txt"
    "gates.artifactBuildInstall.frontendZipChecksum" = "frontend ZIP checksum from SHA256SUMS.txt"
    "gates.artifactBuildInstall.extensionZipChecksum" = "extension ZIP checksum from SHA256SUMS.txt"
    "gates.artifactBuildInstall.previousArtifactPathsPreserved" = "previous release artifact paths preserved before deploy"
    "gates.artifactBuildInstall.ec2DeployDryRunOutput" = "deploy-ec2-release.sh dry-run command output"
    "gates.artifactBuildInstall.ec2DeployApplyOutput" = "deploy-ec2-release.sh DRY_RUN=false command output"
    "gates.ec2Runtime.systemdPreflightOutput" = "systemctl status or check-ec2-runtime.sh systemd output"
    "gates.ec2Runtime.reverseProxyOutput" = "nginx -t and active site config verification output"
    "gates.ec2Runtime.securityHeadersOutput" = "curl -I HTTPS response showing expected security headers"
    "gates.ec2Runtime.logPaths" = "backend, nginx access, and nginx error log paths checked on EC2"
    "gates.ec2Runtime.healthOutput" = "curl https://<domain>/api/health output"
    "gates.realIntegrationSmoke.googleLoginCookieRotation" = "browser smoke result for Google login and HttpOnly refresh cookie rotation"
    "gates.realIntegrationSmoke.onboardingProfileSaveRead" = "browser/API smoke result for onboarding save and reload"
    "gates.realIntegrationSmoke.jobSaveBasketWorkspaceRead" = "browser/API smoke result for job save, basket list, and workspace read"
    "gates.realIntegrationSmoke.essayDraftVersionFlow" = "browser/API smoke result for essay draft save and version history"
    "gates.realIntegrationSmoke.referenceCrud" = "browser/API smoke result for reference create/read/update/delete"
    "gates.realIntegrationSmoke.documentProfileSaveRead" = "browser/API smoke result for document profile save and reload"
    "gates.realIntegrationSmoke.notionJobOnlySyncIsolation" = "Notion JOB_ONLY sync output proving failures do not break core save"
    "gates.realIntegrationSmoke.loadedExtensionJobSave" = "loaded Chrome extension smoke result for posting preview and save"
    "gates.realIntegrationSmoke.loadedExtensionAutofill" = "loaded Chrome extension smoke result for document autofill"
    "gates.canary.thirtyMinuteCanaryOutput" = ".\scripts\run-release-canary.ps1 30-minute log imported by update-release-evidence.ps1"
    "gates.canary.backendProxyLogReview" = "backend and proxy log review covering the canary window"
    "gates.canary.errorRateOrObservedFailures" = "observed failures/error rate note for the canary window"
    "gates.canary.goNoGoDecisionTimeOwner" = "decision time, owner, and Go/No-go rationale"
    "gates.rollback.previousBackendArtifactPath" = "previous backend artifact path retained on EC2"
    "gates.rollback.previousFrontendArtifactPath" = "previous frontend artifact path retained on EC2"
    "gates.rollback.previousExtensionArtifactPath" = "previous extension artifact path retained on EC2"
    "gates.rollback.previousReleaseManifestPath" = "previous RELEASE-MANIFEST.txt path retained on EC2"
    "gates.rollback.previousChecksumFilePath" = "previous SHA256SUMS.txt path retained on EC2"
    "gates.rollback.dbBackupRestoreRehearsal" = "DB backup restore rehearsal output for rollback readiness"
    "gates.rollback.rollbackDryRunOutput" = "rollback-ec2-release.sh dry-run command output"
    "gates.rollback.rollbackCommandOutput" = "rollback-ec2-release.sh DRY_RUN=false command output"
    "gates.rollback.postRollbackHealthCanaryOutput" = "post-rollback /api/health and canary output"
  }
}

function Get-ReleaseEvidenceRequiredFieldPaths {
  $paths = New-Object System.Collections.Generic.List[string]

  foreach ($field in Get-ReleaseEvidenceRequiredTopLevel) {
    if ($field -ne "gates") {
      $paths.Add("root.$field")
    }
  }

  $requiredGates = Get-ReleaseEvidenceRequiredGates
  foreach ($gateName in $requiredGates.Keys) {
    foreach ($field in $requiredGates[$gateName]) {
      $paths.Add("gates.$gateName.$field")
    }
  }

  return @($paths)
}

function Assert-ReleaseEvidenceFieldHintsComplete {
  $requiredPaths = Get-ReleaseEvidenceRequiredFieldPaths
  $requiredPathSet = New-Object System.Collections.Generic.HashSet[string]
  foreach ($path in $requiredPaths) {
    $null = $requiredPathSet.Add($path)
  }

  $fieldHints = Get-ReleaseEvidenceFieldHints
  foreach ($path in $requiredPaths) {
    if (-not $fieldHints.Contains($path)) {
      throw "Release evidence field hint is missing for $path."
    }
    if ([string]::IsNullOrWhiteSpace($fieldHints[$path])) {
      throw "Release evidence field hint is empty for $path."
    }
  }

  foreach ($hintPath in $fieldHints.Keys) {
    if (-not $requiredPathSet.Contains($hintPath)) {
      throw "Release evidence field hint points to an unknown field: $hintPath."
    }
  }
}

function Test-ReleaseEvidencePlaceholder {
  param([object]$Value)

  if ($Value -isnot [string]) {
    return $false
  }

  $normalized = $Value.Trim().ToLowerInvariant()
  if ($normalized -match '^(set|todo|tbd|pending|n/a|na|-|none|ok|okay|pass|passed|done|success|successful|green|complete|completed)$') {
    return $true
  }
  return $normalized -match '(^|[^a-z0-9])(todo|tbd|pending|change[_-]?me|placeholder)([^a-z0-9]|$)'
}

function Assert-ReleaseEvidenceTemplateMatchesSchema {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TemplateFile
  )

  $templatePath = Resolve-Path -LiteralPath $TemplateFile
  try {
    $template = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
  } catch {
    throw "Release evidence template must be valid JSON: $($_.Exception.Message)"
  }

  $requiredTopLevel = Get-ReleaseEvidenceRequiredTopLevel
  foreach ($field in $requiredTopLevel) {
    if ($null -eq $template -or $template.PSObject.Properties.Name -notcontains $field) {
      throw "Release evidence template is missing required field: root.$field"
    }
  }
  foreach ($field in $template.PSObject.Properties.Name) {
    if ($requiredTopLevel -notcontains $field) {
      throw "Release evidence template has unknown field: root.$field"
    }
  }

  $requiredGates = Get-ReleaseEvidenceRequiredGates
  foreach ($gateName in $requiredGates.Keys) {
    if ($null -eq $template.gates -or $template.gates.PSObject.Properties.Name -notcontains $gateName) {
      throw "Release evidence template is missing required gate: gates.$gateName"
    }
    $gate = $template.gates.PSObject.Properties[$gateName].Value
    foreach ($field in $requiredGates[$gateName]) {
      if ($null -eq $gate -or $gate.PSObject.Properties.Name -notcontains $field) {
        throw "Release evidence template is missing required field: gates.$gateName.$field"
      }
    }
    foreach ($field in $gate.PSObject.Properties.Name) {
      if ($requiredGates[$gateName] -notcontains $field) {
        throw "Release evidence template has unknown field: gates.$gateName.$field"
      }
    }
  }

  foreach ($gateName in $template.gates.PSObject.Properties.Name) {
    if (-not $requiredGates.Contains($gateName)) {
      throw "Release evidence template has unknown gate: gates.$gateName"
    }
  }
}

function Assert-ReleaseEvidenceMatchesSchema {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Evidence
  )

  $requiredTopLevel = Get-ReleaseEvidenceRequiredTopLevel
  foreach ($field in $requiredTopLevel) {
    if ($null -eq $Evidence -or $Evidence.PSObject.Properties.Name -notcontains $field) {
      throw "Release evidence is missing required field: root.$field"
    }
  }
  foreach ($field in $Evidence.PSObject.Properties.Name) {
    if ($requiredTopLevel -notcontains $field) {
      throw "Release evidence has unknown field: root.$field"
    }
  }

  $requiredGates = Get-ReleaseEvidenceRequiredGates
  foreach ($gateName in $requiredGates.Keys) {
    if ($null -eq $Evidence.gates -or $Evidence.gates.PSObject.Properties.Name -notcontains $gateName) {
      throw "Release evidence is missing required gate: gates.$gateName"
    }
    $gate = $Evidence.gates.PSObject.Properties[$gateName].Value
    foreach ($field in $requiredGates[$gateName]) {
      if ($null -eq $gate -or $gate.PSObject.Properties.Name -notcontains $field) {
        throw "Release evidence is missing required field: gates.$gateName.$field"
      }
    }
    foreach ($field in $gate.PSObject.Properties.Name) {
      if ($requiredGates[$gateName] -notcontains $field) {
        throw "Release evidence has unknown field: gates.$gateName.$field"
      }
    }
  }

  foreach ($gateName in $Evidence.gates.PSObject.Properties.Name) {
    if (-not $requiredGates.Contains($gateName)) {
      throw "Release evidence has unknown gate: gates.$gateName"
    }
  }
}

function ConvertTo-MarkdownHeadingAnchor {
  param(
    [Parameter(Mandatory = $true)]
    [string]$HeadingText
  )

  $anchor = $HeadingText.Trim().ToLowerInvariant()
  $anchor = [regex]::Replace($anchor, '[^a-z0-9 _-]', '')
  $anchor = [regex]::Replace($anchor, '\s+', '-')
  $anchor = [regex]::Replace($anchor, '-+', '-')
  return $anchor.Trim('-')
}

function Assert-ReleaseEvidenceRunbookHintsResolvable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RunbookFile
  )

  $runbookPath = Resolve-Path -LiteralPath $RunbookFile
  $runbookRelativePath = "docs/39_production-deployment-runbook.md"
  $anchors = New-Object System.Collections.Generic.HashSet[string]

  foreach ($line in Get-Content -LiteralPath $runbookPath) {
    if ($line -match '^\s*#{1,6}\s+(.+?)\s*$') {
      $null = $anchors.Add((ConvertTo-MarkdownHeadingAnchor -HeadingText $Matches[1]))
    }
  }

  foreach ($gateName in (Get-ReleaseEvidenceRequiredGates).Keys) {
    $hints = Get-ReleaseEvidenceGateHints
    if (-not $hints.Contains($gateName)) {
      throw "Release evidence runbook hint is missing for gate: $gateName"
    }

    $hint = $hints[$gateName]
    if ($hint -notmatch "^$([regex]::Escape($runbookRelativePath))#(.+)$") {
      throw "Release evidence runbook hint for $gateName must point inside $runbookRelativePath."
    }

    $anchor = $Matches[1]
    if (-not $anchors.Contains($anchor)) {
      throw "Release evidence runbook hint for $gateName points to a missing heading anchor: $hint"
    }
  }
}
