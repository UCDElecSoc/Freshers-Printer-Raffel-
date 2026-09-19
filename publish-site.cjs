'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readParticipants, getDefaultSource } = require('./prepare.cjs');
const source = process.argv[2] ? path.resolve(process.argv[2]) : getDefaultSource();
const { participants } = readParticipants(source);
const output = path.join(__dirname, 'docs');
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
for (const file of ['app.js', 'raffle.js', 'styles.css', 'assets/printer.png', 'assets/elecsoc-logo.png', 'assets/tiki-tiki.mp3']) {
  fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
}
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace('src=".local/participants.js"', 'src="participants.js"');
fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, 'participants.js'), `window.RAFFLE_DATA = ${JSON.stringify({ participants })};\n`);
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Prepared GitHub Pages site: ${participants.length} names. No email addresses or student numbers exported.`);
