/* MOLMS DOCUMENT TYPE TAXONOMY V1 */
(function () {
  'use strict';

  const TYPES = [
    'Pleadings',
    'Written Submissions',
    'Contracts and Agreements',
    'Internal Memoranda',
    'Meeting Minutes',
    'Receipts',
    'Payment Records',
    'Court Orders and Judgments',
    'Case Laws and Legal Authorities',
    'Due Diligence Reports',
    'General'
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

    select.value = previous || 'General';
    if (!select.value) select.value = 'General';
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
