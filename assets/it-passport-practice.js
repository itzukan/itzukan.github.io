(() => {
  'use strict';

  const get = id => document.getElementById(id);
  const countButtons = [...document.querySelectorAll('[data-count]')];
  const form = get('practice-question');
  const review = get('review');
  const previewContainer = get('review-content');
  const parser = new DOMParser();
  const course = document.body.dataset.dojo;
  const series = ['fe', 'fe-b'].includes(course) ? course : 'it-passport';
  const storageKey = 'itzukan.' + series + '.practice.v1';
  let bank = [];
  let questions = [];
  let index = 0;
  let answers = [];
  let draft = null;
  let savedRaw = null;
  let resumable = null;
  let imported = null;
  const transferPrefix = '#resume=v1.';
  let transferToken = location.hash.startsWith('#resume=') ? location.hash : '';
  if (transferToken) history.replaceState(history.state, '', location.pathname + location.search);

  function questionId(path, prompt, answer, choices, code) {
    const parts = [path, prompt, answer, choices];
    if (code) parts.push(code);
    const content = JSON.stringify(parts);
    // Keep portable links short and distinguish questions whose content has changed.
    let hash = 2166136261;
    for (let i = 0; i < content.length; i++) hash = Math.imul(hash ^ content.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(36);
  }

  async function readPage(path) {
    const response = await fetch(path, { signal: AbortSignal.timeout(10000) });
    if (!response.ok || new URL(response.url).origin !== location.origin) {
      throw new Error('教材ページを取得できませんでした。');
    }
    return parser.parseFromString(await response.text(), 'text/html');
  }

  function readQuestions(page, path) {
    const title = page.querySelector('h1')?.textContent.trim();
    const sections = [];
    const found = [];
    let filtered = false;
    let eligible = false;
    for (const section of page.querySelectorAll('main > section')) {
      const quizzes = section.querySelectorAll('form[data-answer]');
      if (!quizzes.length) sections.push(section);
      for (const quiz of quizzes) {
        // A lesson can be listed in both exams. Untagged questions are shared with every exam listing it.
        const audiences = quiz.dataset.dojoSeries;
        if (audiences && !audiences.trim().split(/\s+/).includes(series)) {
          filtered = true;
          continue;
        }
        eligible = true;
        const prompt = quiz.querySelector('legend')?.textContent.trim();
        const code = quiz.querySelector('.question-code')?.textContent.trim();
        const { answer, correct } = quiz.dataset;
        const choices = [...quiz.querySelectorAll('label:has(input[name="answer"])')].map(label => ({
          text: label.textContent.trim(),
          value: label.querySelector('input[name="answer"]').value,
        }));
        if (title && prompt && correct && choices.length >= 2
            && choices.some(choice => choice.value === answer)
            && new Set(choices.map(choice => choice.value)).size === choices.length) {
          const explanation = correct.replace(/^正解[。！!]\s*/, '');
          const id = questionId(path, prompt, answer, choices, code);
          found.push({ id, title, path, prompt, code, answer, explanation, choices, page, sections: [...sections] });
        }
      }
    }
    if (!found.length && (eligible || !filtered)) throw new Error('確認問題が見つかりませんでした。');
    return found;
  }

  async function loadBank() {
    get('retry').hidden = true;
    get('bank-status').textContent = '教材の確認問題を読み込み中…';
    countButtons.forEach(button => { button.disabled = true; });
    try {
      const catalogue = await readPage('/materials/categories/');
      const links = catalogue.querySelectorAll('#' + series + ' .subject a[data-material-id]');
      const paths = [...new Set([...links].map(link => link.getAttribute('href')))]
        .filter(path => /^\/materials\/(fe|fe-b|it-passport)\/(?!practice\/)[a-z0-9-]+\/$/.test(path));
      const loaded = await Promise.allSettled(paths.map(async path => readQuestions(await readPage(path), path)));
      const unique = new Map();
      for (const lesson of loaded) {
        if (lesson.status === 'fulfilled') {
          for (const question of lesson.value) unique.set(question.prompt, question);
        }
      }
      bank = [...unique.values()];
      countButtons.forEach(button => { button.disabled = Number(button.dataset.count) > bank.length; });
      const partial = loaded.some(lesson => lesson.status === 'rejected');
      const availability = countButtons.some(button => button.disabled) ? '問題が揃うと選べる問題数が増えます。' : '出題順は毎回ランダムです。';
      get('bank-status').textContent = '出題できる問題は現在' + bank.length + '問です。'
        + (partial ? '一部の教材を読み込めませんでした。' : availability);
      get('retry').hidden = !partial && bank.length > 0;
      showResume();
      showTransfer();
    } catch {
      get('bank-status').textContent = '問題を読み込めませんでした。再読み込みを試してください。';
      get('retry').hidden = false;
    }
  }

  function restore(saved, findQuestion) {
    if (!saved || !Array.isArray(saved.questions) || !Array.isArray(saved.answers)) return null;
    const count = saved.questions.length;
    if (!countButtons.some(button => Number(button.dataset.count) === count)) return null;
    if (!Number.isInteger(saved.index) || saved.index < 0 || saved.index >= count
        || ![saved.index, saved.index + 1].includes(saved.answers.length)) return null;

    const restored = saved.questions.map(entry => {
      const question = findQuestion(entry);
      if (!question || !Array.isArray(entry.order)) return null;
      const choices = entry.order.map(value => question.choices.find(choice => choice.value === value));
      if (choices.length !== question.choices.length || choices.some(choice => !choice)
          || new Set(entry.order).size !== choices.length) return null;
      return { ...question, choices };
    });
    if (restored.some(question => !question) || new Set(restored.map(question => question.prompt)).size !== count
        || saved.answers.some((value, position) => !restored[position].choices.some(choice => choice.value === value))
        || (saved.draft != null && !restored[saved.index].choices.some(choice => choice.value === saved.draft))) return null;
    return { ...saved, questions: restored };
  }

  function progressLabel(session) {
    return session.questions.length + '問コース · ' + session.answers.length + '問回答済み';
  }

  function showResume() {
    resumable = null;
    get('resume-panel').hidden = true;
    get('resume').hidden = true;
    get('restart-note').hidden = true;
    let saved;
    try {
      savedRaw = localStorage.getItem(storageKey);
      saved = JSON.parse(savedRaw);
    } catch {
      return;
    }
    if (!saved) return;
    resumable = restore(saved, entry => bank.find(question => question.prompt === entry?.prompt && question.path === entry?.path));
    get('resume-panel').hidden = false;
    get('restart-note').hidden = false;
    if (!resumable) {
      get('resume-status').textContent = '保存済みの問題を読み込めませんでした。再読み込みをお試しください。';
      get('retry').hidden = false;
      return;
    }
    get('resume-status').textContent = progressLabel(resumable);
    get('resume').hidden = false;
  }

  function showTransfer() {
    if (!transferToken) return;
    imported = null;
    get('transfer-panel').hidden = false;
    get('accept-transfer').hidden = true;
    const status = get('transfer-status');
    try {
      const encoded = transferToken.slice(transferPrefix.length);
      if (!transferToken.startsWith(transferPrefix) || !/^[A-Za-z0-9_-]{1,5000}$/.test(encoded)) throw new Error();
      const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
      const saved = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
      imported = restore(saved, entry => {
        const matches = bank.filter(question => question.id === entry?.id);
        return matches.length === 1 ? matches[0] : null;
      });
    } catch {
      status.textContent = '続きのリンクを読み取れませんでした。リンク全体をコピーし直してください。';
      return;
    }
    if (!imported) {
      status.textContent = 'このリンクの問題を読み込めませんでした。問題が更新された場合は、元の端末で新しいリンクをコピーしてください。';
      get('retry').hidden = false;
      return;
    }
    status.textContent = progressLabel(imported) + (savedRaw ? '。再開すると、このブラウザの途中経過が置き換わります。' : '。');
    get('accept-transfer').hidden = false;
  }

  function closeTransfer() {
    transferToken = '';
    imported = null;
    get('transfer-panel').hidden = true;
  }

  async function copyProgress() {
    const snapshot = {
      questions: questions.map(question => ({ id: question.id, order: question.choices.map(choice => choice.value) })),
      index, answers, draft,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    const encoded = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
      .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    const url = location.origin + location.pathname + transferPrefix + encoded;
    const fallback = get('resume-link');
    try {
      await navigator.clipboard.writeText(url);
      fallback.hidden = true;
      get('copy-status').textContent = 'コピーしました。使いたい端末でこのリンクを開いてください。';
    } catch {
      fallback.value = url;
      fallback.hidden = false;
      fallback.select();
      get('copy-status').textContent = '下のリンクをコピーして、使いたい端末で開いてください。';
    }
  }

  function saveProgress(replace = false) {
    const status = get('storage-status');
    try {
      if (!replace && localStorage.getItem(storageKey) !== savedRaw) {
        status.textContent = '別のタブで保存内容が更新されました。このタブの進み具合は保存されません。';
        return;
      }
      const value = JSON.stringify({
        questions: questions.map(question => ({
          path: question.path,
          prompt: question.prompt,
          order: question.choices.map(choice => choice.value),
        })),
        index, answers, draft,
      });
      localStorage.setItem(storageKey, value);
      savedRaw = value;
      status.textContent = '進み具合はこのブラウザに自動で保存されます。';
    } catch {
      status.textContent = 'このブラウザでは途中経過を保存できません。';
    }
  }

  function shuffled(items) {
    const result = [...items];
    for (let last = result.length - 1; last > 0; last--) {
      const candidate = Math.floor(Math.random() * (last + 1));
      [result[last], result[candidate]] = [result[candidate], result[last]];
    }
    return result;
  }

  function showQuestion() {
    const question = questions[index];
    get('copy-status').textContent = '';
    get('resume-link').hidden = true;
    get('progress').textContent = (index + 1) + ' / ' + questions.length + '問';
    get('prompt').textContent = question.prompt;
    const code = get('question-code');
    if (code) {
      code.textContent = question.code || '';
      code.hidden = !question.code;
    }
    const labels = question.choices.map(choice => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'answer';
      radio.value = choice.value;
      radio.required = true;
      radio.checked = choice.value === (answers[index] ?? draft);
      label.append(radio, choice.text);
      return label;
    });
    get('choices').replaceChildren(...labels);
    form.querySelector('button').hidden = false;
    get('result').hidden = true;
    get('next').hidden = true;
    review.open = false;
    review.hidden = Boolean(question.code);
    previewContainer.replaceChildren();
    get('source').href = question.path;
    get('source').textContent = question.title + 'の教材ページを開く';
    get('progress').focus();
    if (answers[index] !== undefined) showAnswer(answers[index]);
  }

  function openExercise() {
    get('setup').hidden = true;
    get('summary').hidden = true;
    get('exercise').hidden = false;
    showQuestion();
  }

  function start(count) {
    if (count > bank.length) return;
    closeTransfer();
    questions = shuffled(bank).slice(0, count).map(question => ({
      ...question,
      choices: shuffled(question.choices),
    }));
    index = 0;
    answers = [];
    draft = null;
    openExercise();
    saveProgress(true);
  }

  function resizeReview() {
    const frame = previewContainer.querySelector('iframe');
    const body = frame?.contentDocument?.body;
    if (review.open && body) frame.style.height = Math.ceil(body.getBoundingClientRect().height + 4) + 'px';
  }

  function showReview() {
    if (!review.open) return;
    if (previewContainer.firstChild) {
      resizeReview();
      return;
    }
    const question = questions[index];
    if (!question?.sections.length) return;
    // Reuse the static lesson diagrams without running scripts or recording a second page view.
    const preview = document.implementation.createHTMLDocument(question.title);
    preview.documentElement.lang = 'ja';
    preview.head.append(...[...question.page.querySelectorAll('style, link[rel="stylesheet"]')]
      .map(element => preview.importNode(element, true)));
    const style = preview.createElement('style');
    style.textContent = 'body{margin:0;display:flow-root}main.wrap{padding-block:8px;width:calc(100% - 16px)}main>.panel:first-child{margin-top:0}';
    preview.head.append(style);
    const main = preview.createElement('main');
    main.className = 'wrap';
    main.append(...question.sections.map(section => preview.importNode(section, true)));
    for (const element of main.querySelectorAll('script, form, iframe')) element.remove();
    for (const input of main.querySelectorAll('input, button, select, textarea')) input.disabled = true;
    preview.body.append(main);

    const frame = document.createElement('iframe');
    frame.title = question.title + 'の解説';
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.addEventListener('load', resizeReview);
    frame.srcdoc = '<!doctype html>' + preview.documentElement.outerHTML;
    previewContainer.append(frame);
  }

  function showAnswer(selected) {
    const question = questions[index];
    const correct = selected === question.answer;
    for (const input of form.querySelectorAll('input')) input.disabled = true;
    form.querySelector('button').hidden = true;
    const answer = question.choices.find(choice => choice.value === question.answer);
    get('verdict').textContent = correct ? '正解' : '不正解 · 正解は「' + answer.text + '」';
    get('explanation').textContent = question.explanation;
    get('result').dataset.correct = String(correct);
    get('result').hidden = false;
    get('next').textContent = index + 1 === questions.length ? '結果を見る' : '次の問題';
    get('next').hidden = false;
    review.hidden = false;
    review.open = true;
  }

  form.addEventListener('change', event => {
    if (event.target.name !== 'answer' || answers[index] !== undefined) return;
    draft = event.target.value;
    saveProgress();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (answers[index] !== undefined) return;
    const selected = new FormData(form).get('answer');
    if (selected === null) return;
    answers.push(selected);
    draft = null;
    saveProgress();
    showAnswer(selected);
    get('result').focus();
  });

  get('next').addEventListener('click', () => {
    if (get('next').hidden) return;
    if (++index < questions.length) {
      showQuestion();
      saveProgress();
      return;
    }
    try {
      if (localStorage.getItem(storageKey) === savedRaw) localStorage.removeItem(storageKey);
    } catch {}
    const correctCount = answers.filter((answer, position) => answer === questions[position].answer).length;
    get('exercise').hidden = true;
    get('summary').hidden = false;
    get('score').textContent = questions.length + '問中 ' + correctCount + '問正解';
    get('summary-title').focus();
  });
  get('again').addEventListener('click', () => start(questions.length));
  get('choose').addEventListener('click', () => {
    get('summary').hidden = true;
    get('setup').hidden = false;
    showResume();
    get('setup-title').focus();
  });
  get('resume').addEventListener('click', () => {
    if (!resumable) return;
    closeTransfer();
    ({ questions, index, answers, draft } = resumable);
    openExercise();
    saveProgress();
  });
  get('copy-progress').addEventListener('click', copyProgress);
  get('accept-transfer').addEventListener('click', () => {
    if (!imported) return;
    ({ questions, index, answers, draft } = imported);
    closeTransfer();
    openExercise();
    saveProgress(true);
  });
  get('cancel-transfer').addEventListener('click', closeTransfer);
  get('retry').addEventListener('click', loadBank);
  countButtons.forEach(button => button.addEventListener('click', () => start(Number(button.dataset.count))));
  review.addEventListener('toggle', showReview);
  window.addEventListener('resize', resizeReview);
  loadBank();
})();
