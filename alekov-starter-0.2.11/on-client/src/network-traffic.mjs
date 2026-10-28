// 학생 개선용 송수신 속도 측정. 어댑터 누적 바이트만 읽으며 외부 전송은 하지 않는다.
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';

const execute = promisify(execFile);
export const WINDOWS_TRAFFIC_READ = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
  function Read-TrafficSnapshot {
    $rows = @{}
    foreach ($nic in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
      if ($nic.OperationalStatus -ne 'Up' -or $nic.NetworkInterfaceType -in @('Loopback', 'Tunnel')) { continue }
      $stats = $nic.GetIPStatistics()
      $rows[$nic.Id] = @{ sent = [double]$stats.BytesSent; received = [double]$stats.BytesReceived }
    }
    return $rows
  }
  $before = Read-TrafficSnapshot
  if ($before.Count -eq 0) { throw 'NO_ACTIVE_INTERFACE' }
  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  Start-Sleep -Milliseconds 1000
  $after = Read-TrafficSnapshot
  $elapsedMs = $timer.Elapsed.TotalMilliseconds
  if ($before.Count -ne $after.Count) { throw 'INVALID_SAMPLE' }
  $sent = 0.0; $received = 0.0
  foreach ($id in $before.Keys) {
    if (-not $after.ContainsKey($id)) { throw 'INVALID_SAMPLE' }
    $sentDelta = $after[$id].sent - $before[$id].sent
    $receivedDelta = $after[$id].received - $before[$id].received
    if ($sentDelta -lt 0 -or $receivedDelta -lt 0) { throw 'INVALID_SAMPLE' }
    $sent += $sentDelta; $received += $receivedDelta
  }
  $result = @{ state = 'ok'; sentBytes = $sent; receivedBytes = $received; sampleMs = $elapsedMs }
} catch {
  $reason = 'query_failed'
  if ($_.Exception -is [System.UnauthorizedAccessException]) { $reason = 'permission_denied' }
  elseif ($_.Exception.Message -eq 'NO_ACTIVE_INTERFACE') { $reason = 'no_active_interface' }
  elseif ($_.Exception.Message -eq 'INVALID_SAMPLE') { $reason = 'invalid_sample' }
  $result = @{ state = 'unavailable'; reason = $reason }
}
$result | ConvertTo-Json -Compress
`;
const missing = reason => ({state: 'unavailable', reason});
export function trafficRates(raw) {
  const reasons = ['permission_denied', 'no_active_interface', 'invalid_sample', 'query_failed'];
  if (raw?.state === 'unavailable') return missing(reasons.includes(raw.reason) ? raw.reason : 'query_failed');
  if (raw?.state !== 'ok' || ![raw.sentBytes, raw.receivedBytes].every(n => Number.isSafeInteger(n) && n >= 0)
    || !Number.isFinite(raw.sampleMs) || raw.sampleMs < 250 || raw.sampleMs > 10000) return missing('invalid_sample');
  return {state: 'ok', source: 'adapter-counters', uploadMbps: raw.sentBytes * 8 / raw.sampleMs / 1000,
    downloadMbps: raw.receivedBytes * 8 / raw.sampleMs / 1000, sampleMs: raw.sampleMs};
}
export function createNetworkTrafficReader({run = execute, platform = os.platform()} = {}) {
  return async ({signal} = {}) => {
    if (signal?.aborted) return missing('cancelled');
    if (platform !== 'win32') return missing('unsupported');
    try {
      const exe = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      const {stdout} = await run(exe, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_TRAFFIC_READ],
        {windowsHide: true, encoding: 'utf8', timeout: 4000, maxBuffer: 16 * 1024, signal});
      return trafficRates(JSON.parse(stdout.trim()));
    } catch (error) {
      return missing(signal?.aborted ? 'cancelled' : error?.killed || error?.code === 'ETIMEDOUT' ? 'timeout' : 'query_failed');
    }
  };
}
