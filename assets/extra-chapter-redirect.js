(() => {
  const parent = location.pathname.match(/^\/materials\/(network|sql)\/(?:index\.html)?$/)?.[1];
  const ids = {
    network: ['port-number', 'firewall', 'remote-desktop', 'cdn-cache', 'round-robin'],
    sql: ['index-search-update'],
  };
  const chapter = location.hash.slice(1);
  if (ids[parent]?.includes(chapter)) location.replace('/materials/' + parent + '/' + chapter + '/' + location.search);
})();
