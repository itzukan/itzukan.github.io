(() => {
  'use strict';

  const signInBenefit = 'ピン留めした教材をPCとスマホで共有し、問題演習の続きも別の端末で解けます。';
  const host = document.querySelector('[data-pin-sync-host]');
  if (host) host.innerHTML = `
    <details id="material-pin-sync" class="material-pin-sync" hidden>
      <summary>
        <span class="material-pin-sync-icon" aria-hidden="true"></span>
        <span class="material-pin-account-initial" aria-hidden="true">?</span>
      </summary>
      <div class="material-pin-sync-body">
        <div class="material-pin-account" data-sync-account hidden>
          <span class="material-pin-account-label">ログイン中</span>
          <p data-sync-email></p>
          <a href="https://premium.itzukan.com/purchases">購入済み教材</a>
        </div>
        <p role="status">${signInBenefit}</p>
        <div class="material-pin-sync-actions">
          <button type="button" data-sync-login disabled>Googleでログイン</button>
          <button type="button" data-pin-import hidden>このブラウザーのピン留めを引き継ぐ</button>
          <button type="button" data-sync-logout hidden>ログアウト</button>
          <a href="/materials/practice/sync-data/">同期で保存されるデータ</a>
        </div>
      </div>
    </details>`;
  const panel = host?.querySelector('#material-pin-sync');
  const account = panel?.querySelector('[data-sync-account]');
  const email = panel?.querySelector('[data-sync-email]');
  const login = panel?.querySelector('[data-sync-login]');
  const logout = panel?.querySelector('[data-sync-logout]');
  const importPins = panel?.querySelector('[data-pin-import]');
  const status = panel?.querySelector('[role="status"]');
  const summary = panel?.querySelector('summary');
  const initial = panel?.querySelector('.material-pin-account-initial');
  const storageKey = 'itzukan-material-pins-v1';
  const endpoint = location.origin === 'https://free.itzukan.com'
    ? 'https://sync.itzukan.com/api/dojo-sync/' : '/api/dojo-sync/';
  let sessionKey = null;
  let accountInitial = null;
  let accountEmail = null;
  let saved = null;
  let auth;
  let authConfig;
  let loadingAuth = false;
  let premiumOrigin = null;
  const premiumLinks = new Map();
  let premiumLinksActive = false;
  let enabled = false;
  let busy = false;

  function guestPins() {
    try {
      const pins = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(pins)) return pins;
    } catch {
      // This browser may have blocked storage.
    }
    return [];
  }

  async function request(route, method = 'GET', body) {
    const response = await fetch(endpoint + route, {
      method, credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: {
        Accept: 'application/json',
        ...(sessionKey ? { 'X-Dojo-Session': sessionKey } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw Object.assign(new Error('Pin sync request failed'), { status: response.status });
    return response.json();
  }

  function render() {
    if (panel) {
      panel.hidden = !enabled;
      login.hidden = !!sessionKey;
      login.disabled = busy || !auth;
      logout.hidden = !sessionKey;
      logout.disabled = busy;
      importPins.hidden = !saved || !guestPins().some(id => !saved.pins.includes(id));
      importPins.disabled = busy;
      panel.toggleAttribute('data-signed-in', !!sessionKey);
      summary.setAttribute('aria-label', sessionKey ? 'アカウント（ログイン中）' : 'ログイン');
      initial.textContent = accountInitial || '?';
      account.hidden = !sessionKey;
      email.textContent = sessionKey ? accountEmail || 'メールアドレスの表示には再ログインが必要です。' : '';
    }
    updatePremiumLinks();
    window.dispatchEvent(new Event('material-pins-sync-change'));
  }

  function report(message) {
    if (status) status.textContent = message;
  }

  async function run(action) {
    if (busy) return;
    busy = true;
    render();
    try { return await action(); }
    finally {
      busy = false;
      render();
      prepareLogin();
    }
  }

  async function prepareLogin() {
    if (!panel?.open || !authConfig || sessionKey || auth || loadingAuth) return;
    loadingAuth = true;
    try {
      const { createGoogleSignIn } = await import('/assets/dojo-google-sign-in.js?v=3');
      auth = await createGoogleSignIn(authConfig);
    } catch {
      report('Googleログインを読み込めませんでした。閉じて開き直してください。');
    } finally {
      loadingAuth = false;
      render();
    }
  }

  panel?.addEventListener('toggle', prepareLogin);

  async function readAccount() {
    accountEmail = null;
    try {
      ({ sessionKey, accountInitial, accountEmail = null } = await request('session'));
      saved = sessionKey ? await request('pins') : null;
      report(sessionKey ? 'このアカウントのピン留めを端末間で同期します。' : signInBenefit);
    } catch {
      saved = null;
      report('ピン留めを読み込めませんでした。ページを開き直してください。');
    }
  }

  function update(transform, retryOnConflict = true) {
    return run(async () => {
      if (!saved) return;
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const pins = transform(saved.pins);
          if (pins.length > 200) {
            report('同期できるピン留めは200件までです。');
            return;
          }
          try {
            const { version } = await request('pins', 'PUT', { version: saved.version, pins });
            saved = { version, pins };
            report('ピン留めを同期しました。');
            return true;
          } catch (error) {
            if (error.status !== 409) throw error;
            saved = await request('pins');
            if (!retryOnConflict) break;
          }
        }
        report('別の端末でも変更されました。最新の一覧で操作し直してください。');
      } catch (error) {
        if ([401, 409].includes(error.status)) {
          sessionKey = accountInitial = accountEmail = null;
          saved = null;
        }
        report('ピン留めを同期できませんでした。ページを開き直してください。');
      }
    });
  }

  window.materialPinSync = {
    pins: () => sessionKey ? (saved?.pins ?? []) : null,
    guestPins,
    locked: () => enabled && (busy || (!!sessionKey && !saved)),
    setPin: (id, pinned) => update(pins => pinned ? [...new Set([...pins, id])] : pins.filter(pin => pin !== id)),
    clearPins() {
      if (sessionKey) return update(() => [], false);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        return false;
      }
      render();
      return true;
    },
  };

  login?.addEventListener('click', () => run(async () => {
    if (!auth || sessionKey) return;
    try {
      const idToken = await auth.login();
      ({ sessionKey } = await request('session', 'POST', { idToken }));
      window.dispatchEvent(new Event('free-account-change'));
      await readAccount();
    } catch {
      report('Googleログインを確認できませんでした。');
    }
  }));

  logout?.addEventListener('click', () => run(async () => {
    try {
      await request('logout', 'POST');
      sessionKey = accountInitial = accountEmail = saved = null;
      window.dispatchEvent(new Event('free-account-change'));
      report('ログアウトしました。このブラウザーのピン留めを表示します。');
    } catch {
      await readAccount();
    }
  }));

  importPins?.addEventListener('click', () => {
    const localPins = guestPins().filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(id));
    update(pins => [...new Set([...pins, ...localPins])]);
  });

  function refresh() {
    if (enabled) run(readAccount);
  }
  window.addEventListener('focus', refresh);
  window.addEventListener('free-account-change', refresh);
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

  function updatePremiumLinks() {
    const active = !!premiumOrigin && !!sessionKey;
    if (active === premiumLinksActive) return;
    premiumLinksActive = active;
    if (!active) {
      for (const [link, { original, handoff }] of premiumLinks) {
        if (link.href === handoff) link.setAttribute('href', original);
      }
      premiumLinks.clear();
      return;
    }
    for (const link of document.querySelectorAll(`a[href^="${premiumOrigin}"]:not([download])`)) {
      const target = new URL(link.href);
      if (target.origin !== premiumOrigin || /^\/(?:auth|api)(?:\/|$)/.test(target.pathname)) continue;
      const next = target.pathname + target.search + target.hash;
      if (next.length > 900) continue;
      const start = new URL('/auth/free/start', premiumOrigin);
      start.searchParams.set('next', next);
      premiumLinks.set(link, { original: link.getAttribute('href'), handoff: start.href });
      link.href = start.href;
    }
  }

  run(async () => {
    let config;
    try { config = await request('config'); }
    catch { return; }
    if (!config.pinsEnabled) return;
    enabled = true;
    const { pinsEnabled, premiumHandoffOrigin, ...googleConfig } = config;
    premiumOrigin = premiumHandoffOrigin ?? null;
    authConfig = googleConfig;
    await readAccount();
  });
})();
