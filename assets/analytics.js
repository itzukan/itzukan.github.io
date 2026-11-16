/* IT図鑑: GA4 page views and material click events. GTM may be used for other tags; do not configure a second GA4 page-view tag in GTM. */
(function () {
  'use strict';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-J0PDHL2KZL');
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var link = target.closest('a[data-material-id]');
    if (!link) return;
    var material = link.getAttribute('data-material-id');
    var type = link.getAttribute('data-analytics-event');
    if (!material || (type !== 'material_click' && type !== 'pdf_click')) return;
    var data = { material_id: material, link_url: link.href };
    if (type === 'pdf_click') data.platform = link.getAttribute('data-platform') || 'unknown';
    window.gtag('event', type, data);
  });
}());
