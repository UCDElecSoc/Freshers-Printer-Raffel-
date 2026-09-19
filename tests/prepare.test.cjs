const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepare } = require('../prepare.cjs');

test('local launcher reloads the file, exports names only and clears stale data on failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elecsoc-raffle-'));
  const source = path.join(dir, 'guests.csv');
  const output = path.join(dir, 'participants.js');
  try {
    fs.writeFileSync(source, 'Student Number,Name,Email\n001,Test Alex,alex@example.com\n002,Test Morgan,morgan@example.com\n');
    assert.equal(prepare(source, dir).participants.length, 2);
    let serialized = fs.readFileSync(output, 'utf8');
    assert.ok(serialized.includes('Test Alex'));
    assert.ok(!serialized.includes('example.com'));
    assert.ok(!serialized.includes('001'));
    fs.writeFileSync(source, 'Name\nUpdated Name\n');
    assert.equal(prepare(source, dir).participants.length, 1);
    serialized = fs.readFileSync(output, 'utf8');
    assert.ok(serialized.includes('Updated Name'));
    assert.ok(!serialized.includes('Test Alex'));
    fs.writeFileSync(source, 'Name\n');
    assert.throws(() => prepare(source, dir), /No participants/);
    assert.equal(fs.existsSync(output), false);
    fs.writeFileSync(output, 'stale');
    assert.throws(() => prepare(path.join(dir, 'missing.csv'), dir));
    assert.equal(fs.existsSync(output), false);
  } finally {
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  }
});
