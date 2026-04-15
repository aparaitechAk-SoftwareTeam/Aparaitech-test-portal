/**
 * APARAITECH Test Portal — Main Client JS
 * ========================================
 * General UI enhancements for all pages.
 */

document.addEventListener('DOMContentLoaded', function () {

  // Auto-dismiss alerts after 5 seconds
  document.querySelectorAll('.alert.alert-dismissible').forEach(alert => {
    setTimeout(() => {
      try { bootstrap.Alert.getOrCreateInstance(alert).close(); } catch(e) {}
    }, 5000);
  });

  // Tooltip initialization
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    new bootstrap.Tooltip(el);
  });

  // Add loading spinners to submit buttons
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function () {
      const btn = this.querySelector('button[type="submit"]:not([data-no-loading])');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Please wait...';
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 10000);
      }
    });
  });

});
