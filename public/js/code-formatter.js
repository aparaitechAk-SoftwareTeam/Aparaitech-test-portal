/**
 * APARAITECH — Universal Question Code Formatter
 * ================================================
 * Formats question text with line-by-line numbered code blocks,
 * syntax highlighting, copy button, and inline code formatting.
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isStudentTestPage() {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.includes('/student/test') ||
           document.body.classList.contains('student-test-active') ||
           document.getElementById('timerDisplay') !== null;
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
    if (typeof window !== 'undefined' && typeof window.hljs !== 'undefined') {
      try {
        if (lang && lang !== 'plaintext' && window.hljs.getLanguage(lang)) {
          return window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        } else {
          return window.hljs.highlightAuto(code).value;
        }
      } catch (e) {
        console.warn('hljs error, falling back to escaped text:', e);
      }
    }
    return escapeHtml(code);
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

  function cleanQuestionText(text) {
    if (!text) return '';
    let str = String(text);
    str = str.replace(/\?\s*(\[[^\]]+\]|\([^\)]+\))/g, '?');
    str = str.replace(/\s*(\[[^\]]+\]|\([^\)]+\))\s*$/g, '');
    str = str.replace(/([:;\.!?])\s*(\[[^\]]+\]|\([^\)]+\))/g, '$1');
    return str.trim();
  }

  function parseQuestionToHtml(raw) {
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
        html += renderCodeBlockHtml(match[2], match[1]);
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
        if (!trimmed) return null;
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

  function copyCodeSnippet(button) {
    const box = button.closest('.code-editor-box');
    if (!box) return;
    const codeEl = box.querySelector('.code-content code');
    if (!codeEl) return;

    const codeLines = [];
    box.querySelectorAll('.code-content .code-line').forEach(line => {
      codeLines.push(line.textContent);
    });
    const code = codeLines.length ? codeLines.join('\n') : codeEl.textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        showCopyFeedback(button);
      }).catch(() => fallbackCopy(code, button));
    } else {
      fallbackCopy(code, button);
    }
  }

  function showCopyFeedback(button) {
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check-lg text-success me-1"></i>Copied!';
    button.disabled = true;
    setTimeout(() => {
      button.innerHTML = originalHtml;
      button.disabled = false;
    }, 2000);
  }

  function fallbackCopy(text, button) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showCopyFeedback(button);
    } catch(e) {}
    document.body.removeChild(ta);
  }

  function formatAllQuestions() {
    // Format question texts (skip if already rendered by SSR)
    document.querySelectorAll('.question-text').forEach(el => {
      if (el.dataset.codeFormatted) return;
      if (el.querySelector('.question-code-block') || el.querySelector('.question-code-wrapper') || el.querySelector('.code-editor-box')) {
        el.dataset.codeFormatted = 'true';
        return;
      }
      const raw = el.textContent || el.innerText;
      if (raw && (raw.includes('```') || raw.includes('\n') || raw.includes('`') || /[{};]/.test(raw))) {
        el.innerHTML = parseQuestionToHtml(raw);
        el.dataset.codeFormatted = 'true';
      }
    });

    // Format option labels if they contain code
    document.querySelectorAll('.option-label span:last-child').forEach(span => {
      if (span.dataset.codeFormatted) return;
      const raw = span.textContent || span.innerText;
      if (raw && raw.includes('`')) {
        span.innerHTML = escapeHtml(raw).replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
        span.dataset.codeFormatted = 'true';
      } else if (raw && (/^(return |printf|cout|System\.|SELECT |def |int |var |let )/i.test(raw) || /[;{}]$/.test(raw))) {
        span.classList.add('font-monospace');
        span.dataset.codeFormatted = 'true';
      }
    });

    // Format explanations
    document.querySelectorAll('.explanation-text').forEach(el => {
      if (el.dataset.codeFormatted) return;
      const raw = el.textContent || el.innerText;
      if (raw && (raw.includes('```') || raw.includes('`') || raw.includes('\n'))) {
        el.innerHTML = parseQuestionToHtml(raw);
        el.dataset.codeFormatted = 'true';
      }
    });
  }

  // Export globals
  window.parseQuestionText  = parseQuestionToHtml;
  window.formatAllQuestions = formatAllQuestions;
  window.copyCodeSnippet    = copyCodeSnippet;

  // Auto-run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', formatAllQuestions);
  } else {
    formatAllQuestions();
  }
})();
