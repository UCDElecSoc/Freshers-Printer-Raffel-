'use strict';
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('./vendor/xlsx.full.min.js');
const { findColumn, participantsFromRows } = require('./raffle.js');

function getDefaultSource() {
  const config = path.join(__dirname, '.local', 'roster-path.txt');
  if (fs.existsSync(config)) {
    const selected = fs.readFileSync(config, 'utf8').trim();
    if (selected) return path.resolve(__dirname, selected);
  }
  return path.join(__dirname, 'eligible-participants.csv');
}

function readParticipants(filePath) {
  if (!/\.(csv|xlsx|xls)$/i.test(filePath)) throw new Error('Please use a CSV, XLSX or XLS file.');
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > 5 * 1024 * 1024) throw new Error('The guest list must be smaller than 5 MB.');
  const workbook = /\.csv$/i.test(filePath)
    ? XLSX.read(buffer.toString('utf8'), { type: 'string', raw: true })
    : XLSX.read(buffer, { type: 'buffer' });
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false, blankrows: false });
    if (!rows.length) continue;
    const nameIndex = findColumn(rows[0], 'name');
    if (nameIndex < 0) continue;
    const result = participantsFromRows(rows, nameIndex);
    if (result.participants.length) return result;
  }
  throw new Error('No participants found. Use a Name column with at least one name.');
}

function prepare(source, outputDirectory = path.join(__dirname, '.local')) {
  const output = path.join(outputDirectory, 'participants.js');
  fs.mkdirSync(outputDirectory, { recursive: true });
  // A failed refresh must never leave yesterday's list available for a new draw.
  fs.rmSync(output, { force: true });
  const result = readParticipants(source);
  fs.writeFileSync(output, `window.RAFFLE_DATA = ${JSON.stringify({ participants: result.participants })};\n`, 'utf8');
  return result;
}

if (require.main === module) {
  const source = path.resolve(process.argv[2] || getDefaultSource());
  try {
    const result = prepare(source);
    console.log(`Ready: ${result.participants.length} participants. ${result.duplicates} duplicates removed. ${result.skipped} unnamed rows skipped.`);
  } catch (error) {
    console.error(`Cannot load the guest list: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { readParticipants, prepare, getDefaultSource };
