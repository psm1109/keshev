import test from 'node:test';
import assert from 'node:assert/strict';
import {trafficRates, createNetworkTrafficReader, WINDOWS_TRAFFIC_READ} from '../src/network-traffic.mjs';
import {createPcStatusReader, normalizeWindowsStatus} from '../src/pc-status.mjs';

test('byte deltas use the actual sample duration and convert both directions to Mbps', () => {
  const result = trafficRates({state: 'ok', sentBytes: 250000, receivedBytes: 1250000, sampleMs: 2000});
  assert.equal(result.uploadMbps, 1); assert.equal(result.downloadMbps, 5);
  assert.equal(result.source, 'adapter-counters');
  assert.equal(trafficRates({state: 'ok', sentBytes: 0, receivedBytes: 0, sampleMs: 1000}).downloadMbps, 0);
});

test('invalid counters, reset counters and invalid intervals cannot become a speed', () => {
  const valid = {state: 'ok', sentBytes: 100, receivedBytes: 200, sampleMs: 1000};
  for (const invalid of [{sentBytes: -1}, {receivedBytes: NaN}, {sentBytes: 0.5}, {receivedBytes: Number.MAX_SAFE_INTEGER + 1},
    {sampleMs: 0}, {sampleMs: 10001}, {sampleMs: '1000'}]) {
    assert.deepEqual(trafficRates({...valid, ...invalid}), {state: 'unavailable', reason: 'invalid_sample'});
  }
  assert.deepEqual(trafficRates({state: 'unavailable', reason: 'no_active_interface'}), {state: 'unavailable', reason: 'no_active_interface'});
});

test('Windows reader uses hidden local counter sampling and returns only aggregate rates', async () => {
  const reader = createNetworkTrafficReader({platform: 'win32', run: async (exe, args, options) => {
    assert.match(exe, /powershell\.exe$/); assert.equal(args.at(-1), WINDOWS_TRAFFIC_READ);
    assert.equal(options.windowsHide, true);
    return {stdout: JSON.stringify({state: 'ok', sentBytes: 125000, receivedBytes: 250000, sampleMs: 1000, address: 'ignored'})};
  }});
  const result = await reader();
  assert.equal(result.uploadMbps, 1); assert.equal(result.downloadMbps, 2); assert.equal(result.address, undefined);
});

test('errors, malformed responses and cancellations stay unavailable', async () => {
  for (const [run, reason] of [[async () => {throw {killed: true};}, 'timeout'], [async () => ({stdout: 'bad JSON'}), 'query_failed']]) {
    assert.deepEqual(await createNetworkTrafficReader({platform: 'win32', run})(), {state: 'unavailable', reason});
  }
  const abort = new AbortController(); abort.abort();
  assert.deepEqual(await createNetworkTrafficReader({platform: 'win32', run: () => assert.fail('must not run')})({signal: abort.signal}),
    {state: 'unavailable', reason: 'cancelled'});
});

test('unsupported platforms do not run Windows commands or fabricate zero traffic', async () => {
  const result = await createNetworkTrafficReader({platform: 'linux', run: () => assert.fail('must not run')})();
  assert.deepEqual(result, {state: 'unavailable', reason: 'unsupported'});
});

test('Windows network connection is independent of traffic and fails closed', () => {
  for (const connected of [true, false]) {
    assert.deepEqual(normalizeWindowsStatus({networkConnection: {state: 'ok', connected}}).networkConnection, {state: 'ok', connected});
  }
  assert.deepEqual(normalizeWindowsStatus({networkConnection: {state: 'unavailable', reason: 'permission_denied'}}).networkConnection, {state: 'unavailable', reason: 'permission_denied'});
  assert.deepEqual(normalizeWindowsStatus({networkConnection: {state: 'ok', connected: 'false'}}).networkConnection, {state: 'unavailable', reason: 'invalid_response'});
});

test('Windows event log scope is preserved only when both logs are proven', () => {
  const events = {state: 'ok', logs: ['System', 'Application'], warningCount: 1, errorCount: 2, truncated: true, sampleLimit: 5000, since: '2026-10-28T00:00:00.000Z'};
  assert.deepEqual(normalizeWindowsStatus({events}).events.logs, ['System', 'Application']);
  assert.equal(normalizeWindowsStatus({events: {...events, logs: ['System']}}).events.logs, null);
  assert.equal(normalizeWindowsStatus({events: {...events, logs: undefined}}).events.logs, null);
});

test('PC status adds traffic without replacing the provided network configuration counts', async () => {
  const traffic = {state: 'ok', source: 'adapter-counters', uploadMbps: 1, downloadMbps: 2, sampleMs: 1000};
  const reader = createPcStatusReader({platform: 'linux', system: {cpus: () => [], totalmem: () => 100, freemem: () => 30,
    networkInterfaces: () => ({nic: [{internal: false, family: 'IPv4'}]})}, disk: async () => ({blocks: 100, bavail: 30, bsize: 1}),
    pause: async () => {}, trafficReader: async () => traffic});
  const result = await reader();
  assert.equal(result.metrics.network.interfaceCount, 1); assert.equal(result.metrics.network.ipv4Count, 1);
  assert.deepEqual(result.metrics.network.traffic, traffic);
  assert.equal(result.metrics.memory.usedBytes, 70);
});
