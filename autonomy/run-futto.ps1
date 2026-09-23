param(
  [ValidateSet('owner','explorer','reviewer','main')]
  [string]$Role = 'owner',
  [string]$Message = '',
  [string]$MessageFile = ''
)

# Orchestration FUTTO : un tour d'agent via le gateway OpenClaw, loggé.
# Usage :
#   .\run-futto.ps1 -Role owner                       -> prochaine tache P0 (ecrit autonomy/NEXT_TASK.md)
#   .\run-futto.ps1 -Role explorer -MessageFile autonomy/NEXT_TASK.md
#   .\run-futto.ps1 -Role reviewer -MessageFile autonomy/NEXT_TASK.md
#   .\run-futto.ps1 -Role main -Message "resume la tache en cours"
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..'
$logDir = Join-Path $PSScriptRoot 'logs'
if (-not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$agent = "futto-$Role"
if ($Role -eq 'main') { $agent = 'main' }

$args = @('agent', '--agent', $agent, '--timeout', '900')
if ($MessageFile -and (Test-Path -LiteralPath $MessageFile)) { $args += @('--message-file', $MessageFile) }
elseif ($Message) { $args += @('-m', $Message) }
else {
  $args += @('-m', 'Reprends la main sur la prochaine etape: lis autonomy/NEXT_TASK.md s il existe, sinon choisis la prochaine tache P0 non cochee du roadmap et ecris/actualise autonomy/NEXT_TASK.md. Reponds en francais, concis.')
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $logDir "$Role-$stamp.txt"

Write-Host "[run-futto] tour $Role -> $out" -ForegroundColor Cyan
$stdout = & openclaw @args 2>&1
$stdout | Out-File -FilePath $out -Encoding utf8
$stdout | Out-Host
Write-Host "[run-futto] fini (voir autonomy\logs\$($Role -replace '_','-')-$stamp.txt)" -ForegroundColor Cyan