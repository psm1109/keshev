import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnServer} from '../src/server.mjs';

test('SDP status does not turn an unconfigured host into a connection result', async () => {
  const server = createOnServer();
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/sdp/status`);
    const result = await response.json();
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, {state: 'unavailable', reason: 'adapter_unconfigured'});
  } finally {await new Promise(resolve => server.close(resolve));}
});
