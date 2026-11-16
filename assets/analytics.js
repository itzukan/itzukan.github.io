/* IT図鑑 analytics: activate by setting measurementId in analytics-config.js. */
(function () {
  'use strict';
  var config = window.ITZUKAN_ANALYTICS || {};
  var id = typeof config.measurementId === 'string' ? config.measurementId.trim() : '';
  if (!/^G-[A-Z0-9]+$/i.test(id)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: true });
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(script);
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-material-id]');
    if (!link) return;
    var material = link.getAttribute('data-material-id');
    var type = link.getAttribute('data-analytics-event');
    if (!material || (type !== 'material_click' && type !== 'pdf_click')) return;
    var params = { material_id: material, link_url: link.href };
    if (type === 'pdf_click') params.platform = link.getAttribute('data-platform') || 'unknown';
    window.gtag('event', type, params);
  });
}());
