<#
.SYNOPSIS
  Measures whisper.cpp CPU transcription runs and writes JSON records to benchmarks\records\.
  Device ID prefixes transcript filenames for hardware-profile traceability.
  Format: docs\design\HARDWARE_PROFILE.md. Transcripts stay under %LOCALAPPDATA%\on-the-record\transcripts\; content is never printed.

.EXAMPLE
  powershell -File scripts\measure-whisper.ps1 -DeviceId samsung-960xfg -ModelId base -Quantization q5_1 -SampleId real-sample-01 -Threads 8 -Repeat 3
#>
param(
    [Parameter(Mandatory)] [string] $DeviceId,
    [Parameter(Mandatory)] [string] $ModelId,
    [Parameter(Mandatory)] [string] $Quantization,
    [Parameter(Mandatory)] [string] $SampleId,
    [int] $Threads = 8,
    [int] $Repeat = 1,
    [string] $Language = 'ko',
    [string] $Notes = ''
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $env:LOCALAPPDATA 'on-the-record'
$runtimeTag = 'b5454'
$runtimeDir = Join-Path $dataRoot "runtimes\whisper.cpp-$runtimeTag-x64-cpu\Release"
$cli = Join-Path $runtimeDir 'whisper-cli.exe'
$modelFile = Join-Path $dataRoot "models\ggml-$ModelId-$Quantization.bin"
$sampleFile = Join-Path $repo "samples\real-audio\$SampleId.wav"
$profileFile = Join-Path $repo "benchmarks\hardware\$DeviceId.json"
$recordsDir = Join-Path $repo "benchmarks\records\$DeviceId"
$transcriptDir = Join-Path $dataRoot 'transcripts'

foreach ($p in $cli, $modelFile, $sampleFile, $profileFile) {
    if (-not (Test-Path -LiteralPath $p)) { throw "Required file not found: $p" }
}
New-Item -ItemType Directory -Force -Path $transcriptDir, $recordsDir | Out-Null

$profile = Get-Content -LiteralPath $profileFile -Raw -Encoding UTF8 | ConvertFrom-Json
$sha = { param($f) (Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash.ToLowerInvariant() }
$cliHash = & $sha $cli
$modelHash = & $sha $modelFile
$sampleHash = & $sha $sampleFile
$ffprobe = & ffprobe -v error -show_entries format=duration -of json $sampleFile | ConvertFrom-Json
$sampleSeconds = [math]::Round([double]$ffprobe.format.duration, 3)
$version = ((& $cli --version 2>&1) | Out-String).Trim()

$battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
$powerSource = if (-not $battery) { 'ac-no-battery' } elseif ($battery.BatteryStatus -in 2, 6, 7, 8, 9) { 'ac' } else { 'battery' }
$planLine = (powercfg /getactivescheme) | Out-String
$powerPlan = if ($planLine -match '\(([^)]+)\)') { $Matches[1] } else { $null }
$environment = [ordered]@{ powerSource = $powerSource; powerPlan = $powerPlan }

$date = Get-Date -Format 'yyyy-MM-dd'
$utf8 = New-Object System.Text.UTF8Encoding($false)

for ($i = 1; $i -le $Repeat; $i++) {
    $outBase = Join-Path $transcriptDir "$DeviceId-$SampleId-$ModelId-$Quantization-t$Threads-run$i"
    $errFile = Join-Path $env:TEMP "whisper-measure-$([guid]::NewGuid().ToString('N')).log"
    $outFile = "$errFile.out"
    $cliArgs = @('-m', "`"$modelFile`"", '-f', "`"$sampleFile`"", '-l', $Language, '-t', $Threads, '-otxt', '-of', "`"$outBase`"")

    $startedAt = Get-Date
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $proc = Start-Process -FilePath $cli -ArgumentList $cliArgs -NoNewWindow -PassThru -RedirectStandardError $errFile -RedirectStandardOutput $outFile
    $null = $proc.Handle
    $peak = 0L
    while (-not $proc.HasExited) {
        try { $proc.Refresh(); if ($proc.PeakWorkingSet64 -gt $peak) { $peak = $proc.PeakWorkingSet64 } } catch { }
        Start-Sleep -Milliseconds 200
    }
    $proc.WaitForExit()
    $sw.Stop()
    $exit = $proc.ExitCode

    $log = Get-Content -LiteralPath $errFile -Raw
    Remove-Item -LiteralPath $errFile, $outFile -Force
    $loadMs = if ($log -match 'load time =\s+([\d\.]+) ms') { [double]$Matches[1] } else { $null }
    $totalMs = if ($log -match 'total time =\s+([\d\.]+) ms') { [double]$Matches[1] } else { $null }
    $gpuFound = $log -notmatch 'no GPU found'
    $sysInfo = if ($log -match '(n_threads = \d+ / \d+)') { $Matches[1] } else { $null }
    $status = if ($exit -eq 0 -and $totalMs) { 'ok' } else { 'failed' }

    $txt = "$outBase.txt"
    $segments = $null; $uniqueSegments = $null; $maxRepeat = $null
    if (Test-Path -LiteralPath $txt) {
        $lines = @(Get-Content -LiteralPath $txt -Encoding UTF8 | Where-Object { $_.Trim() })
        $segments = $lines.Count
        if ($segments -gt 0) {
            $groups = $lines | Group-Object
            $uniqueSegments = $groups.Count
            $maxRepeat = ($groups | Measure-Object -Property Count -Maximum).Maximum
        }
    }

    $elapsed = if ($totalMs -ne $null -and $loadMs -ne $null) { [math]::Round(($totalMs - $loadMs) / 1000, 3) } else { $null }
    $perMinute = if ($elapsed) { [math]::Round($elapsed / ($sampleSeconds / 60), 3) } else { $null }

    $recordId = '{0}_{1}_{2}' -f $date, $DeviceId, ('{0:D3}' -f ((@(Get-ChildItem -LiteralPath $recordsDir -Filter "${date}_${DeviceId}_*.json" -ErrorAction SilentlyContinue).Count) + 1))
    $warnings = @()
    if ($gpuFound) { $warnings += 'GPU detected but this build was measured CPU-only' }

    $record = [ordered]@{
        recordId         = $recordId
        measuredAt       = $startedAt.ToString('yyyy-MM-ddTHH:mm:sszzz')
        deviceId         = $profile.deviceId
        profileRevision  = $profile.profileRevision
        provider         = [ordered]@{ id = 'whisper.cpp'; version = "$runtimeTag (v1.9.5, d1be6fd)"; executionDevice = 'cpu' }
        runtime          = [ordered]@{
            version = $version
            source  = 'https://github.com/ggml-org/whisper.cpp/releases/tag/b5454 (whisper-bin-x64.zip)'
            sha256  = $cliHash
            archiveSha256 = '6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb'
        }
        model            = [ordered]@{ id = $ModelId; quantization = $Quantization; sha256 = $modelHash; sizeBytes = (Get-Item -LiteralPath $modelFile).Length }
        sample           = [ordered]@{ id = "$SampleId.wav"; durationSeconds = $sampleSeconds; language = $Language; sha256 = $sampleHash }
        options          = [ordered]@{ threads = $Threads; language = $Language; beamSize = 5; bestOf = 5; threadInfo = $sysInfo; outputFormat = 'txt' }
        result           = [ordered]@{
            status               = $status
            modelLoadSeconds     = if ($loadMs -ne $null) { [math]::Round($loadMs / 1000, 3) } else { $null }
            elapsedSeconds       = $elapsed
            wallSeconds          = [math]::Round($sw.Elapsed.TotalSeconds, 3)
            secondsPerAudioMinute = $perMinute
            realtimeFactor       = if ($elapsed) { [math]::Round($elapsed / $sampleSeconds, 4) } else { $null }
            peakRamBytes         = $peak
            peakVramBytes        = $null
            segmentCount         = $segments
            uniqueSegmentCount   = $uniqueSegments
            maxRepeatedSegmentCount = $maxRepeat
            transcriptFile       = "%LOCALAPPDATA%\on-the-record\transcripts\$([IO.Path]::GetFileName($txt))"
        }
        environment      = $environment
        quality          = $null
        repeat            = [ordered]@{ count = $Repeat; index = $i }
        warnings         = $warnings
        notes            = $Notes
    }

    $recordPath = Join-Path $recordsDir "$recordId.json"
    [IO.File]::WriteAllText($recordPath, ($record | ConvertTo-Json -Depth 6), $utf8)
    '{0}  status={1} elapsed={2}s perAudioMin={3}s peakRAM={4:N0}MB segments={5}' -f $recordId, $status, $elapsed, $perMinute, ($peak / 1MB), $segments
}
