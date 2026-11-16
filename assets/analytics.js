/* IT図鑑 click tracking via Google Tag Manager. */
(function () {
  'use strict';
  window.dataLayer = window.dataLayer || [];
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var link = target.closest('a[data-material-id]');
    if (!link) return;
    var material = link.getAttribute('data-material-id');
    var type = link.getAttribute('data-analytics-event');
    if (!material || (type !== 'material_click' && type !== 'pdf_click')) return;
    var data = { event: type, material_id: material, link_url: link.href };
    if (type === 'pdf_click') data.platform = link.getAttribute('data-platform') || 'unknown';
    window.dataLayer.push(data);
  });
}());
