(() => {
  'use strict';

  const normalize = value => value.normalize('NFKC').toLowerCase().trim();
  const termsFor = value => normalize(value).split(/[\s、,]+/).filter(Boolean);
  const matches = (entry, terms) => terms.every(term => entry.searchText.includes(term));

  function catalogueEntries(root) {
    return [...root.querySelectorAll('#material-cards .card')].map(card => ({
      card,
      title: [...card.querySelector('h3').childNodes].map(node => node.textContent).filter(Boolean).join(' ').trim(),
      path: card.querySelector('a[data-material-id]').getAttribute('href'),
      searchText: normalize(card.textContent + ' ' + (card.dataset.searchKeywords || '')),
    }));
  }

  function initCatalogue(search) {
    const input = search.querySelector('#materials-query');
    const clear = search.querySelector('#materials-clear');
    const status = document.querySelector('#materials-count');
    const entries = catalogueEntries(document);

    function filter() {
      const terms = termsFor(input.value);
      let count = 0;
      for (const entry of entries) {
        entry.card.hidden = !matches(entry, terms);
        if (!entry.card.hidden) count++;
      }
      clear.hidden = input.value === '';
      status.textContent = terms.length === 0 ? ''
        : count === 0 ? '該当する教材がありません。別の用語で検索してください。'
        : count + '件の教材が見つかりました。';
    }

    function focusFromLesson() {
      if (location.hash === '#search-materials') input.focus();
    }

    input.addEventListener('input', filter);
    clear.addEventListener('click', () => {
      input.value = '';
      filter();
      input.focus();
    });
    window.addEventListener('pageshow', filter);
    window.addEventListener('hashchange', focusFromLesson);
    filter();
    search.hidden = false;
    focusFromLesson();
  }

  function initLesson(fallback) {
    const form = document.createElement('form');
    form.className = 'lesson-search';
    form.setAttribute('role', 'search');
    form.setAttribute('aria-label', '無料教材検索');
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = '教材名・用語で検索';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', '無料教材を検索');
    const panel = document.createElement('div');
    panel.id = 'lesson-search-results';
    panel.className = 'lesson-search-results';
    panel.hidden = true;
    input.setAttribute('aria-controls', panel.id);
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const results = document.createElement('ul');
    panel.append(status, results);
    form.append(input, panel);
    fallback.replaceWith(form);

    let catalogueRequest;
    function getCatalogue() {
      catalogueRequest ??= fetch('/materials/').then(async response => {
        if (!response.ok) throw Error('Catalogue unavailable');
        return catalogueEntries(new DOMParser().parseFromString(await response.text(), 'text/html'));
      }).catch(error => {
        catalogueRequest = undefined;
        throw error;
      });
      return catalogueRequest;
    }

    function addResult(title, path) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = path;
      link.textContent = title;
      item.append(link);
      results.append(item);
    }

    let currentSearch = 0;
    async function updateResults() {
      const search = ++currentSearch;
      const terms = termsFor(input.value);
      panel.hidden = terms.length === 0;
      results.replaceChildren();
      if (panel.hidden) {
        status.textContent = '';
        return;
      }
      status.textContent = '教材を検索中…';
      try {
        const entries = await getCatalogue();
        if (search !== currentSearch) return;
        const found = entries.filter(entry => matches(entry, terms));
        status.textContent = found.length ? found.length + '件の教材' : '該当する教材がありません。';
        found.forEach(entry => addResult(entry.title, entry.path));
      } catch {
        if (search !== currentSearch) return;
        status.textContent = '検索結果を読み込めませんでした。';
        addResult('無料教材一覧で探す', fallback.href);
      }
    }

    function closeResults() {
      currentSearch++;
      panel.hidden = true;
      results.replaceChildren();
      status.textContent = '';
    }

    input.addEventListener('input', updateResults);
    input.addEventListener('focus', () => {
      if (panel.hidden && termsFor(input.value).length) updateResults();
    });
    form.addEventListener('focusout', event => {
      if (!form.contains(event.relatedTarget)) closeResults();
    });
    form.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        input.focus();
        closeResults();
      }
      if (event.key === 'ArrowDown' && !panel.hidden && event.target === input) {
        const first = results.querySelector('a');
        if (first) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!termsFor(input.value).length) return;
      await updateResults();
      results.querySelector('a')?.focus();
    });
  }

  const catalogue = document.querySelector('.materials-search');
  const lessonLink = document.querySelector('header .lesson-search-link');
  if (catalogue) initCatalogue(catalogue);
  else if (lessonLink) initLesson(lessonLink);
})();
