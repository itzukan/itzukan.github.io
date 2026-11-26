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
  const results = document.getElementById('index-live-results');
  const title = document.getElementById('index-result-title');
  const plans = [...results.querySelectorAll('code')];
  const methods = [...results.querySelectorAll('.index-plan-method')];
  const examples = plans.map(plan => plan.innerHTML);
  const exampleMethods = methods.map(method => method.textContent);
  run.hidden = false;
  run.addEventListener('click', async () => {
    const status = document.getElementById('index-run-status');
    run.disabled = true;
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
        const lines = output[index].rows.map(row => row['QUERY PLAN']);
        const scanType = lines[0]?.match(/^(?:Parallel )?(Seq Scan|Index Only Scan|Index Scan|Bitmap Heap Scan)/);
        const method = methods[index];
        if (method) {
          method.textContent = scanType?.[1] === 'Seq Scan' ? '表を順に読む'
            : scanType ? '索引を使う' : '下の実行計画を確認';
        }
        plan.replaceChildren(...lines.flatMap((text, line) => {
          const token = line === 0 && scanType?.[0];
          if (!token) return [line ? '\n' : '', text];
          const mark = document.createElement('mark');
          mark.textContent = token;
          return [mark, text.slice(token.length)];
        }));
      }
      if (title) title.textContent = '実行結果';
      results.hidden = false;
      status.textContent = '';
    } catch {
      for (const [index, plan] of plans.entries()) {
        plan.innerHTML = examples[index];
      }
      for (const [index, method] of methods.entries()) method.textContent = exampleMethods[index];
      if (title) title.textContent = '表示例';
      status.textContent = 'ブラウザーで実行できなかったため、表示例を載せています。';
    } finally {
      if (db) await db.close().catch(() => {});
      run.disabled = false;
    }
  });
}
