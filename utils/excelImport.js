/**
 * Excel Question Import Utility
 * ==============================
 * Parses an uploaded .xlsx/.xls file into question objects.
 *
 * Expected columns (row 1 = headers):
 *   Question | Option A | Option B | Option C | Option D | Correct Answer | Marks | Explanation
 *
 * Correct Answer accepts: A / B / C / D  or  1 / 2 / 3 / 4  or  0 / 1 / 2 / 3
 */

const XLSX = require('xlsx');

function parseCorrectAnswer(val) {
  if (val === undefined || val === null || val === '') return 0;
  const s = String(val).trim().toUpperCase();
  if (s === 'A' || s === '1') return 0;
  if (s === 'B' || s === '2') return 1;
  if (s === 'C' || s === '3') return 2;
  if (s === 'D' || s === '4') return 3;
  const n = parseInt(s);
  if (!isNaN(n) && n >= 0 && n <= 3) return n;
  return 0;
}

function parseExcelQuestions(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const questions = [];
  const errors = [];

  rows.forEach((row, idx) => {
    const lineNo = idx + 2; // +2 because row 1 is header

    const get = (...keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
        if (found !== undefined && row[found] !== '') return String(row[found]).trim();
      }
      return '';
    };

    const question    = get('question', 'q', 'question text');
    const optA        = get('option a', 'a', 'opt a', 'option_a');
    const optB        = get('option b', 'b', 'opt b', 'option_b');
    const optC        = get('option c', 'c', 'opt c', 'option_c');
    const optD        = get('option d', 'd', 'opt d', 'option_d');
    const correct     = get('correct answer', 'correct', 'answer', 'correct_answer');
    const marks       = get('marks', 'mark', 'score');
    const explanation = get('explanation', 'explain', 'reason');

    if (!question) { errors.push(`Row ${lineNo}: Question is empty — skipped.`); return; }
    if (!optA || !optB || !optC || !optD) { errors.push(`Row ${lineNo}: One or more options missing — skipped.`); return; }

    questions.push({
      question,
      options:       [optA, optB, optC, optD],
      correctAnswer: parseCorrectAnswer(correct),
      marks:         Math.max(1, parseInt(marks) || 1),
      explanation
    });
  });

  return { questions, errors };
}

module.exports = { parseExcelQuestions };
