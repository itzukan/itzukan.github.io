(() => {
  'use strict';

  const query = new URLSearchParams(location.search);
  const campaign = {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'sql_trial_reel',
    utm_content: 'profile_link',
  };
  const tagged = Object.entries(campaign).every(([name, value]) => query.get(name) === value);
  const fromLesson = ['sql_intro_group_by', 'sql_intro_left_join'].includes(query.get('from'));
  const storageKey = 'itzukan_sql_reel_trial';
  const qa = window.itzukanAnalyticsOptOut || query.get('utm_medium') === 'qa' ||
    query.get('utm_source') === 'itzukan_qa' || navigator.globalPrivacyControl || navigator.doNotTrack === '1';
  let active = tagged;
  try {
    if (tagged) sessionStorage.setItem(storageKey, String(Date.now()));
    else if (query.has('utm_source') || query.has('utm_campaign') || fromLesson) {
      sessionStorage.removeItem(storageKey);
    }
    else active = Date.now() - Number(sessionStorage.getItem(storageKey)) < 30 * 60 * 1000;
  } catch { /* The tagged landing URL is still usable without storage. */ }

  const link = document.querySelector('#trialContinuation a');
  const destination = new URL(link.href);
  if (active) {
    for (const [name, value] of Object.entries(campaign)) destination.searchParams.set(name, value);
  }
  if (qa) destination.searchParams.set('it_admin', '1');
  link.href = destination.href;
  if (!active || qa || location.origin !== 'https://free.itzukan.com' || typeof window.gtag !== 'function') return;

  window.gtag('event', 'sql_reel_trial_view');
  window.addEventListener('itzukan:learning', event => {
    if (event.detail?.name === 'sql_demo_complete') window.gtag('event', 'sql_reel_trial_complete');
  });
  link.addEventListener('click', () => window.gtag('event', 'sql_reel_paid_click'));
})();
