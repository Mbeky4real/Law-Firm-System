/* MOLMS budget approval legacy-handler guard.
 * Prevent older inline approval buttons from reporting success without
 * passing through the verified database-update handler.
 */
(function () {
  'use strict';
  if (window.__molmsBudgetApprovalLegacyGuard) return;
  window.__molmsBudgetApprovalLegacyGuard = true;
  document.addEventListener('click', function (event) {
    const target = event.target && event.target.closest
      ? event.target.closest('button, [role="button"], input[type="button"], input[type="submit"]')
      : null;
    if (!target) return;
    if (target.hasAttribute('data-bd-finalize')) return;
    const label = String(target.innerText || target.value || target.getAttribute('aria-label') || '').trim();
    if (!/approve reviewed budget|reviewed budget approved/i.test(label)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    const panel = document.getElementById('bdPanelActions');
    const id = (panel && panel.dataset && panel.dataset.bdBudgetId) ||
      (typeof window._bdActiveId !== 'undefined' ? window._bdActiveId : null);
    if (typeof window.bdFinalizeBudget !== 'function') {
      if (typeof window.notice === 'function') window.notice('Verified budget approval handler is not loaded. Reload MOLMS and try again.', 'err');
      console.error('[MOLMS budget approval guard] Verified handler unavailable.');
      return;
    }
    window.bdFinalizeBudget(id);
  }, true);
})();