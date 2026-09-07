/**
 * APARAITECH — Server-Side Question Code Formatter
 * =================================================
 * Renders raw coding questions into line-by-line numbered,
 * syntax-highlighted editor boxes directly during SSR.
 */

const hljs = require('highlight.js');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function detectLanguage(code) {
  if (/\bcout\s*<<|\bcin\s*>>|\bstd::|<iostream>|<vector>|<bits\/stdc\+\+\.h>/i.test(code)) return 'cpp';
  if (/#include\b|\bprintf\s*\(|\bscanf\s*\(|\bint\s+main\s*\(/i.test(code)) return 'c';
  if (/\bpublic\s+class\b|\bSystem\.out\.(print|println)\b|\bpublic\s+static\s+void\s+main\b|\bString\[\]\s+args\b/i.test(code)) return 'java';
  if (/\bdef\s+[a-zA-Z_]\w*\s*\(|\bprint\s*\(|\belif\b|\bimport\s+[a-zA-Z_]|\bfrom\s+[a-zA-Z_]+.*import/i.test(code)) return 'python';
  if (/\bconsole\.log\s*\(|\bconst\s+[a-zA-Z_]|\blet\s+[a-zA-Z_]|\bfunction\s*[a-zA-Z_]*\s*\(|=>\s*\{/i.test(code)) return 'javascript';
  if (/\bSELECT\b[\s\S]*?\bFROM\b|\bINSERT\s+INTO\b|\bCREATE\s+TABLE\b|\bUPDATE\b[\s\S]*?\bSET\b/i.test(code)) return 'sql';
  if (/<!DOCTYPE\s+html|<html[\s>]|<div[\s>]|<head[\s>]/i.test(code)) return 'html';
  if (/<\?php/i.test(code)) return 'php';
  return 'plaintext';
}

function highlightSnippet(code, lang) {
  try {
    if (lang && lang !== 'plaintext' && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch (e) {
    return escapeHtml(code);
  }
}

function renderCodeBlockHtml(rawCode, rawLang) {
  const cleanCode = rawCode.replace(/^\r?\n+|\r?\n+$/g, '');
  const detectedLang = (rawLang && rawLang.trim()) ? rawLang.trim().toLowerCase() : detectLanguage(cleanCode);

  const highlighted = highlightSnippet(cleanCode, detectedLang);

  return `
<div class="question-code-wrapper my-2">
  <pre class="question-code-block"><code class="hljs language-${escapeHtml(detectedLang)}">${highlighted}</code></pre>
</div>`;
}

function formatProse(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);
  // Inline code `code`
  escaped = escaped.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  // Break into paragraphs
  const paragraphs = escaped.split(/\r?\n\r?\n/);
  return paragraphs.map(p => {
    const clean = p.trim().replace(/\r?\n/g, '<br>');
    return clean ? `<p class="q-prose mb-2">${clean}</p>` : '';
  }).join('');
}

function cleanQuestionText(text) {
  if (!text) return '';
  let str = String(text);
  // Remove bracket sentences after question marks e.g. "What is JVM? [Set 1]" -> "What is JVM?" or "? (Choose one)" -> "?"
  str = str.replace(/\?\s*(\[[^\]]+\]|\([^\)]+\))/g, '?');
  // Remove trailing bracket sentences at the end of the text e.g. ": [Set 1]" -> ":" or "... [DevOps 45]" -> "..."
  str = str.replace(/\s*(\[[^\]]+\]|\([^\)]+\))\s*$/g, '');
  str = str.replace(/([:;\.!?])\s*(\[[^\]]+\]|\([^\)]+\))/g, '$1');
  return str.trim();
}

function formatQuestion(raw, options = {}) {
  if (!raw) return '';
  raw = cleanQuestionText(raw);

  // 1. Check for markdown code fences: ```[lang]\n...\n```
  const fenceRegex = /```([a-zA-Z0-9_\-+]*)\r?\n([\s\S]*?)```/g;
  if (fenceRegex.test(raw)) {
    fenceRegex.lastIndex = 0;
    let html = '';
    let lastIdx = 0;
    let match;
    while ((match = fenceRegex.exec(raw)) !== null) {
      if (match.index > lastIdx) {
        html += formatProse(raw.substring(lastIdx, match.index));
      }
      html += renderCodeBlockHtml(match[2], match[1], options);
      lastIdx = fenceRegex.lastIndex;
    }
    if (lastIdx < raw.length) {
      html += formatProse(raw.substring(lastIdx));
    }
    return html;
  }

  // 2. Check for multi-line raw code (without fences)
  const lines = raw.split(/\r?\n/);
  if (lines.length > 1) {
    const isCodeLine = (l) => {
      const trimmed = l.trim();
      if (!trimmed) return null; // blank line inside code
      if (/^(#include|import |from |using |package |public |private |protected |class |interface |def |function |void |int |float |double |char |bool |boolean |String |const |let |var |console\.|printf|scanf|cout|cin|System\.out|echo |print\(|SELECT |INSERT |UPDATE |DELETE |CREATE |FROM |WHERE |for\s*\(|while\s*\(|if\s*\(|switch\s*\(|return\b|\/\/|\/\*|\*|\{|\}|<\?php|<!DOCTYPE)/i.test(trimmed)) {
        return true;
      }
      if (/[;{}]$/.test(trimmed) && trimmed.length > 2 && !/^(what|which|how|why|when|where|find|in|predict|explain|consider)\b/i.test(trimmed)) {
        return true;
      }
      if (l.startsWith('    ') || l.startsWith('\t')) return true;
      return false;
    };

    let firstCodeIdx = -1;
    let lastCodeIdx = -1;
    let codeLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const c = isCodeLine(lines[i]);
      if (c === true) {
        if (firstCodeIdx === -1) firstCodeIdx = i;
        lastCodeIdx = i;
        codeLineCount++;
      }
    }

    const hasSignature = lines.some(l => /^(#include|public\s+class|def\s+|void\s+main|int\s+main|<!DOCTYPE|<\?php)/i.test(l.trim()));

    if ((codeLineCount >= 1 || hasSignature) && firstCodeIdx !== -1) {
      const textBefore = lines.slice(0, firstCodeIdx).join('\n');
      const codeText   = lines.slice(firstCodeIdx, lastCodeIdx + 1).join('\n');
      const textAfter  = lines.slice(lastCodeIdx + 1).join('\n');

      let html = '';
      if (textBefore.trim()) html += formatProse(textBefore);
      html += renderCodeBlockHtml(codeText, detectLanguage(codeText));
      if (textAfter.trim()) html += formatProse(textAfter);
      return html;
    }
  }

  // 3. Fallback: prose with inline code
  return formatProse(raw);
}

module.exports = {
  formatQuestion,
  detectLanguage,
  renderCodeBlockHtml,
  formatProse,
  escapeHtml
};
