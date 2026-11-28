(() => {
  'use strict';

  const section = document.querySelector('#materials-ranking');
  if (!section) return;
  const list = section.querySelector('#materials-ranking-list');
  const pins = document.querySelector('#home-pins');
  const pinList = document.querySelector('#home-pins-list');
  const storageKey = 'itzukan-material-pins-v1';

  const catalogue = fetch('/materials/all/').then(async response => {
    if (!response.ok) throw Error('Catalogue unavailable');
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    return new Map([...page.querySelectorAll('#all-material-cards .card')].map(card => {
      const link = card.querySelector('a[data-material-id]');
      const title = [...card.querySelector('h3').childNodes].map(node => node.textContent).join(' ').trim();
      return [link.dataset.materialId, { href: link.getAttribute('href'), title }];
    }));
  }).catch(() => new Map());

  async function loadPins() {
    const materials = await catalogue;
    let saved = window.materialPinSync?.pins();
    if (!saved) {
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey));
        saved = Array.isArray(stored) ? stored : [];
      } catch { saved = []; }
    }
    const items = [];
    for (const id of new Set(saved)) {
      const material = materials.get(id);
      if (!material) continue;
      const item = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = material.href;
      anchor.textContent = material.title;
      item.append(anchor);
      items.push(item);
      if (items.length === 3) break;
    }
    pinList.replaceChildren(...items);
    pins.hidden = !items.length;
  }

  function rankItem(id, material) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'material-rank-link';
    link.href = material.href;
    link.dataset.materialId = id;
    link.dataset.analyticsEvent = 'material_click';
    link.dataset.clickLocation = 'materials_ranking';
    link.textContent = material.title;
    item.append(link);
    return item;
  }

  async function loadRanking() {
    try {
      const [response, materials] = await Promise.all([
        fetch(section.dataset.src, { cache: 'no-store' }),
        catalogue,
      ]);
      if (!response.ok) throw Error('Ranking unavailable');
      const data = await response.json();
      const generated = Date.parse(data.generatedAt);
      const age = Date.now() - generated;
      if (!Array.isArray(data.popular) || !Number.isFinite(age) ||
          age < -300000 || age > 72 * 60 * 60 * 1000) throw Error('Ranking expired or invalid');
      const items = [];
      const shown = new Set();
      for (const row of data.popular) {
        const material = materials.get(row?.id);
        if (!material || shown.has(row.id) || !Number.isInteger(row.rank) || row.rank < 1 || row.rank > 3) continue;
        items.push(rankItem(row.id, material));
        shown.add(row.id);
        if (items.length === 3) break;
      }
      list.replaceChildren(...items);
    } catch {
      list.replaceChildren();
    }
    section.hidden = list.children.length === 0;
  }

  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) loadPins();
  });
  window.addEventListener('pageshow', () => loadPins());
  window.addEventListener('material-pins-sync-change', loadPins);
  loadPins();
  loadRanking();
})();
