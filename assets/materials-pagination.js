(() => {
  'use strict';

  const pageSize = 12;
  const grid = document.getElementById('all-material-cards');
  const heading = document.getElementById('materials-title');
  if (!grid || !heading) return;

  const nav = document.createElement('nav');
  nav.className = 'materials-pagination';
  nav.setAttribute('aria-label', '教材一覧のページ送り');
  const previous = document.createElement('a');
  previous.textContent = '← 前へ';
  const status = document.createElement('p');
  status.className = 'materials-page-status';
  status.setAttribute('role', 'status');
  const next = document.createElement('a');
  next.textContent = '次へ →';
  nav.append(previous, status, next);
  grid.after(nav);
  heading.tabIndex = -1;

  function pageURL(page) {
    const url = new URL(location.href);
    if (page === 1) url.searchParams.delete('page');
    else url.searchParams.set('page', page);
    url.hash = '#free-materials';
    return url;
  }

  function render() {
    const cards = [...grid.children];
    const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
    const requested = Number(new URLSearchParams(location.search).get('page'));
    const page = Number.isInteger(requested) && requested > 0 ? Math.min(requested, pageCount) : 1;
    const first = (page - 1) * pageSize;
    cards.forEach((card, index) => card.toggleAttribute('data-page-hidden', index < first || index >= first + pageSize));
    previous.hidden = page === 1;
    next.hidden = page === pageCount;
    previous.href = pageURL(page - 1);
    next.href = pageURL(page + 1);
    nav.hidden = pageCount === 1;
    status.textContent = page + ' / ' + pageCount + 'ページ';
  }

  nav.addEventListener('click', (event) => {
    const anchor = event.target.closest('a');
    if (!anchor || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    history.pushState(null, '', anchor.href);
    render();
    heading.focus();
    heading.scrollIntoView();
  });
  new MutationObserver(render).observe(grid, { childList: true });
  window.addEventListener('popstate', render);
  render();
})();
