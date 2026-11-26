const chapter = document.querySelector('.extra-chapter');
const osButtons = [...chapter.querySelectorAll('[data-os-select]')];

if (osButtons.length) {
  const controls = chapter.querySelector('.chapter-os-picker');
  controls.hidden = false;
  const choose = os => {
    chapter.dataset.os = os;
    for (const button of osButtons) button.setAttribute('aria-pressed', String(button.dataset.osSelect === os));
  };
  choose('windows');
  for (const button of osButtons) button.addEventListener('click', () => choose(button.dataset.osSelect));
}

const run = document.getElementById('run-index-plans');
if (run) {
  run.hidden = false;
  run.addEventListener('click', async () => {
    const status = document.getElementById('index-run-status');
    const results = document.getElementById('index-live-results');
    const plans = [...results.querySelectorAll('code')];
    run.disabled = true;
    results.hidden = true;
    status.textContent = 'PostgreSQLを読み込んで実行しています…';
    let db;
    try {
      const { PGlite } = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.6.0/dist/index.js');
      db = new PGlite();
      const sql = document.getElementById('index-example-sql').textContent;
      const response = await db.exec(sql);
      const output = response.filter(result => result.fields.some(field => field.name === 'QUERY PLAN'));
      if (output.length !== plans.length) throw new Error('Unexpected number of query plans');
      for (const [index, plan] of plans.entries()) {
        plan.replaceChildren(...output[index].rows.flatMap((row, line) => {
          const text = row['QUERY PLAN'];
          const token = line === 0 && text.match(/^(?:Seq Scan|Index Only Scan|Index Scan|Bitmap Heap Scan)/)?.[0];
          if (!token) return [line ? '\n' : '', text];
          const mark = document.createElement('mark');
          mark.textContent = token;
          return [mark, text.slice(token.length)];
        }));
      }
      results.hidden = false;
      status.textContent = '実行しました。3つの実行計画の先頭行を比べてください。';
    } catch {
      status.textContent = 'ブラウザーで実行できませんでした。下の結果例を確認するか、PostgreSQLでSQLを実行してください。';
    } finally {
      if (db) await db.close().catch(() => {});
      run.disabled = false;
    }
  });
}
