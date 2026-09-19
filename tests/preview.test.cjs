const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPreviewServer } = require('../preview.cjs');

test('preview reloads saved names and never serves stale or private fields', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raffle-preview-'));
  const source = path.join(dir, 'guests.csv');
  const server = createPreviewServer(source);
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    fs.writeFileSync(source, 'Name,Email\nFirst,first@example.com\nSecond,second@example.com\n');
    const response = await fetch(base + '/.local/participants.js');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const first = await response.text();
    assert.ok(first.includes('First') && first.includes('Second'));
    assert.ok(!first.includes('@'));
    fs.writeFileSync(source, 'Name\nUpdated\n');
    const second = await (await fetch(base + '/.local/participants.js')).text();
    assert.ok(second.includes('Updated') && !second.includes('First'));
    fs.unlinkSync(source);
    assert.equal(await (await fetch(base + '/.local/participants.js')).text(), 'window.RAFFLE_DATA = null;');
    assert.equal((await fetch(base + '/.git/config')).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (fs.existsSync(source)) fs.unlinkSync(source);
    fs.rmdirSync(dir);
  }
});
