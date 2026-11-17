/* IT図鑑 GA4: opt-out for the administrator's browser.
   Visit /?it_admin=1 once per browser to disable tracking.
   Visit /?it_admin=0 to re-enable tracking.
   Do not add a separate GA4 tag in GTM or HTML. */
(function () {
  'use strict';
  var key = 'itzukan_ga4_admin_optout';
  var query = new URLSearchParams(window.location.search);
  var setting = query.get('it_admin');
  try {
    if (setting === '1') window.localStorage.setItem(key, '1');
    if (setting === '0') window.localStorage.removeItem(key);
  } catch (e) {
    // Storage may be disabled. URL flag still works for this page.
  }
  var excluded = setting === '1';
  if (setting !== '0' && !excluded) {
    try { excluded = window.localStorage.getItem(key) === '1'; } catch (e) {}
  }
  if (excluded) {
    window['ga-disable-G-J0PDHL2KZL'] = true;
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-J0PDHL2KZL');

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-J0PDHL2KZL';
  document.head.appendChild(script);

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
