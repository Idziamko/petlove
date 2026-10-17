import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi, parseFigmaUrl, parseOptions, retryDelay } from '../scripts/figma-fetch.mjs';

async function withCache(check) {
  const cache = await mkdtemp(join(tmpdir(), 'petlove-figma-test-'));
  try { await check(cache); } finally { await rm(cache, { recursive: true, force: true }); }
}

test('Figma node links normalize IDs and reject unrelated hosts', () => {
  assert.deepEqual(parseFigmaUrl('https://www.figma.com/design/abc123/Project?node-id=55812-319'), { fileKey: 'abc123', nodeId: '55812:319' });
  assert.deepEqual(parseFigmaUrl('https://www.figma.com/file/abc123/Project?node-id=12%3A34'), { fileKey: 'abc123', nodeId: '12:34' });
  assert.throws(() => parseFigmaUrl('https://www.figma.com.example.org/design/abc/Project'));
  assert.throws(() => parseFigmaUrl('http://www.figma.com/design/abc/Project'));
});

test('CLI options reject contradictory or malformed requests', () => {
  const url = 'https://www.figma.com/design/abc/Project';
  assert.deepEqual(parseOptions([url, '--nodes', '1-2,3:4', '--format', 'png,svg']).nodes, ['1:2', '3:4']);
  assert.throws(() => parseOptions([url, '--offline', '--refresh']));
  assert.throws(() => parseOptions([url, '--nodes', '../../file']));
  assert.throws(() => parseOptions([url, '--depth', 'NaN']));
  assert.throws(() => parseOptions([url, '--format', 'exe']));
});

test('cached requests work offline without a token or repeated network calls', async () => {
  await withCache(async cache => {
    let calls = 0;
    const data = { version: 'version-1', nodes: {} };
    const api = createApi({ token: 'test-token', cache, request: async (url, options) => {
      calls++;
      assert.equal(url.origin, 'https://api.figma.com');
      assert.equal(options.headers['X-Figma-Token'], 'test-token');
      assert.equal(options.redirect, 'error');
      return new Response(JSON.stringify(data));
    } });
    assert.deepEqual(await api('/files/test/nodes', { ids: '1:2' }), data);
    const offline = createApi({ token: '', cache, offline: true, request: () => { throw new Error('Network must not run'); } });
    assert.deepEqual(await offline('/files/test/nodes', { ids: '1:2' }), data);
    assert.equal(calls, 1);
    await assert.rejects(offline('/files/test/nodes', { ids: '3:4' }), /not cached/);
  });
});

test('long Retry-After is persisted and prevents repeated quota requests', async () => {
  await withCache(async cache => {
    let calls = 0;
    const api = createApi({ token: 'test-token', cache, request: async () => {
      calls++;
      return new Response('', { status: 429, headers: { 'Retry-After': '86400' } });
    }, pause: () => { throw new Error('Must not wait for a day'); } });
    await assert.rejects(api('/files/test'), /rate limit/);
    await assert.rejects(api('/files/test'), /rate limit/);
    assert.equal(calls, 1);
  });
});

test('Retry-After accepts both seconds and HTTP dates', () => {
  assert.equal(retryDelay('2'), 2000);
  assert.equal(retryDelay('Thu, 01 Jan 1970 00:01:00 GMT', 0), 60000);
  assert.equal(retryDelay(null), 60000);
});
