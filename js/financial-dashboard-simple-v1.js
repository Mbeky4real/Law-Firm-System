/* MOLMS Financial Dashboard Simple Presentation V1
 * Presentation-only: preserves all existing calculations, data loaders and actions.
 * Scoped to the Financial Dashboard; never hides the dashboard/page containers.
 */
(function () {
  'use strict';
  if (window.MOLMSFinancialDashboardSimpleV1) return;
  window.MOLMSFinancialDashboardSimpleV1 = { version: 1 };

  const styleId = 'molms-financial-dashboard-simple-v1-style';
  function installStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Six clear headline figures; responsive without changing their values. */
      #page-findash #fdKpiRow {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 12px !important;
        padding: 14px 20px !important;
      }
      #page-findash #fdKpiRow > * { min-width: 0; }
      #page-findash > div[style*="overflow-y:auto"] {
        padding: 16px 20px !important;
      }
      #page-findash #fdTimeline { display: none !important; }
      #page-findash #fdTimeline { }
      @media (max-width: 760px) {
        #page-findash #fdKpiRow { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; padding: 12px !important; gap: 8px !important; }
        #page-findash > div[style*="overflow-y:auto"] { padding: 12px !important; }
      }
      @media (max-width: 380px) {
        #page-findash #fdKpiRow { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }
  function apply() {
    const page = document.getElementById('page-findash');
    if (!page) return;
    installStyle();
    // Hide only the timeline content panel, not its ancestors or adjacent panels.
    const timeline = document.getElementById('fdTimeline');
    if (timeline) {
      const panel = timeline.parentElement;
      if (panel && panel.parentElement && panel.parentElement.children.length > 1) panel.style.display = 'none';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  window.addEventListener('load', apply, { once: true });
})();