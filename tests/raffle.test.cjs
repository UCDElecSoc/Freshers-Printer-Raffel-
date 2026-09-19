const test = require('node:test');
const assert = require('node:assert/strict');
const { findColumn, participantsFromRows, randomIndex } = require('../raffle.js');
const XLSX = require('../vendor/xlsx.full.min.js');

test('recognizes exported, Luma and Chinese headings', () => {
  assert.equal(findColumn(['Student Number', 'Name', 'Email'], 'name'), 1);
  assert.equal(findColumn(['Please enter your student number'], 'student'), 0);
  assert.equal(findColumn(['学号', '名字', '邮箱'], 'name'), 1);
  assert.equal(findColumn(['Full Name'], 'name'), 0);
  assert.equal(findColumn(['Other'], 'name'), -1);
});
test('deduplicates identifiers but retains people sharing a name', () => {
  const result = participantsFromRows([
    ['Student Number', 'Name', 'Email'],
    ['001', 'Alex', 'A@example.com'],
    ['001', 'Alex copy', 'other@example.com'],
    ['002', 'Alex', 'b@example.com'],
    ['003', 'Repeated email', ' a@EXAMPLE.com '],
    ['', 'Without ID', ''], ['', '', 'missing@example.com'], ['', '', '']
  ], 1);
  assert.deepEqual(result.participants.map(p => p.name), ['Alex', 'Alex', 'Without ID']);
  assert.equal(result.skipped, 1);
  assert.equal(result.duplicates, 2);
});
test('CSV preserves Unicode, quoted commas, leading zeros and newlines', () => {
  const book = XLSX.read('\ufeffStudent Number,Name,Email\r\n001,"Li, 明",li@example.com\r\n002,"Alex\nSmith",alex@example.com', { type: 'string', raw: true });
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, raw: false });
  assert.equal(rows[1][0], '001');
  assert.deepEqual(participantsFromRows(rows, 1).participants.map(p => p.name), ['Li, 明', 'Alex\nSmith']);
});
test('reads XLSX and XLS with multiple worksheets', () => {
  for (const bookType of ['xlsx', 'biff8']) {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Notes'], ['Not the roster']]), 'Notes');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Name', 'Student Number'], ['Example One', '001'], ['Example Two', '002']]), 'Guests');
    const parsed = XLSX.read(XLSX.write(book, { type: 'buffer', bookType }), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(parsed.Sheets.Guests, { header: 1, raw: false });
    assert.equal(participantsFromRows(rows, 0).participants.length, 2);
  }
});
test('rejects biased tail and reaches both ends', () => {
  const samples = [0xffffffff, 23]; let calls = 0;
  assert.equal(randomIndex(24, { getRandomValues(array) { array[0] = samples[calls++]; } }), 23);
  assert.equal(calls, 2);
  assert.equal(randomIndex(24, { getRandomValues(array) { array[0] = 0; } }), 0);
  assert.equal(randomIndex(1, { getRandomValues(array) { array[0] = 0xffffffff; } }), 0);
  assert.throws(() => randomIndex(0));
});
test('each participant receives equally many accepted random values', () => {
  const counts = Array(24).fill(0);
  for (let sample = 0; sample < 240; sample++) counts[randomIndex(24, { getRandomValues(array) { array[0] = sample; } })]++;
  assert.deepEqual(counts, Array(24).fill(10));
});
