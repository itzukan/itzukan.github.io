(() => {
  'use strict';

  const storageKey = 'itzukan-material-pins-v1';
  const input = document.querySelector('#materials-query');
  const clear = document.querySelector('#materials-clear');
  const pinnedSection = document.querySelector('#pinned-materials');
  const pinnedCount = pinnedSection.querySelector('[data-pin-count]');
  const pinnedGrid = document.querySelector('#pinned-material-cards');
  const allGrid = document.querySelector('#all-material-cards');
  const entries = [...allGrid.querySelectorAll('.card')].map(card => {
    const id = card.querySelector('a[data-material-id]').dataset.materialId;
    const title = [...card.querySelector('h3').childNodes].map(node => node.textContent).join(' ').trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'material-pin';
    button.setAttribute('aria-label', title + 'をピン留め');
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📌';
    button.append(icon);
    card.prepend(button);
    return { id, card, button };
  });

  function readPins() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return null;
    }
  }

  let pins = readPins() ?? new Set();
  const sync = window.materialPinSync;

  function placeCards(grid, cards) {
    cards.forEach((card, index) => {
      if (grid.children[index] !== card) grid.insertBefore(card, grid.children[index] ?? null);
    });
  }

  function render() {
    const focused = document.activeElement;
    const searching = /[^\s、,]/.test(input.value.normalize('NFKC'));
    const pinnedCards = [];
    const otherCards = [];
    const visiblePins = sync?.pins() ?? pins;
    const selected = visiblePins instanceof Set ? visiblePins : new Set(visiblePins);
    for (const { id, card, button } of entries) {
      const pinned = selected.has(id);
      button.setAttribute('aria-disabled', String(!!sync?.locked()));
      button.setAttribute('aria-pressed', String(pinned));
      button.title = pinned ? 'ピン留めを解除' : 'ピン留め';
      (pinned && !searching ? pinnedCards : otherCards).push(card);
    }
    placeCards(pinnedGrid, pinnedCards);
    placeCards(allGrid, otherCards);
    pinnedSection.hidden = pinnedCards.length === 0;
    pinnedCount.textContent = `（${pinnedCards.length}件）`;
    if (focused !== document.activeElement && focused?.isConnected) focused.focus({ preventScroll: true });
  }

  for (const { id, button } of entries) {
    button.addEventListener('click', () => {
      if (sync?.locked()) return;
      const accountPins = sync?.pins();
      if (accountPins) {
        sync.setPin(id, !accountPins.includes(id));
        return;
      }
      if (pins.has(id)) pins.delete(id);
      else pins.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...pins]));
      } catch {
        // Keep pins in memory when storage is unavailable.
      }
      window.dispatchEvent(new Event('material-pins-sync-change'));
    });
  }

  function restorePins() {
    pins = readPins() ?? pins;
    render();
  }

  input.addEventListener('input', render);
  clear.addEventListener('click', render);
  window.addEventListener('material-pins-sync-change', restorePins);
  window.addEventListener('pageshow', event => { if (event.persisted) restorePins(); });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) restorePins();
  });
  render();
})();
