(function (root) {
  'use strict';
  const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = {
    name: ['name', 'fullname', '姓名', '名字', '学生姓名'],
    student: ['studentnumber', 'studentid', 'pleaseenteryourstudentnumber', '学号', '学生号'],
    email: ['email', 'emailaddress', '邮箱', '电子邮箱']
  };
  function findColumn(headers, type) {
    return headers.findIndex(header => aliases[type].includes(normalize(header)));
  }
  function participantsFromRows(rows, nameIndex) {
    if (!rows.length || nameIndex < 0) return { participants: [], skipped: 0, duplicates: 0 };
    const studentIndex = findColumn(rows[0], 'student');
    const emailIndex = findColumn(rows[0], 'email');
    const seenStudents = new Set(), seenEmails = new Set();
    const participants = [];
    let skipped = 0, duplicates = 0;
    for (const row of rows.slice(1)) {
      if (!row.some(cell => String(cell ?? '').trim())) continue;
      const name = String(row[nameIndex] ?? '').trim();
      if (!name) { skipped++; continue; }
      const student = String(row[studentIndex] ?? '').trim().toLowerCase();
      const email = String(row[emailIndex] ?? '').trim().toLowerCase();
      const duplicate = (student && seenStudents.has(student)) || (email && seenEmails.has(email));
      if (student) seenStudents.add(student);
      if (email) seenEmails.add(email);
      if (duplicate) { duplicates++; continue; }
      participants.push({ name });
    }
    return { participants, skipped, duplicates };
  }
  // Reject the incomplete top bucket so modulo does not bias the distribution.
  function randomIndex(length, cryptoProvider = root.crypto) {
    if (!Number.isInteger(length) || length < 1 || length > 0x100000000) throw new Error('Invalid participant count.');
    const limit = Math.floor(0x100000000 / length) * length;
    const sample = new Uint32Array(1);
    do { cryptoProvider.getRandomValues(sample); } while (sample[0] >= limit);
    return sample[0] % length;
  }
  const api = { findColumn, participantsFromRows, randomIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Raffle = api;
})(globalThis);
