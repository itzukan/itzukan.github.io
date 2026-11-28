(() => {
  'use strict';

  const host = document.querySelector('[data-pin-sync-host]');
  if (host) host.innerHTML = `
    <details id="material-pin-sync" class="material-pin-sync" hidden>
      <summary>
        <span class="material-pin-sync-icon" aria-hidden="true"></span>
        <span data-pin-title>ログイン</span>
        <span class="material-pin-sync-state" data-pin-state>任意</span>
      </summary>
      <div class="material-pin-sync-body">
        <p role="status">PCとスマホで同じGoogleアカウントを使ってください。</p>
        <div class="material-pin-sync-actions">
          <button type="button" data-sync-login disabled>Googleでログイン</button>
          <button type="button" data-pin-import hidden>このブラウザーのピン留めを引き継ぐ</button>
          <button type="button" data-sync-logout hidden>ログアウト</button>
          <a href="/materials/practice/sync-data/#pin-data">同期で保存されるデータ</a>
        </div>
      </div>
    </details>`;
  const panel = host?.querySelector('#material-pin-sync');
  const login = panel?.querySelector('[data-sync-login]');
  const logout = panel?.querySelector('[data-sync-logout]');
  const importPins = panel?.querySelector('[data-pin-import]');
  const status = panel?.querySelector('[role="status"]');
  const title = panel?.querySelector('[data-pin-title]');
  const state = panel?.querySelector('[data-pin-state]');
  const summary = panel?.querySelector('summary');
  const storageKey = 'itzukan-material-pins-v1';
  const endpoint = location.origin === 'https://free.itzukan.com'
    ? 'https://sync.itzukan.com/api/dojo-sync/' : '/api/dojo-sync/';
  let sessionKey = null;
  let saved = null;
  let auth;
  let authConfig;
  let loadingAuth = false;
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
      title.textContent = sessionKey ? 'アカウント' : 'ログイン';
      state.textContent = sessionKey ? 'ログイン中' : '任意';
      summary.setAttribute('aria-label', sessionKey ? 'アカウント（ログイン中）' : 'ログイン');
    }
    window.dispatchEvent(new Event('material-pins-sync-change'));
  }

  function report(message) {
    if (status) status.textContent = message;
  }

  async function run(action) {
    if (busy) return;
    busy = true;
    render();
    try { await action(); }
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
      const { createGoogleSignIn } = await import('/assets/dojo-google-sign-in.js?v=2');
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
    try {
      ({ sessionKey } = await request('session'));
      saved = sessionKey ? await request('pins') : null;
      report(sessionKey ? 'このアカウントのピン留めを端末間で同期します。' : 'PCとスマホで同じGoogleアカウントを使ってください。');
    } catch {
      saved = null;
      report('ピン留めを読み込めませんでした。ページを開き直してください。');
    }
  }

  function update(transform) {
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
            return;
          } catch (error) {
            if (error.status !== 409) throw error;
            saved = await request('pins');
          }
        }
        report('別の端末でも変更されました。最新の一覧で操作し直してください。');
      } catch (error) {
        if ([401, 409].includes(error.status)) {
          sessionKey = null;
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
      sessionKey = saved = null;
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

  run(async () => {
    let config;
    try { config = await request('config'); }
    catch { return; }
    if (!config.pinsEnabled) return;
    enabled = true;
    const { pinsEnabled, ...googleConfig } = config;
    authConfig = googleConfig;
    await readAccount();
  });
})();
