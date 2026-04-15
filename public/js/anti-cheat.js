/**
 * APARAITECH Test Portal — Anti-Cheat Module
 * ===========================================
 * Standalone JS included on the test page.
 * All core logic is embedded directly in test.ejs for reliability,
 * but this file can extend or override behaviors if needed.
 *
 * Features enforced in test.ejs:
 *  1. Fullscreen enforcement
 *  2. Tab-switch detection (visibilitychange + blur)
 *  3. Right-click disabled
 *  4. Copy/Cut/Paste disabled
 *  5. Keyboard shortcut blocking (F12, Ctrl+U, etc.)
 *  6. beforeunload auto-submit
 *  7. Timer-based auto-submit
 *  8. 3-warning auto-submit
 */

// Additional protection: Disable drag
document.addEventListener('dragstart', e => e.preventDefault());

// Disable text selection via mouse
document.addEventListener('selectstart', e => e.preventDefault());

// Disable printing during test (Ctrl+P)
window.addEventListener('beforeprint', e => {
  e.preventDefault();
  return false;
});

console.log('%cAPARAITECH Anti-Cheat Active', 'color:#0d47a1;font-weight:bold;font-size:14px;');
console.log('%cWarning: This session is monitored.', 'color:red;font-weight:bold;');
