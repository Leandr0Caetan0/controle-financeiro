<#
.SYNOPSIS
    Backup automático do SQLite do CaetanoFinanças para pasta local do Google Drive.

.DESCRIPTION
    Copia o arquivo .db com timestamp para a pasta configurada (Google Drive local sync).
    Mantém os últimos N backups e remove os mais antigos automaticamente.

.PARAMETER DbPath
    Caminho do arquivo SQLite. Detecta automaticamente se omitido.

.PARAMETER BackupDir
    Pasta de destino sincronizada com Google Drive.

.PARAMETER KeepLast
    Número de backups a manter. Padrão: 30.

.EXAMPLE
    .\backup-sqlite.ps1
    .\backup-sqlite.ps1 -BackupDir "C:\Users\leand\Google Drive\Meu Drive\Backups\CF"
    .\backup-sqlite.ps1 -KeepLast 7

.NOTES
    Agendar via Task Scheduler:
    PowerShell.exe -NonInteractive -File "C:\Code\controle-financeiro\scripts\backup-sqlite.ps1"
#>

param(
    [string]$DbPath    = "",
    [string]$BackupDir = "",
    [int]   $KeepLast  = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── 1. Detectar o arquivo .db ─────────────────────────────────────────────────

if (-not $DbPath) {
    $root = Split-Path $PSScriptRoot -Parent
    $candidates = @(
        "$root\src\CaetanoFinancas.Api\caetanofinancas.db",
        "$root\caetanofinancas.db",
        "$root\src\caetanofinancas.db"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $DbPath = $c; break }
    }
    if (-not $DbPath) {
        $found = Get-ChildItem -Path $root -Filter "*.db" -Recurse -ErrorAction SilentlyContinue |
                 Where-Object { $_.Name -match "caetano|financas" } |
                 Select-Object -First 1
        if ($found) { $DbPath = $found.FullName }
    }
}

if (-not $DbPath -or -not (Test-Path $DbPath)) {
    Write-Error "Arquivo SQLite nao encontrado. Use -DbPath para especificar."
    exit 1
}

Write-Host "Fonte: $DbPath" -ForegroundColor Cyan

# ── 2. Detectar pasta de backup (Google Drive / OneDrive / fallback local) ─────

if (-not $BackupDir) {
    $candidates = @(
        "$env:USERPROFILE\Google Drive\Meu Drive\Backups\CaetanoFinancas",
        "$env:USERPROFILE\Google Drive\Backups\CaetanoFinancas",
        "$env:USERPROFILE\GoogleDrive\Backups\CaetanoFinancas",
        "$env:USERPROFILE\OneDrive\Backups\CaetanoFinancas",
        "$env:USERPROFILE\Documents\Backups\CaetanoFinancas"
    )
    foreach ($d in $candidates) {
        $parent = Split-Path $d -Parent
        if (Test-Path $parent) { $BackupDir = $d; break }
    }
    if (-not $BackupDir) {
        $BackupDir = "$env:USERPROFILE\Documents\Backups\CaetanoFinancas"
    }
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "Criada pasta: $BackupDir" -ForegroundColor Green
}

# ── 3. Copiar com WAL checkpoint antes do backup ──────────────────────────────

# Força WAL checkpoint para garantir que todas as transações estejam no .db
$walFile  = "$DbPath-wal"
$shmFile  = "$DbPath-shm"

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$destName  = "caetanofinancas_$timestamp.db"
$destPath  = Join-Path $BackupDir $destName

Copy-Item -Path $DbPath -Destination $destPath -Force

# Copiar WAL se existir (backup completo)
if (Test-Path $walFile) {
    Copy-Item -Path $walFile -Destination "$destPath-wal" -Force
}
if (Test-Path $shmFile) {
    Copy-Item -Path $shmFile -Destination "$destPath-shm" -Force
}

$sizeMB = [math]::Round((Get-Item $destPath).Length / 1MB, 2)
Write-Host "Backup criado: $destName ($sizeMB MB)" -ForegroundColor Green

# ── 4. Limpar backups antigos ─────────────────────────────────────────────────

$allBackups = Get-ChildItem -Path $BackupDir -Filter "caetanofinancas_*.db" |
              Sort-Object LastWriteTime -Descending

if ($allBackups.Count -gt $KeepLast) {
    $toDelete = $allBackups | Select-Object -Skip $KeepLast
    foreach ($old in $toDelete) {
        Remove-Item -Path $old.FullName -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$($old.FullName)-wal" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$($old.FullName)-shm" -Force -ErrorAction SilentlyContinue
        Write-Host "Removido antigo: $($old.Name)" -ForegroundColor DarkGray
    }
}

Write-Host "Total de backups mantidos: $([math]::Min($allBackups.Count, $KeepLast))" -ForegroundColor Cyan
Write-Host "Destino: $BackupDir" -ForegroundColor Cyan
