/* MOLMS Financial Dashboard Simple Presentation V1
 * Presentation only: underlying financial calculations and workflows remain authoritative.
 * Executive summaries stay visible; detailed registers and charts stay off the landing view.
 */
(function () {
  'use strict';
  if (window.MOLMSFinancialDashboardSimpleV1 && window.MOLMSFinancialDashboardSimpleV1.version >= 11) return;
  window.MOLMSFinancialDashboardSimpleV1 = { version: 11, applied: false };
  const styleId = 'molms-financial-dashboard-simple-v1-style';

  function installStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #page-findash #fdKpiRow { display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;align-items:stretch!important;gap:10px!important;padding:12px 20px!important;margin:0 0 12px!important; }
      #page-findash #fdKpiRow>* { min-width:0!important;width:auto!important;max-width:none!important;margin:0!important;padding:14px 14px!important;box-sizing:border-box!important;border:1px solid #e4ddd2!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(16,35,59,.045)!important;background:#fff!important; }
      #page-findash #fdKpiRow>div:nth-child(5) { border:1px solid #b8d8c5!important;background:#f3faf5!important;box-shadow:0 3px 10px rgba(28,110,65,.08)!important; }
      #page-findash>div[style*="overflow-y:auto"] { padding:16px 20px!important; }
      #page-findash .fd-simple-quick-actions { display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:12px; }
      #page-findash .fd-simple-quick-actions strong { font-size:11px;color:var(--navy);margin-right:4px; }
      #page-findash .fd-simple-quick-actions button { font-size:12px!important; }
      #page-findash .fd-simple-summary { display:grid;gap:8px;margin-top:8px; }
      #page-findash .fd-simple-summary-item { display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #edf0f2;font-size:12px;line-height:1.35; }
      #page-findash .fd-simple-summary-item:last-child { border-bottom:0; }
      #page-findash .fd-simple-summary-label { min-width:0;overflow-wrap:anywhere;color:#344054; }
      #page-findash .fd-simple-summary-value { flex:0 0 auto;text-align:right;font-weight:700;color:#182230; }
      #page-findash .fd-simple-summary-note { display:block;color:#667085;font-size:11px;font-weight:400;margin-top:2px; }
      @media(max-width:1250px){#page-findash #fdKpiRow{grid-template-columns:repeat(3,minmax(0,1fr))!important}}\n      @media(max-width:760px){#page-findash #fdKpiRow{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:12px!important;gap:8px!important}#page-findash #fdKpiRow>*{padding:11px!important}#page-findash>div[style*="overflow-y:auto"]{padding:12px!important}}
      @media(max-width:420px){#page-findash #fdKpiRow{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function dashboardCardFor(el, scroll) {
    let node = el;
    while (node && node.parentElement && node.parentElement !== scroll) {
      if (node.matches && node.matches('div') &&
          /border-radius:\s*12px/i.test(node.getAttribute('style') || '') &&
          /background:\s*#fff/i.test(node.getAttribute('style') || '')) return node;
      node = node.parentElement;
    }
    return node && node.parentElement === scroll ? node : null;
  }

  function textOf(cell) {
    return String(cell && (cell.innerText || cell.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function compactTable(id, page) {
    const target = page.querySelector('#' + id);
    if (!target) return;
    const table = target.matches('table') ? target : target.querySelector('table');
    if (!table) return;
    let list = target.querySelector(':scope > .fd-simple-summary');
    if (!list) {
      list = document.createElement('div');
      list.className = 'fd-simple-summary';
      list.setAttribute('aria-label', 'Financial summary');
      table.insertAdjacentElement('afterend', list);
    }
    const rows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.querySelectorAll('td').length);
    const items = rows.slice(0, 5).map(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(textOf).filter(Boolean);
      if (!cells.length) return '';
      const label = cells[0] || 'Item';
      const value = cells.length > 1 ? cells[cells.length - 1] : '';
      const note = cells.length > 2 ? cells.slice(1, -1).join(' · ') : '';
      return '<div class="fd-simple-summary-item"><span class="fd-simple-summary-label">' +
        escapeHtml(label) + (note ? '<span class="fd-simple-summary-note">' + escapeHtml(note) + '</span>' : '') +
        '</span><span class="fd-simple-summary-value">' + escapeHtml(value) + '</span></div>';
    }).filter(Boolean);
    const summaryHtml = items.length ? items.join('') :
      '<div class="fd-simple-summary-item"><span class="fd-simple-summary-label">No summary entries for this period.</span></div>';
    if (list.innerHTML !== summaryHtml) list.innerHTML = summaryHtml;
    table.style.display = 'none';
    list.style.display = 'grid';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function apply() {
    const page = document.getElementById('page-findash');
    if (!page) return;
    installStyle();
    const scroll = Array.from(page.children).find(el => /overflow-y:\s*auto/i.test(el.getAttribute('style') || ''));
    if (!scroll) return;

    // Apply visual hierarchy without moving dashboard nodes; avoids mutation-observer loops.
    const kpiRow = page.querySelector('#fdKpiRow');
    if (kpiRow) {
      kpiRow.style.setProperty('display', 'grid', 'important');
      kpiRow.style.setProperty('grid-template-columns', 'repeat(5,minmax(0,1fr))', 'important');
      kpiRow.style.setProperty('align-items', 'stretch', 'important');
      kpiRow.setAttribute('aria-label', 'Financial key performance indicators');
    }

    const manualBody = page.querySelector('#fdManualBody');
    const manualCard = manualBody && dashboardCardFor(manualBody, scroll);
    if (manualCard && !page.querySelector('.fd-simple-quick-actions')) {
      const sourceButtons = Array.from(manualCard.querySelectorAll('button[onclick*="fdOpenManualModal"]'));
      if (sourceButtons.length) {
        const actions = document.createElement('div');
        actions.className = 'fd-simple-quick-actions';
        actions.innerHTML = '<strong>MANUAL FINANCIAL TRANSACTIONS</strong>';
        sourceButtons.forEach((button, index) => {
          const copy = button.cloneNode(true);
          copy.textContent = index === 0 ? '+ Manual Revenue Transaction' : '+ Manual Expenditure Transaction';
          copy.removeAttribute('id');
          actions.appendChild(copy);
        });
        const obligations = page.querySelector('#fdPriorityRowV7') || page.querySelector('#fdMonthlyObligations');
        const anchor = obligations ? (obligations.closest('#fdPriorityRowV7') || obligations) : page.querySelector('#fdKpiRow');
        if (anchor && anchor.parentElement === scroll) anchor.insertAdjacentElement('afterend', actions);
        else scroll.insertBefore(actions, scroll.firstChild);
      }
    }

    // Normalize any older quick-action strip that may have been rendered by a legacy dashboard script.
    const legacyActions = Array.from(page.querySelectorAll('.fd-simple-quick-actions, [class*="quick-action"]')).find(el => /Other Revenue/i.test(textOf(el)) && /Other Expenditure/i.test(textOf(el)));
    if (legacyActions) {
      const oldButtons = Array.from(legacyActions.querySelectorAll('button'));
      legacyActions.querySelector('strong')?.replaceChildren(document.createTextNode('MANUAL FINANCIAL TRANSACTIONS'));
      oldButtons.forEach((button, index) => {
        const label = index === 0 ? '+ Manual Revenue Transaction' : '+ Manual Expenditure Transaction';
        if (button.textContent.trim() !== label) button.textContent = label;
      });
    }

    // Keep only the detailed registers and chart-like analytics out of the landing view.
    ['fdRegBody','fdTimeline','fdRevByType','fdExpByCategory'].forEach(id => {
      const el = page.querySelector('#' + id);
      if (!el) return;
      const card = dashboardCardFor(el, scroll);
      if (card && card !== scroll && card !== page.querySelector('#fdPriorityRowV7')) card.style.display = 'none';
    });

    // Restore the complete manual financial transactions card and its saved entries.
    const restoredManualBody = page.querySelector('#fdManualBody');
    if (restoredManualBody) {
      const restoredManualCard = dashboardCardFor(restoredManualBody, scroll);
      if (restoredManualCard && restoredManualCard !== scroll) restoredManualCard.style.display = '';
      restoredManualBody.style.display = '';
    }

    // Replace dense tabular bodies with short management lists while preserving source data.
    ['fdExpenseBody','fdBudgetBody','fdTopClients','fdMatterLeaderboard'].forEach(id => compactTable(id, page));

    // Keep practice performance visible; it contains decision-useful management context.
    const practice = page.querySelector('#fdPracticePerformance');
    if (practice) {
      const card = dashboardCardFor(practice, scroll);
      if (card && card !== scroll) card.style.display = '';
    }
    window.MOLMSFinancialDashboardSimpleV1.applied = true;
  }

  function start() {
    apply();
    const page = document.getElementById('page-findash');
    if (!page || window.MOLMSFinancialDashboardSimpleV1.observer) return;
    const observer = new MutationObserver(() => apply());
    observer.observe(page, { childList:true, subtree:true });
    window.MOLMSFinancialDashboardSimpleV1.observer = observer;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
  window.addEventListener('load', start, { once:true });
})();