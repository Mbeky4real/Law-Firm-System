/* MOLMS DOCUMENT TYPE TAXONOMY V1 */
(function () {
  'use strict';

  const TYPES = [
    'Correspondence',
    'Pleadings',
    'Written Submissions',
    'Court Applications',
    'Court Orders & Judgments',
    'Affidavits',
    'Contracts & Agreements',
    'Legal Opinions',
    'Internal Memoranda',
    'Meeting Minutes & Resolutions',
    'Due Diligence Reports',
    'Case Laws & Legislation',
    'Corporate Documents',
    'Regulatory & Compliance Documents',
    'Transaction Documents',
    'Reports',
    'Evidence & Supporting Documents',
    'Receipts & Payment Records',
    'General / Other Documents'
  ];

  function upgradeDocumentType() {
    const select = document.getElementById('docType');
    if (!select || select.dataset.molmsTaxonomyV1 === 'true') return;

    const previous = select.value;
    const legacyLabel = previous && !TYPES.includes(previous) ? previous : null;
    select.replaceChildren();

    if (legacyLabel) {
      const legacy = document.createElement('option');
      legacy.value = legacyLabel;
      legacy.textContent = legacyLabel;
      select.appendChild(legacy);
    }

    TYPES.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      select.appendChild(option);
    });

    select.value = previous || 'General / Other Documents';
    if (!select.value) select.value = 'General / Other Documents';
    select.dataset.molmsTaxonomyV1 = 'true';
  }

  function boot() {
    upgradeDocumentType();
    const observer = new MutationObserver(upgradeDocumentType);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', () => setTimeout(upgradeDocumentType, 0), true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
