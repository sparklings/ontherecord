<#
.SYNOPSIS
  Aggregates benchmarks\records\<deviceId>\*.json into a CSV and a Markdown summary.
  Groups runs by comparable conditions (runtime/model/sample hashes + threads) and reports the median of repeats.
  Output goes to benchmarks\summary\ (generated, ignored by Git). Transcript contents are never read.

.EXAMPLE
  powershell -File scripts\summarize-records.ps1
  powershell -File scripts\summarize-records.ps1 -Model small -Sample real-sample-02.wav
#>
param(
    [string] $Device = '',
    [string] $Model = '',
    [string] $Sample = ''
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$recordsRoot = Join-Path $repo 'benchmarks\records'
$outDir = Join-Path $repo 'benchmarks\summary'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-Median($values) {
    $v = @($values | Where-Object { $_ -ne $null } | Sort-Object)
    if ($v.Count -eq 0) { return $null }
    $mid = [int][math]::Floor($v.Count / 2)
    if ($v.Count % 2) { return $v[$mid] } else { return ($v[$mid - 1] + $v[$mid]) / 2 }
}

$rows = foreach ($f in Get-ChildItem -LiteralPath $recordsRoot -Recurse -File -Filter '*.json') {
    $r = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($Device -and $r.deviceId -ne $Device) { continue }
    if ($Model -and $r.model.id -ne $Model) { continue }
    if ($Sample -and $r.sample.id -ne $Sample) { continue }
    [pscustomobject]@{
        recordId       = $r.recordId
        measuredAt     = $r.measuredAt
        deviceId       = $r.deviceId
        profileRev     = $r.profileRevision
        provider       = $r.provider.id
        executionDev   = $r.provider.executionDevice
        runtimeSha     = $r.runtime.sha256
        model          = "$($r.model.id)-$($r.model.quantization)"
        modelSha       = $r.model.sha256
        sample         = $r.sample.id
        sampleSha      = $r.sample.sha256
        sampleSeconds  = $r.sample.durationSeconds
        threads        = $r.options.threads
        status         = $r.result.status
        elapsed        = $r.result.elapsedSeconds
        perMin         = $r.result.secondsPerAudioMinute
        peakRamMB      = if ($r.result.peakRamBytes) { [math]::Round($r.result.peakRamBytes / 1MB, 0) } else { $null }
        segments       = $r.result.segmentCount
        maxRepeat      = $r.result.maxRepeatedSegmentCount
        powerSource    = $r.environment.powerSource
        powerPlan      = $r.environment.powerPlan
    }
}
$rows = @($rows)
if ($rows.Count -eq 0) { 'No records.'; return }

$rows | Sort-Object deviceId, model, sample, measuredAt | Export-Csv -LiteralPath (Join-Path $outDir 'records.csv') -NoTypeInformation -Encoding UTF8

# Group key: runs are comparable only when runtime, model, sample and thread count are identical.
$groups = $rows | Where-Object { $_.status -eq 'ok' } | Group-Object deviceId, model, sample, threads, runtimeSha, modelSha, sampleSha
$table = foreach ($g in $groups) {
    $first = $g.Group[0]
    [pscustomobject]@{
        Device = $first.deviceId; Model = $first.model; Sample = $first.sample; Threads = $first.threads
        Runs = $g.Count
        MedianSecPerMin = [math]::Round((Get-Median ($g.Group.perMin)), 1)
        MinSecPerMin = ($g.Group.perMin | Measure-Object -Minimum).Minimum
        MaxSecPerMin = ($g.Group.perMin | Measure-Object -Maximum).Maximum
        PeakRamMB = ($g.Group.peakRamMB | Measure-Object -Maximum).Maximum
        Segments = $first.segments
        MaxRepeat = ($g.Group.maxRepeat | Measure-Object -Maximum).Maximum
        Power = "$($first.powerSource)"
    }
}
$table = $table | Sort-Object Sample, Model, Device

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine("# Benchmark summary (generated $(Get-Date -Format 'yyyy-MM-dd HH:mm'))")
[void]$md.AppendLine('')
[void]$md.AppendLine("Records: $($rows.Count), devices: $(@($rows.deviceId | Sort-Object -Unique).Count). Median of repeats; groups use identical runtime/model/sample hashes and thread count.")
[void]$md.AppendLine('')
[void]$md.AppendLine('| Sample | Model | Device | Threads | Runs | Median s/min | Min-Max | Peak RAM MB | Segments | Max repeat | Power |')
[void]$md.AppendLine('|---|---|---|---:|---:|---:|---|---:|---:|---:|---|')
foreach ($t in $table) {
    [void]$md.AppendLine("| $($t.Sample) | $($t.Model) | $($t.Device) | $($t.Threads) | $($t.Runs) | $($t.MedianSecPerMin) | $($t.MinSecPerMin)-$($t.MaxSecPerMin) | $($t.PeakRamMB) | $($t.Segments) | $($t.MaxRepeat) | $($t.Power) |")
}

$failed = @($rows | Where-Object { $_.status -ne 'ok' })

# 1-hour meeting estimate: per device+model, use the longest sample available (long samples are less skewed by fixed costs).
# 60 min of audio x (median sec per audio minute) = that many minutes, so the value equals MedianSecPerMin.
[void]$md.AppendLine('')
[void]$md.AppendLine('## 1-hour meeting estimate (minutes)')
[void]$md.AppendLine('')
[void]$md.AppendLine('| Device | Model | Basis sample | Sample min | Runs | Est. minutes per 1h audio | Real-time x | Peak RAM MB | Max repeat | Verdict |')
[void]$md.AppendLine('|---|---|---|---:|---:|---:|---:|---:|---:|---|')
$est = foreach ($g in ($table | Group-Object Device, Model)) {
    $withLen =  $g.Group | ForEach-Object { $t = $_; [pscustomobject]@{ T = $t; Len = ($rows | Where-Object { $_.sample -eq $t.Sample } | Select-Object -First 1).sampleSeconds } }
    $pick = ($withLen | Sort-Object Len -Descending | Select-Object -First 1)
    $t = $pick.T
    $minutes = $t.MedianSecPerMin
    [pscustomobject]@{ Device = $t.Device; Model = $t.Model; Sample = $t.Sample; SampleMin = [math]::Round($pick.Len / 60, 1); Runs = $t.Runs; Minutes = $minutes; Rtf = [math]::Round(60 / $minutes, 2); Ram = $t.PeakRamMB; MaxRepeat = $t.MaxRepeat }
}
foreach ($e in ($est | Sort-Object Device, Minutes)) {
    $verdict = if ($e.Minutes -le 60) { 'faster than real time' } else { 'slower than real time' }
    $rep = if ($e.MaxRepeat -ne $null -and $e.MaxRepeat -ne '') { $e.MaxRepeat } else { 'n/a' }
    [void]$md.AppendLine("| $($e.Device) | $($e.Model) | $($e.Sample) | $($e.SampleMin) | $($e.Runs) | $($e.Minutes) | $($e.Rtf) | $($e.Ram) | $rep | $verdict |")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('Runs without repeat statistics (n/a) were recorded before 2026-11-03. Speed with heavy repeated output may be understated; do not choose a model on speed alone.')
$mixed = $rows | Group-Object sample | Where-Object { @($_.Group.sampleSha | Sort-Object -Unique).Count -gt 1 }
[void]$md.AppendLine('')
[void]$md.AppendLine("Failed runs: $($failed.Count)")
foreach ($m in $mixed) { [void]$md.AppendLine("WARNING: sample '$($m.Name)' has more than one SHA-256 across devices; results are not comparable.") }
[IO.File]::WriteAllText((Join-Path $outDir 'summary.md'), $md.ToString(), $utf8)
$table | Format-Table -AutoSize | Out-String -Width 250
