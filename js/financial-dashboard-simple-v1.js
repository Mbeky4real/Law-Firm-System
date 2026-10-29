/* MOLMS Financial Dashboard Simple Presentation V1
 * Presentation only: underlying financial calculations and workflows remain authoritative.
 * Executive summaries stay visible; detailed registers and charts stay off the landing view.
 */
(function () {
  'use strict';
  if (window.MOLMSFinancialDashboardSimpleV1 && window.MOLMSFinancialDashboardSimpleV1.version >= 25) return;
  window.MOLMSFinancialDashboardSimpleV1 = {
    version: 26, applied: false,
    showDetails(targetId) {
      const page=document.getElementById('page-findash');
      if(!page)return;
      const target=page.querySelector('#'+targetId);
      if(!target)return;
      const scroll=Array.from(page.children).find(el=>/overflow-y:\s*auto/i.test(el.getAttribute('style')||''));
      const card=scroll?dashboardCardFor(target,scroll):null;
      if(card&&card!==scroll)card.style.setProperty('display','block','important');
      target.style.setProperty('display','block','important');
      if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
      else target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  };
  const styleId = 'molms-financial-dashboard-simple-v1-style';

  function installStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #page-findash #fdKpiRow { display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;align-items:stretch!important;gap:10px!important;padding:12px 20px!important;margin:0 0 12px!important; }
      #page-findash #fdKpiRow>* { min-width:0!important;width:auto!important;max-width:none!important;margin:0!important;padding:14px 14px!important;box-sizing:border-box!important;border:1px solid #e4ddd2!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(16,35,59,.045)!important;background:#fff!important; }
      #page-findash #fdKpiRow>div:nth-child(1) { background:#fff!important;border-color:#e4ddd2!important;box-shadow:0 2px 8px rgba(16,35,59,.045)!important; }
      #page-findash #fdKpiRow>div:nth-child(2) { background:#fff!important;border-color:#e4ddd2!important;box-shadow:0 2px 8px rgba(16,35,59,.045)!important; }
      #page-findash #fdKpiRow>div:nth-child(3) { border:1px solid #b8d8c5!important;background:#f3faf5!important;box-shadow:0 3px 10px rgba(28,110,65,.08)!important; }
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
      /* Manual table styles target the scroll wrapper (an ancestor of the table), not its tbody. */
      #page-findash #fdManualBody { width:auto!important;max-width:none!important;overflow:visible!important;box-sizing:border-box!important; }
      #page-findash .fd-manual-table-scroll { display:block!important;position:relative!important;width:100%!important;max-width:100%!important;height:250px!important;max-height:250px!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-width:auto!important;scrollbar-color:#7b8794 #e8edf1!important;border:1px solid #e4ddd2!important;border-radius:6px!important;box-sizing:border-box!important; }
      #page-findash .fd-manual-table-scroll table { display:table!important;width:1370px!important;min-width:1370px!important;max-width:none!important;table-layout:fixed!important;border-collapse:collapse!important;border-spacing:0!important;font-size:11px!important; }
      #page-findash .fd-manual-table-scroll thead { display:table-header-group!important; }
      #page-findash .fd-manual-table-scroll tbody { display:table-row-group!important;width:auto!important; }
      #page-findash .fd-manual-table-scroll tr { display:table-row!important;width:auto!important; }
      #page-findash .fd-manual-table-scroll th,#page-findash .fd-manual-table-scroll td { display:table-cell!important;float:none!important;position:static!important;flex:none!important;box-sizing:border-box!important;padding:5px 7px!important;line-height:1.2!important;vertical-align:middle!important;border-bottom:1px solid #edf0f2!important; }
      #page-findash .fd-manual-table-scroll thead th { height:34px!important;white-space:nowrap!important;background:#faf9f6!important;color:#667085!important;font-size:10px!important;border-bottom:1px solid #e4ddd2!important;text-align:left!important; }
      #page-findash .fd-manual-table-scroll tbody tr { height:38px!important; }
      #page-findash .fd-manual-table-scroll tbody td { height:38px!important;white-space:normal!important;overflow-wrap:anywhere!important; }
      #page-findash .fd-manual-table-scroll th:nth-child(1),#page-findash .fd-manual-table-scroll td:nth-child(1){width:190px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(2),#page-findash .fd-manual-table-scroll td:nth-child(2){width:90px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(3),#page-findash .fd-manual-table-scroll td:nth-child(3){width:105px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(4),#page-findash .fd-manual-table-scroll td:nth-child(4){width:190px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(5),#page-findash .fd-manual-table-scroll td:nth-child(5){width:180px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(6),#page-findash .fd-manual-table-scroll td:nth-child(6){width:115px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(7),#page-findash .fd-manual-table-scroll td:nth-child(7){width:160px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(8),#page-findash .fd-manual-table-scroll td:nth-child(8){width:150px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(9),#page-findash .fd-manual-table-scroll td:nth-child(9){width:100px!important}
      #page-findash .fd-manual-table-scroll th:nth-child(10),#page-findash .fd-manual-table-scroll td:nth-child(10){width:90px!important}
      #page-findash .fd-manual-table-scroll tbody td button { display:inline-flex!important;align-items:center!important;justify-content:center!important;vertical-align:middle!important;float:none!important;position:static!important;width:28px!important;min-width:28px!important;height:24px!important;min-height:24px!important;margin:0 3px 0 0!important;padding:0!important;line-height:1!important;border-radius:5px!important;font-size:11px!important; }
      #page-findash .fd-manual-table-scroll td:nth-child(6) { white-space:nowrap!important;text-align:right!important;font-weight:600!important; }
      #page-findash .fd-manual-table-scroll td:nth-child(9) { white-space:nowrap!important; }
      #page-findash .fd-manual-table-scroll::-webkit-scrollbar { width:12px!important;height:12px!important;display:block!important; }
      #page-findash .fd-manual-table-scroll::-webkit-scrollbar-thumb { background:#7b8794!important;border:2px solid #e8edf1!important;border-radius:8px!important; }
      #page-findash .fd-manual-table-scroll::-webkit-scrollbar-track { background:#e8edf1!important; }
      #page-findash #fdPracticePerformance { min-width:0!important;overflow-x:auto!important; }
      #page-findash #fdPracticePerformance table { width:100%!important;border-collapse:collapse!important;border-spacing:0!important; }
      #page-findash #fdPracticePerformance th { padding:8px 7px!important;background:#faf9f6!important;color:#667085!important;font-size:10px!important;white-space:nowrap!important; }
      #page-findash #fdPracticePerformance td { padding:8px 7px!important;font-size:11px!important;line-height:1.35!important;border-bottom:1px solid #edf0f2!important; }
      #page-findash #fdPracticePerformance button { font-size:11px!important; }
      #page-findash .fd-compact-workspace { display:block!important;width:100%!important;max-width:100%!important;overflow:visible!important;margin:8px 0 14px!important; }
      #page-findash .fd-compact-workspace-card { display:block!important;min-width:0!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;box-sizing:border-box!important;margin:0 0 14px!important;padding:14px!important;border:1px solid #e4ddd2!important;border-radius:14px!important;background:#fff!important;box-shadow:0 3px 12px rgba(16,35,59,.05)!important; }
      @media(max-width:1250px){#page-findash #fdKpiRow{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:760px){#page-findash #fdKpiRow{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:12px!important;gap:8px!important}#page-findash #fdKpiRow>*{padding:11px!important}#page-findash>div[style*="overflow-y:auto"]{padding:12px!important}}
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

  const revenueCategories = [
    'Legal Fees — Non-Invoiced Legal Tasks',
    'Consultation Fees',
    'Retainer Fees — Direct Receipt',
    'Legal Opinion & Advisory Fees',
    'Drafting & Documentation Fees',
    'Court Attendance & Filing Fees Recovered',
    'Reimbursement of Expenses',
    'Interest Income',
    'Rental Income',
    'Training & Seminar Fees',
    'Commission & Referral Income',
    'Recovery of Bad Debts',
    'Other Operating Income',
    'Other Non-Operating Income',
    'Other'
  ];
  function upgradeRevenueCategory(page) {
    const labels = [...page.querySelectorAll('label')];
    const label = labels.find(el => /revenue category/i.test(el.textContent || ''));
    if (!label) return;
    const id = label.htmlFor;
    let select = id ? page.querySelector('#' + CSS.escape(id)) : null;
    if (!select) {
      const container = label.parentElement;
      select = container && container.querySelector('select');
    }
    if (!select || select.dataset.molmsRevenueCategoriesV12 === '1') return;
    const existing = new Set([...select.options].map(o => (o.textContent || '').trim().toLowerCase()));
    revenueCategories.forEach(name => {
      if (existing.has(name.toLowerCase())) return;
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.dataset.molmsRevenueCategoriesV12 = '1';
  }

  function apply() {
    upgradeRevenueCategory(document.getElementById('page-findash') || document);
    const page = document.getElementById('page-findash');
    if (!page) return;
    installStyle();
    const scroll = Array.from(page.children).find(el => /overflow-y:\s*auto/i.test(el.getAttribute('style') || ''));
    if (!scroll) return;

    // Apply visual hierarchy without moving dashboard nodes; avoids mutation-observer loops.
    const kpiRow = page.querySelector('#fdKpiRow');
    if (kpiRow) {
      kpiRow.style.setProperty('display', 'grid', 'important');
      kpiRow.style.setProperty('grid-template-columns', 'repeat(3,minmax(0,1fr))', 'important');
      kpiRow.style.setProperty('align-items', 'stretch', 'important');
      kpiRow.setAttribute('aria-label', 'Financial key performance indicators');
    }

    // The full Manual Financial Transactions card already provides these actions.
    // Do not create a second quick-action strip with a duplicate heading.
    page.querySelectorAll('.fd-simple-quick-actions').forEach(el => el.remove());

    // Remove any legacy duplicate quick-action strip; keep the full transactions card.
    page.querySelectorAll('.fd-simple-quick-actions, [class*="quick-action"]').forEach(el => {
      if (/MANUAL FINANCIAL TRANSACTIONS/i.test(textOf(el)) &&
          el !== page.querySelector('#fdManualBody') &&
          !el.contains(page.querySelector('#fdManualBody'))) el.remove();
    });

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

    // Give the full manual register its own real scroll container; card-level overflow was clipping columns/actions.
    if (restoredManualBody) {
      // fdManualBody is a TBODY, so the table must be found through its parent.
      const manualTable = restoredManualBody.closest('table');
      if (manualTable) {
        let tableScroll = manualTable.closest('.fd-manual-table-scroll');
        if (!tableScroll) {
          tableScroll = document.createElement('div');
          tableScroll.className = 'fd-manual-table-scroll';
          tableScroll.setAttribute('role','region');
          tableScroll.setAttribute('aria-label','Manual financial transactions; scroll horizontally and vertically to view all columns and actions');
          manualTable.parentNode.insertBefore(tableScroll, manualTable);
          tableScroll.appendChild(manualTable);
        }
      }
    }

    // Replace dense tabular bodies with short management lists while preserving source data.
    ['fdExpenseBody','fdBudgetBody','fdTopClients','fdMatterLeaderboard'].forEach(id => compactTable(id, page));

    // Give the manual register the full content width so all columns can be inspected.
    const manual = page.querySelector('#fdManualBody');
    const practice = page.querySelector('#fdPracticePerformance');
    const manualCard = manual && dashboardCardFor(manual, scroll);
    const practiceCard = practice && dashboardCardFor(practice, scroll);
    let workspace = page.querySelector('.fd-compact-workspace');
    if (workspace && manualCard && practiceCard) {
      if (manualCard.parentElement === workspace) scroll.insertBefore(manualCard, workspace);
      if (practiceCard.parentElement === workspace) scroll.insertBefore(practiceCard, workspace.nextSibling);
      workspace.remove();
    }
    if (manualCard && manualCard !== scroll) {
      manualCard.classList.remove('fd-compact-workspace-card');
      manualCard.style.setProperty('display','block','important');
      manualCard.style.setProperty('width','100%','important');
      manualCard.style.setProperty('max-width','100%','important');
      manualCard.style.setProperty('height','auto','important');
      manualCard.style.setProperty('min-height','0','important');
      manualCard.style.setProperty('max-height','none','important');
      manualCard.style.setProperty('overflow','visible','important');
      manualCard.style.setProperty('margin-bottom','14px','important');
    }
    if (!document.getElementById('molms-phase2-practice-compact-css')) {
      const style=document.createElement('style');
      style.id='molms-phase2-practice-compact-css';
      style.textContent=`
        #page-findash #fdPracticePerformance{width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;box-sizing:border-box!important}
        #page-findash div:has(> #fdPracticePerformance){width:min(100%,760px)!important;max-width:760px!important;min-width:0!important;justify-self:start!important;box-sizing:border-box!important}
        #page-findash div:has(> #fdPracticePerformance) #fdRevByPractice{width:100%!important;max-width:100%!important;min-width:0!important}
        #page-findash #fdPracticePerformance *{box-sizing:border-box}
        #page-findash #fdRevByPractice{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:auto!important}
        #page-findash #fdRevByPractice .fd-practice-compact{width:100%;min-width:0}
        @media(max-width:600px){#page-findash #fdPracticePerformance{max-width:100%!important}#page-findash #fdRevByPractice .fd-practice-compact{grid-template-columns:minmax(105px,1.1fr) repeat(auto-fit,minmax(88px,1fr))!important}}
      `;
      document.head.appendChild(style);
    }
    if (practiceCard && practiceCard !== scroll) {
      practiceCard.classList.remove('fd-compact-workspace-card');
      practiceCard.style.setProperty('display','block','important');
      practiceCard.style.setProperty('width','min(100%, 760px)','important');
      practiceCard.style.setProperty('max-width','760px','important');
      practiceCard.style.setProperty('height','auto','important');
      practiceCard.style.setProperty('min-height','0','important');
      practiceCard.style.setProperty('max-height','none','important');
      practiceCard.style.setProperty('overflow','visible','important');
      practiceCard.style.setProperty('margin-bottom','12px','important');
    }
    window.MOLMSFinancialDashboardSimpleV1.applied = true;
  }

  function start() {
    apply();
    // Reconcile the intended three-card executive snapshot after legacy dashboard paints.
    const enforceKpiOrder = () => {
      const row=document.querySelector('#page-findash #fdKpiRow');
      if(!row)return;
      const rank=el=>{const t=String(el.textContent||'').toUpperCase();if(t.includes('TOTAL REVENUE'))return 0;if(t.includes('TOTAL EXPENSES'))return 1;if(t.includes('CASH AVAILABLE'))return 2;return 9};
      const current=Array.from(row.children),sorted=current.slice().sort((a,b)=>rank(a)-rank(b));
      if(sorted.every((el,i)=>el===current[i]))return;
      sorted.forEach(el=>row.appendChild(el));
    };
    const renderSnapshot = () => {
      try {
        if (window.MOLMSFinanceV16 && typeof window.MOLMSFinanceV16.render === 'function') window.MOLMSFinanceV16.render();
        enforceKpiOrder();
      } catch (e) { console.warn('[MOLMS compact finance snapshot]', e); }
    };
    renderSnapshot();
    setTimeout(renderSnapshot, 350);
    setTimeout(renderSnapshot, 1200);
    const page = document.getElementById('page-findash');
    if (!page || window.MOLMSFinancialDashboardSimpleV1.observer) return;
    const observer = new MutationObserver(() => { apply(); enforceKpiOrder(); });
    observer.observe(page, { childList:true, subtree:true });
    window.MOLMSFinancialDashboardSimpleV1.observer = observer;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
  window.addEventListener('load', start, { once:true });
})();