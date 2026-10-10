/* MOLMS Budget Final Approval V4: explicit update and persistence verification. */
(function () {
  'use strict';
  if (window.__budgetFinalApprovalV4) return;
  window.__budgetFinalApprovalV4 = true;

  function getId() {
    var panel = document.getElementById('bdPanelActions');
    return (panel && panel.dataset.bdBudgetId) || window._bdActiveId || null;
  }
  function getLines() {
    return Array.isArray(window._bdLines) ? window._bdLines : [];
  }
  function partner() {
    return String(window.authRole || (typeof authRole !== 'undefined' ? authRole : '')).toLowerCase() === 'partner';
  }
  function message(text, type) {
    if (typeof window.notice === 'function') window.notice(text, type);
    else if (typeof notice === 'function') notice(text, type);
    else window.alert(text);
  }
  async function approve(id) {
    try {
      if (!partner()) throw new Error('Only a Partner can approve a budget.');
      var docId = id || getId();
      if (!docId) throw new Error('No selected budget ID was found. Close and reopen the budget.');
      if (!getLines().some(function (line) { return String(line.status || '').toLowerCase() === 'approved'; })) {
        throw new Error('Approve at least one budget line before final approval.');
      }
      var client = (typeof sb !== 'undefined' && sb) || window.sb;
      if (!client || !client.from) throw new Error('Budget database connection is unavailable.');
      if (!window.confirm('Approve this budget document? Line decisions will remain unchanged.')) return;
      var payload = { status: 'approved', updated_at: new Date().toISOString() };
      var user = window.authUser || (typeof authUser !== 'undefined' ? authUser : null);
      if (user && user.id) payload.updated_by = user.id;

      var write = await client.from('budget_documents').update(payload).eq('id', docId).select('id,status').maybeSingle();
      if (write.error) throw new Error('Database update failed: ' + write.error.message);
      if (!write.data) {
        var current = await client.from('budget_documents').select('id,status').eq('id', docId).maybeSingle();
        if (current.error) throw new Error('Cannot verify budget status: ' + current.error.message);
        throw new Error('Database updated no row. Current status: ' + (current.data ? current.data.status : 'record not found') + '. Check Partner permissions and active project.');
      }
      var check = await client.from('budget_documents').select('id,status').eq('id', docId).maybeSingle();
      if (check.error) throw new Error('Status verification failed: ' + check.error.message);
      if (!check.data || String(check.data.status).toLowerCase() !== 'approved') throw new Error('Status did not persist. Database status: ' + (check.data ? check.data.status : 'record not found'));
      try { if (typeof bdRecordAudit === 'function') await bdRecordAudit('approved', 'Budget document approved by Partner.'); } catch (e) { console.error('Budget audit failed', e); }
      if (typeof bdLoadDocs === 'function') await bdLoadDocs();
      if (typeof bdRenderKpiCards === 'function') bdRenderKpiCards();
      if (typeof bdRenderList === 'function') bdRenderList();
      if (typeof bdOpenDocument === 'function') await bdOpenDocument(docId);
      message('Approved: database status verified.');
    } catch (e) {
      console.error('[Budget approval V4]', e);
      message('Budget approval failed: ' + (e && e.message ? e.message : String(e)), 'err');
    }
  }
  window.bdFinalizeBudget = approve;
  function install() {
    var panel = document.getElementById('bdPanelActions');
    if (!panel) return;
    var prior = panel.querySelector('[data-bd-finalize]');
    if (prior) prior.remove();
    if (!partner() || !getLines().some(function (line) { return String(line.status || '').toLowerCase() === 'approved'; })) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn gold';
    button.setAttribute('data-bd-finalize', '1');
    button.textContent = '✓ Approve Reviewed Budget';
    button.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); approve(getId()); });
    panel.appendChild(button);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  var observer = new MutationObserver(install);
  observer.observe(document.body, { childList: true, subtree: true });
})();