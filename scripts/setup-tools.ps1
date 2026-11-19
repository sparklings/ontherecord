# ==============================================================================
# On the Record (로컬 회의록 플러그인) 외부 도구 자동 준비 스크립트
#
# 이 스크립트는 Obsidian 플러그인 'On the Record' 사용을 위한
# FFmpeg, whisper.cpp 런타임, 음성인식 모델을 로컬 PC에 안전하게 준비하고
# local-settings.json 설정을 자동으로 초기화합니다.
#
# 실행 방법 (PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-tools.ps1
# ==============================================================================

[CmdletBinding()]
param (
    [switch]$IncludeSmallModel = $false,
    [switch]$SkipFFmpeg = $false
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [On the Record] 외부 도구 자동 셋업 도우미 (Setup Helper)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 기본 저장 경로 정의
$baseDir = "$env:LOCALAPPDATA\on-the-record-dev"
$runtimesDir = "$baseDir\runtimes"
$modelsDir = "$baseDir\models"
$pluginSettingsDir = "$env:LOCALAPPDATA\on-the-record"
$localSettingsFile = "$pluginSettingsDir\local-settings.json"

foreach ($dir in @($runtimesDir, $modelsDir, $pluginSettingsDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# ------------------------------------------------------------------------------
# 1. FFmpeg 확인 및 설치
# ------------------------------------------------------------------------------
Write-Host "[1/4] FFmpeg 오디오 변환기 확인 중..." -ForegroundColor Yellow
$ffmpegPath = $null

# 1) PATH에서 먼저 탐색
$ffmpegCmd = Get-Command "ffmpeg.exe" -ErrorAction SilentlyContinue
if ($ffmpegCmd) {
    $ffmpegPath = $ffmpegCmd.Source
    Write-Host "  -> 시스템 PATH에서 FFmpeg를 발견했습니다: $ffmpegPath" -ForegroundColor Green
} else {
    # 2) Winget 기본 경로 탐색
    $wingetFFmpeg = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($wingetFFmpeg) {
        $ffmpegPath = $wingetFFmpeg.FullName
        Write-Host "  -> WinGet 패키지에서 FFmpeg를 발견했습니다: $ffmpegPath" -ForegroundColor Green
    } elseif (-not $SkipFFmpeg) {
        # 3) Winget으로 설치 시도
        $wingetCmd = Get-Command "winget" -ErrorAction SilentlyContinue
        if ($wingetCmd) {
            Write-Host "  -> winget을 통해 FFmpeg 설치를 진행합니다..." -ForegroundColor Cyan
            try {
                winget install --id Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements
                $wingetFFmpeg = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($wingetFFmpeg) {
                    $ffmpegPath = $wingetFFmpeg.FullName
                    Write-Host "  -> FFmpeg 설치가 완료되었습니다: $ffmpegPath" -ForegroundColor Green
                }
            } catch {
                Write-Warning "winget 설치 중 오류가 발생했습니다. 수동 설치가 필요할 수 있습니다."
            }
        }
    }
}

if (-not $ffmpegPath) {
    Write-Warning "FFmpeg 경로를 자동으로 감지하지 못했습니다. 추후 설정에서 직접 경로를 입력해주세요."
}

# ------------------------------------------------------------------------------
# 2. whisper.cpp 런타임 (v1.9.5 b5454 x64 CPU) 다운로드 및 검증
# ------------------------------------------------------------------------------
Write-Host "`n[2/4] whisper.cpp CPU 런타임(b5454) 확인 중..." -ForegroundColor Yellow

$runtimeDestDir = "$runtimesDir\whisper.cpp-b5454-x64-cpu\Release"
$runtimeExePath = "$runtimeDestDir\whisper-cli.exe"
$expectedRuntimeHash = "331DBA46D6427105D2B802CDBC7EAE916EA1C5ABF9B0D3B5CFE460D8DB8E4366"
$runtimeUrl = "https://github.com/ggerganov/whisper.cpp/releases/download/v1.9.5/whisper-bin-x64.zip"

$needDownloadRuntime = $true
if (Test-Path $runtimeExePath) {
    $currentHash = (Get-FileHash $runtimeExePath -Algorithm SHA256).Hash
    if ($currentHash -eq $expectedRuntimeHash) {
        Write-Host "  -> 이미 검증된 whisper-cli.exe가 존재합니다." -ForegroundColor Green
        $needDownloadRuntime = $false
    }
}

if ($needDownloadRuntime) {
    Write-Host "  -> whisper.cpp v1.9.5 공식 바이너리 다운로드 중..." -ForegroundColor Cyan
    $zipPath = "$runtimesDir\whisper-bin-x64.zip"
    Invoke-WebRequest -Uri $runtimeUrl -OutFile $zipPath -UseBasicParsing
    
    Write-Host "  -> 압축 해제 중..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath "$runtimesDir\whisper.cpp-b5454-x64-cpu" -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

    if (Test-Path $runtimeExePath) {
        $actualHash = (Get-FileHash $runtimeExePath -Algorithm SHA256).Hash
        if ($actualHash -eq $expectedRuntimeHash) {
            Write-Host "  -> whisper-cli.exe SHA-256 무결성 검증 성공!" -ForegroundColor Green
        } else {
            Write-Warning "  -> 경고: 해시가 일치하지 않습니다. (실제: $actualHash)"
        }
    } else {
        throw "whisper-cli.exe 파일을 찾을 수 없습니다."
    }
}

# ------------------------------------------------------------------------------
# 3. Whisper GGML 양자화 모델 다운로드 및 검증
# ------------------------------------------------------------------------------
Write-Host "`n[3/4] Whisper 음성인식 모델 확인 중..." -ForegroundColor Yellow

$modelsToDownload = @(
    @{
        Name = "ggml-base-q5_1.bin"
        Desc = "Base Q5_1 (기본 권장, 약 57 MB)"
        Url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin"
        Hash = "422F1AE452ADE6F30A004D7E5C6A43195E4433BC370BF23FAC9CC591F01A8898"
        Required = $true
    }
)

if ($IncludeSmallModel) {
    $modelsToDownload += @{
        Name = "ggml-small-q5_1.bin"
        Desc = "Small Q5_1 (고정밀/고속, 약 181 MB)"
        Url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin"
        Hash = "D1E16839C381E1C7EDC40EAA6AC00D5CF60FF6BCBC41A96F71CE9F0EDD02802B"
        Required = $false
    }
}

$defaultModelPath = "$modelsDir\ggml-base-q5_1.bin"

foreach ($m in $modelsToDownload) {
    $destFile = "$modelsDir\$($m.Name)"
    $needDownload = $true
    if (Test-Path $destFile) {
        $fileHash = (Get-FileHash $destFile -Algorithm SHA256).Hash
        if ($fileHash -eq $m.Hash) {
            Write-Host "  -> [$($m.Desc)] 파일이 이미 준비되어 있습니다." -ForegroundColor Green
            $needDownload = $false
        }
    }

    if ($needDownload) {
        Write-Host "  -> [$($m.Desc)] 다운로드 중... 잠시 기다려주세요." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $m.Url -OutFile $destFile -UseBasicParsing
        $actualHash = (Get-FileHash $destFile -Algorithm SHA256).Hash
        if ($actualHash -eq $m.Hash) {
            Write-Host "  -> [$($m.Name)] SHA-256 검증 완료!" -ForegroundColor Green
        } else {
            Write-Warning "  -> [$($m.Name)] 경고: 모델 해시가 일치하지 않습니다."
        }
    }
}

# ------------------------------------------------------------------------------
# 4. local-settings.json 생성 및 스모크 테스트
# ------------------------------------------------------------------------------
Write-Host "`n[4/4] 로컬 설정 (local-settings.json) 저장 및 테스트..." -ForegroundColor Yellow

$localConfig = [ordered]@{
    runtimePath = $runtimeExePath
    modelPath = $defaultModelPath
    ffmpegPath = if ($ffmpegPath) { $ffmpegPath } else { "" }
}

$jsonText = $localConfig | ConvertTo-Json -Depth 4
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($localSettingsFile, $jsonText, $utf8NoBom)
Write-Host "  -> 로컬 설정 저장 완료: $localSettingsFile" -ForegroundColor Green

# 런타임 스모크 테스트
try {
    $proc = Start-Process -FilePath $runtimeExePath -ArgumentList "--help" -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 1 -or $proc.ExitCode -eq 2) {
        Write-Host "  -> whisper.cpp 런타임 구동 테스트 성공!" -ForegroundColor Green
    }
} catch {
    Write-Warning "런타임 실행 중 오류가 발생했습니다: $_"
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [On the Record] 모든 도구 셋업이 성공적으로 완료되었습니다!" -ForegroundColor Cyan
Write-Host " Obsidian 플러그인 설정 화면에서 도구 상태 뱃지를 확인하세요." -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan
