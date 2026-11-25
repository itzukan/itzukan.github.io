(() => {
  'use strict';

  const section = document.querySelector('#materials-ranking');
  if (!section) return;
  const list = section.querySelector('#materials-ranking-list');
  const query = document.querySelector('#materials-query');
  const clear = document.querySelector('#materials-clear');
  const materials = new Map(
    [...document.querySelectorAll('#material-cards .card')].map(card => {
      const link = card.querySelector('a[data-material-id]');
      const title = [...card.querySelector('h3').childNodes].map(node => node.textContent).join(' ').trim();
      return [link.dataset.materialId, { href: link.getAttribute('href'), title }];
    }),
  );

  function updateVisibility() {
    const searching = /[^\s、,]/.test(query.value.normalize('NFKC'));
    section.hidden = searching || list.children.length === 0;
  }

  function rankItem(id, rank, material) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'material-rank-link';
    link.href = material.href;
    link.dataset.materialId = id;
    link.dataset.analyticsEvent = 'material_click';
    link.dataset.clickLocation = 'materials_ranking';
    const position = document.createElement('span');
    position.className = 'material-rank-position';
    position.textContent = rank + '位';
    link.append(position, document.createTextNode(material.title));
    item.append(link);
    return item;
  }

  async function loadRanking() {
    try {
      const response = await fetch(section.dataset.src, { cache: 'no-store' });
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
        items.push(rankItem(row.id, row.rank, material));
        shown.add(row.id);
        if (items.length === 3) break;
      }
      list.replaceChildren(...items);
    } catch {
      list.replaceChildren();
    }
    updateVisibility();
  }

  query.addEventListener('input', updateVisibility);
  clear.addEventListener('click', updateVisibility);
  window.addEventListener('pageshow', event => { if (event.persisted) loadRanking(); });
  loadRanking();
})();
