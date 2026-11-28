(() => {
  'use strict';

  const panel = document.getElementById('dojo-sync');
  if (!panel) return;

  const login = panel.querySelector('[data-sync-login]');
  const logout = panel.querySelector('[data-sync-logout]');
  const refresh = panel.querySelector('[data-sync-refresh]');
  const remove = panel.querySelector('[data-sync-delete]');
  const status = panel.querySelector('[role="status"]');
  const summary = panel.querySelector('summary');
  const series = document.body.dataset.dojo;
  const progress = 'progress/' + series;
  const endpoint = location.origin === 'https://free.itzukan.com'
    ? 'https://sync.itzukan.com/api/dojo-sync/' : '/api/dojo-sync/';
  let sessionKey = null;
  let version = null;
  let snapshot = null;
  let auth = null;
  let busy = false;
  let blocked = false;
  let queue = Promise.resolve();
  let pending;

  async function request(route, method = 'GET', body) {
    const headers = { Accept: 'application/json' };
    if (sessionKey) headers['X-Dojo-Session'] = sessionKey;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(endpoint + route, {
      method, headers, cache: 'no-store', credentials: 'include', signal: AbortSignal.timeout(8000),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw Object.assign(new Error('Sync request failed'), { status: response.status });
    return response.json();
  }

  function setControls() {
    login.hidden = !!sessionKey;
    login.disabled = busy || !auth;
    logout.hidden = !sessionKey;
    logout.disabled = busy;
    refresh.hidden = !sessionKey || !blocked;
    refresh.disabled = busy;
    remove.hidden = !sessionKey || !snapshot || blocked;
    remove.disabled = busy;
    summary.textContent = sessionKey ? '端末間の同期 · ログイン中' : '別の端末でも続ける（任意）';
  }

  function changed() {
    setControls();
    panel.dispatchEvent(new Event('dojo-sync-change'));
  }

  function restoreGuest(message) {
    sessionKey = version = snapshot = null;
    blocked = false;
    status.textContent = message;
    changed();
  }

  async function readProgress() {
    ({ snapshot, version } = await request(progress));
    blocked = false;
  }

  function save(next, report) {
    if (!sessionKey || busy || blocked) return false;
    pending = { next, report };
    queue = queue.then(async () => {
      if (!pending || blocked) return;
      const update = pending;
      pending = null;
      try {
        const method = update.next === null ? 'DELETE' : 'PUT';
        ({ version } = await request(progress, method, { version, snapshot: update.next }));
        snapshot = update.next;
        setControls();
        update.report('端末間に同期しました。');
      } catch (error) {
        pending = null;
        blocked = true;
        update.report(error.status === 409
          ? '別の端末またはタブで更新されました。この画面の進み具合は同期されていません。'
          : '進み具合を同期できませんでした。この画面の進み具合を残すには続きのリンクをコピーできます。');
        status.textContent = '同期した続きに戻るには「保存済みの進捗を読み直す」を選んでください。';
        setControls();
      }
    });
    return true;
  }

  login.addEventListener('click', async () => {
    if (busy || !auth) return;
    busy = true;
    setControls();
    let signedIn = false;
    try {
      const idToken = await auth.login();
      ({ sessionKey } = await request('session', 'POST', { idToken }));
      signedIn = true;
      window.dispatchEvent(new Event('free-account-change'));
      await readProgress();
      status.textContent = 'このアカウントの進み具合を端末間で同期します。';
    } catch {
      blocked = signedIn;
      status.textContent = signedIn ? '保存済みの進捗を取得できませんでした。' : 'Googleログインを確認できませんでした。';
    } finally {
      busy = false;
      if (signedIn) changed();
      else setControls();
    }
  });

  logout.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    setControls();
    try {
      await queue;
      await request('logout', 'POST');
      restoreGuest('ログアウトしました。このブラウザーに保存した練習を使えます。');
      window.dispatchEvent(new Event('free-account-change'));
    } catch (error) {
      if (error.status === 409) {
        restoreGuest('別のタブでログイン状態が変わりました。ページを開き直してください。');
      } else {
        status.textContent = 'ログアウトを確認できませんでした。もう一度お試しください。';
      }
    } finally {
      busy = false;
      setControls();
    }
  });

  refresh.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    setControls();
    try {
      await readProgress();
      status.textContent = '保存済みの進捗を読み直しました。';
      changed();
    } catch (error) {
      if ([401, 409].includes(error.status)) {
        restoreGuest('ログイン状態が変わりました。ページを開き直してください。');
      } else {
        status.textContent = '保存済みの進捗を取得できませんでした。';
      }
    } finally {
      busy = false;
      setControls();
    }
  });

  remove.addEventListener('click', async () => {
    if (!sessionKey || busy || blocked || !snapshot) return;
    if (!window.confirm('この道場の同期した途中経過を削除しますか？ 同じアカウントの別端末からも再開できなくなります。')) return;
    busy = true;
    setControls();
    try {
      await queue;
      if (blocked) return;
      ({ version } = await request(progress, 'DELETE', { version }));
      snapshot = null;
      status.textContent = 'この道場の同期した途中経過を削除しました。';
      changed();
    } catch (error) {
      blocked = true;
      status.textContent = error.status === 409
        ? '別の端末で更新されました。保存済みの進捗を読み直してから、もう一度操作してください。'
        : '途中経過を削除できませんでした。保存済みの進捗を読み直してください。';
    } finally {
      busy = false;
      setControls();
    }
  });

  async function syncAccount() {
    if (busy || panel.hidden) return;
    const check = sessionKey;
    try {
      const current = await request('session');
      if (busy || check !== sessionKey || current.sessionKey === check) return;
      busy = true;
      setControls();
      try {
        await queue;
        if (!current.sessionKey) {
          restoreGuest('ログアウトしました。このブラウザーに保存した練習を使えます。');
          return;
        }
        sessionKey = current.sessionKey;
        version = snapshot = null;
        await readProgress();
        status.textContent = 'このアカウントの進み具合を端末間で同期します。';
        changed();
      } catch {
        blocked = true;
        status.textContent = '保存済みの進捗を取得できませんでした。';
        changed();
      } finally {
        busy = false;
        setControls();
      }
    } catch { /* Existing quiz state remains available during a temporary connection loss. */ }
  }

  window.addEventListener('free-account-change', syncAccount);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncAccount();
  });

  window.dojoSync = { signedIn: () => !!sessionKey, snapshot: () => snapshot, save };
  (async () => {
    try {
      const config = await request('config');
      ({ sessionKey } = await request('session'));
      if (sessionKey) {
        try { await readProgress(); }
        catch { blocked = true; status.textContent = '保存済みの進捗を取得できませんでした。'; }
        changed();
      }
      panel.hidden = false;
      const { createGoogleSignIn } = await import('./dojo-google-sign-in.js?v=3');
      auth = await createGoogleSignIn(config);
    } catch {
      if (!panel.hidden) status.textContent = 'Googleログインを読み込めませんでした。';
    } finally {
      setControls();
    }
  })();
})();
