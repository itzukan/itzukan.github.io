// Carry only known, non-identifying attribution values to the API trial.
(function () {
  'use strict';
  var storageKey = 'itzukan_api_trial_source';
  var query = new URLSearchParams(window.location.search);
  var source = query.get('utm_source')?.trim().toLowerCase();
  var medium = query.get('utm_medium')?.trim().toLowerCase();
  var referrer = document.referrer ? new URL(document.referrer) : null;
  var referrerHost = referrer?.hostname || '';
  var routeSource = '';
  if (source === 'itzukan_qa' || medium === 'qa') {
    routeSource = 'itzukan_qa';
  } else if (source === 'instagram' || (!source &&
      (referrerHost === 'instagram.com' || referrerHost.endsWith('.instagram.com')))) {
    routeSource = 'instagram';
  } else if (!source && referrer?.origin === window.location.origin) {
    try { routeSource = window.sessionStorage.getItem(storageKey) || ''; } catch (e) {}
  }

  try {
    if (routeSource) window.sessionStorage.setItem(storageKey, routeSource);
    else window.sessionStorage.removeItem(storageKey);
  } catch (e) {}

  if (routeSource !== 'instagram' && routeSource !== 'itzukan_qa') return;
  var link = document.querySelector('a[data-analytics-event="api_trial_click"]');
  if (!link) return;
  var target = new URL(link.href);
  target.searchParams.set('utm_source', routeSource);
  target.searchParams.set('utm_medium', routeSource === 'itzukan_qa' ? 'qa' : 'social');
  target.searchParams.set('utm_campaign', 'api_key_to_trial');
  link.href = target.href;
}());

/* IT図鑑 GA4: opt-out for the administrator's browser.
   Visit /?it_admin=1 once per browser to disable tracking.
   Visit /?it_admin=0 to re-enable tracking.
   Do not add a separate GA4 tag in GTM or HTML. */
(function () {
  'use strict';
  // Keep GA4 off for local, LAN, and other preview origins.
  var origin = window.location.origin;
  if (origin !== 'https://free.itzukan.com' && origin !== 'https://itzukan.github.io') {
    window.itzukanAnalyticsOptOut = true;
    window['ga-disable-G-J0PDHL2KZL'] = true;
    return;
  }

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
  window.itzukanAnalyticsOptOut = excluded;
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
    if (!material || (type !== 'material_click' && type !== 'pdf_click' && type !== 'api_trial_click')) return;
    var data = { material_id: material, link_url: link.href };
    var clickLocation = link.getAttribute('data-click-location');
    if (clickLocation) data.click_location = clickLocation;
    if (type === 'material_click') {
      var learningRoute = link.getAttribute('data-learning-route');
      if (learningRoute) data.learning_route = learningRoute;
    }
    if (type === 'pdf_click') data.platform = link.getAttribute('data-platform') || 'unknown';
    window.gtag('event', type, data);
  });
}());

// Shared feedback UI for public learning materials; GA4 opt-out remains effective.
(function(){if(!/^\/materials\/(network|api|sql|security|html-javascript)\//.test(location.pathname))return;function load(){var s=document.createElement('script');s.src='/assets/material-feedback.js';document.body.appendChild(s);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();})();
