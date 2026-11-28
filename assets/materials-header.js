(() => {
  'use strict';

  const mount = document.querySelector('header[data-library-header]');
  if (!mount) return;
  const header = document.createElement('div');
  header.className = 'materials-header';
  header.innerHTML = `
    <a class="brand" href="/materials/">IT図鑑トップ</a>
    <form id="search-materials" class="materials-search" role="search" aria-labelledby="materials-query-label" hidden>
      <label id="materials-query-label" for="materials-query">無料教材を検索</label>
      <div class="materials-search-controls">
        <input id="materials-query" name="q" type="search" placeholder="教材名・用語で検索" autocomplete="off">
        <button id="materials-clear" type="button" hidden>クリア</button>
      </div>
    </form>
    <nav aria-label="無料教材メニュー">
      <details class="category-menu">
        <summary>カテゴリ</summary>
        <ul>
          <li><a href="/materials/categories/#it-passport">ITパスポート</a></li>
          <li><a href="/materials/fe/">基本情報</a></li>
          <li><a href="/materials/categories/#fe-b">基本情報・科目B</a></li>
          <li><a href="/materials/categories/#data">SQL・データベース</a></li>
          <li><a href="/materials/categories/#web">Web・開発</a></li>
          <li><a href="/materials/categories/#network">ネットワーク</a></li>
          <li><a href="/materials/categories/#telework">テレワーク</a></li>
          <li><a href="/materials/categories/#security">セキュリティ</a></li>
          <li><a href="/materials/categories/">カテゴリ別一覧</a></li>
        </ul>
      </details>
      <a class="question-series-link" href="/materials/practice/">問題シリーズ</a>
      <a href="/materials/all/">全教材</a>
      <a href="/materials/sql/training-demo/">SQL無料体験</a>
      <a class="materials-paid-link" href="https://premium.itzukan.com/">有料教材</a>
    </nav>
    <div data-pin-sync-host hidden></div>`;
  const commonLinks = new Set([...header.querySelectorAll('a')].map(link => link.getAttribute('href')));
  for (const link of mount.querySelectorAll('a[href]')) {
    if (!link.matches('.lesson-search-link') && !commonLinks.has(link.getAttribute('href'))) continue;
    const parent = link.parentElement;
    link.remove();
    if (parent.matches('nav') && !parent.children.length && !parent.textContent.trim()) parent.remove();
  }
  mount.prepend(header);
  const search = header.querySelector('.materials-search');
  const menu = header.querySelector('nav');
  const input = search.querySelector('input');
  let syncPanel;
  const tools = document.createElement('div');
  tools.className = 'materials-header-tools';
  tools.innerHTML = `
    <button type="button" aria-label="メニュー" aria-controls="header-materials-menu" aria-expanded="false"><span class="header-dots" aria-hidden="true"></span></button>
    <button type="button" aria-label="ピン留めした教材" aria-controls="header-materials-pins" aria-expanded="false"><span class="header-bookmark" aria-hidden="true"></span></button>
    <button type="button" aria-label="検索" aria-controls="search-materials" aria-expanded="false"><span class="header-search-icon" aria-hidden="true"></span></button>`;
  const [menuButton, pinsButton, searchButton] = tools.querySelectorAll('button');
  header.querySelector('.brand').after(tools);
  menu.id = 'header-materials-menu';

  const pins = document.createElement('section');
  pins.id = 'header-materials-pins';
  pins.setAttribute('aria-labelledby', 'header-materials-pins-title');
  pins.hidden = true;
  pins.innerHTML = `<h2 id="header-materials-pins-title">ピン留めした教材<span data-pin-count></span></h2>
    <p data-pin-message role="status"></p><ul></ul>
    <div class="header-pin-actions">
      <a href="/materials/all/#free-materials">教材一覧でピン留めを管理</a>
      <button type="button" data-clear-pins hidden>すべて解除</button>
    </div>`;
  header.append(pins);
  const pinList = pins.querySelector('ul');
  const pinCount = pins.querySelector('[data-pin-count]');
  const pinMessage = pins.querySelector('[data-pin-message]');
  const managePins = pins.querySelector('a');
  const clearPins = pins.querySelector('[data-clear-pins]');
  let clearingPins = false;
  let clearFailed = false;

  let open = null;
  let catalogue;
  let pinLoad = 0;

  async function loadCatalogue() {
    const local = document.querySelector('#all-material-cards');
    const root = local ? document : await fetch('/materials/all/').then(async response => {
      if (!response.ok) throw Error('Catalogue unavailable');
      return new DOMParser().parseFromString(await response.text(), 'text/html');
    });
    return new Map([...root.querySelectorAll('#material-cards .card')].map(card => {
      const link = card.querySelector('a[data-material-id]');
      const title = card.querySelector('h3').textContent.trim();
      return [link.dataset.materialId, { title, href: link.getAttribute('href') }];
    }));
  }

  async function renderPins() {
    if (open !== pinsButton) return;
    const render = ++pinLoad;
    const sync = window.materialPinSync;
    const ids = sync?.pins() ?? sync?.guestPins() ?? [];
    clearPins.disabled = clearingPins || !!sync?.locked();
    if (!ids.length) {
      pinList.replaceChildren();
      clearPins.hidden = true;
      pinCount.textContent = '（0件）';
      managePins.hash = 'free-materials';
      pinMessage.textContent = clearFailed ? 'ピン留めの状態を確認できませんでした。ページを開き直してください。'
        : 'ピン留めした教材はありません。教材カードの📌で追加できます。';
      return;
    }
    try {
      catalogue ??= loadCatalogue();
      const materials = await catalogue;
      if (render !== pinLoad || open !== pinsButton) return;
      const items = [];
      for (const id of new Set(ids)) {
        const material = materials.get(id);
        if (!material) continue;
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = material.href;
        link.textContent = material.title;
        item.append(link);
        items.push(item);
      }
      pinList.replaceChildren(...items);
      clearPins.hidden = !items.length || !sync?.clearPins;
      pinCount.textContent = `（${items.length}件）`;
      managePins.hash = items.length ? 'pinned-materials' : 'free-materials';
      pinMessage.textContent = clearFailed ? '解除できませんでした。最新の一覧を確認して、もう一度お試しください。'
        : items.length ? '' : 'ピン留めした教材はありません。';
    } catch {
      catalogue = undefined;
      if (render !== pinLoad || open !== pinsButton) return;
      pinList.replaceChildren();
      clearPins.hidden = true;
      pinCount.textContent = '';
      pinMessage.textContent = 'ピン留めした教材を読み込めませんでした。';
    }
  }

  clearPins.addEventListener('click', async () => {
    const sync = window.materialPinSync;
    const message = sync?.pins()
      ? 'ピン留めをすべて解除しますか？ 同じアカウントで使っている他の端末にも反映されます。'
      : 'このブラウザーのピン留めをすべて解除しますか？';
    if (!sync?.clearPins || !window.confirm(message)) return;
    clearingPins = true;
    clearFailed = false;
    clearPins.disabled = true;
    try {
      clearFailed = !await sync.clearPins();
    } catch {
      clearFailed = true;
    } finally {
      clearingPins = false;
      if (open === pinsButton) {
        await renderPins();
        (clearPins.hidden ? pinsButton : clearPins).focus();
      }
    }
  });

  function show(next, focus = false) {
    if (next !== pinsButton) clearFailed = false;
    if (open === searchButton && next !== searchButton && input.value) {
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
    open = next;
    for (const button of [menuButton, pinsButton, searchButton]) {
      button.setAttribute('aria-expanded', String(button === open));
    }
    header.dataset.panel = open?.getAttribute('aria-controls') ?? '';
    pins.hidden = open !== pinsButton;
    if (open === pinsButton) renderPins();
    if (open === searchButton && focus) input.focus();
  }

  function openFromLink() {
    if (location.hash === '#search-materials') {
      if (syncPanel) syncPanel.open = false;
      show(searchButton, true);
    }
    if (location.hash === '#material-pin-sync' && syncPanel) syncPanel.open = true;
  }

  function placeAccount() {
    if (!syncPanel) {
      syncPanel = header.querySelector('#material-pin-sync');
      syncPanel?.addEventListener('toggle', () => {
        if (syncPanel.open) show(null);
      });
    }
    if (!syncPanel) return;
    if (syncPanel.parentElement === tools) return;
    tools.append(syncPanel);
    if (location.hash === '#material-pin-sync') syncPanel.open = true;
  }

  for (const button of [menuButton, pinsButton, searchButton]) {
    button.addEventListener('click', () => {
      if (syncPanel) syncPanel.open = false;
      show(open === button ? null : button, true);
    });
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.isComposing && syncPanel?.open && syncPanel.contains(event.target)) {
      syncPanel.open = false;
      syncPanel.querySelector('summary').focus();
      return;
    }
    if (event.key !== 'Escape' || event.isComposing || !open) return;
    const trigger = open;
    show(null);
    trigger.focus();
  });
  document.addEventListener('click', event => {
    if (syncPanel?.open && !syncPanel.contains(event.target) && !event.target.closest('dialog')) syncPanel.open = false;
    if (open && open !== searchButton && !header.contains(event.target) && !event.target.closest('dialog')) show(null);
    if (open === pinsButton && managePins.contains(event.target) && location.pathname === '/materials/all/') show(null);
  });
  window.addEventListener('material-pins-sync-change', () => {
    placeAccount();
    renderPins();
  });
  window.addEventListener('storage', renderPins);
  window.addEventListener('hashchange', openFromLink);
  placeAccount();
  show(null);
  openFromLink();
})();
