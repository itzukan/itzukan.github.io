'use strict';

const materialSearch = document.querySelector('.materials-search');
const materialQuery = document.querySelector('#materials-query');
const clearMaterialQuery = document.querySelector('#materials-clear');
const materialCount = document.querySelector('#materials-count');

function normalizeSearchText(value) {
  return value.normalize('NFKC').toLowerCase().trim();
}

const materials = [...document.querySelectorAll('#material-cards .card')].map(card => ({
  card,
  searchText: normalizeSearchText(card.textContent + ' ' + (card.dataset.searchKeywords || '')),
}));

function filterMaterials() {
  const terms = normalizeSearchText(materialQuery.value).split(/[\s、,]+/).filter(Boolean);
  let visibleCount = 0;
  for (const { card, searchText } of materials) {
    const matches = terms.every(term => searchText.includes(term));
    card.hidden = !matches;
    if (matches) visibleCount++;
  }
  clearMaterialQuery.hidden = materialQuery.value === '';
  materialCount.textContent = terms.length === 0 ? ''
    : visibleCount === 0 ? '該当する教材がありません。別の用語で検索してください。'
    : visibleCount + '件の教材が見つかりました。';
}

materialQuery.addEventListener('input', filterMaterials);
clearMaterialQuery.addEventListener('click', () => {
  materialQuery.value = '';
  filterMaterials();
  materialQuery.focus();
});
window.addEventListener('pageshow', filterMaterials);
filterMaterials();
materialSearch.hidden = false;
