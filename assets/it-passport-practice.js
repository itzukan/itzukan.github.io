(() => {
  'use strict';

  const get = id => document.getElementById(id);
  const countButtons = [...document.querySelectorAll('[data-count]')];
  const form = get('practice-question');
  const review = get('review');
  const previewContainer = get('review-content');
  const parser = new DOMParser();
  let bank = [];
  let questions = [];
  let index = 0;
  let correctCount = 0;

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
    for (const section of page.querySelectorAll('main > section')) {
      const quizzes = section.querySelectorAll('form[data-answer]');
      if (!quizzes.length) sections.push(section);
      for (const quiz of quizzes) {
        const prompt = quiz.querySelector('legend')?.textContent.trim();
        const { answer, correct } = quiz.dataset;
        const choices = [...quiz.querySelectorAll('label:has(input[name="answer"])')].map(label => ({
          text: label.textContent.trim(),
          value: label.querySelector('input[name="answer"]').value,
        }));
        if (title && prompt && correct && choices.length >= 2
            && choices.some(choice => choice.value === answer)
            && new Set(choices.map(choice => choice.value)).size === choices.length) {
          const explanation = correct.replace(/^正解[。！!]\s*/, '');
          found.push({ title, path, prompt, answer, explanation, choices, page, sections: [...sections] });
        }
      }
    }
    if (!found.length) throw new Error('確認問題が見つかりませんでした。');
    return found;
  }

  async function loadBank() {
    get('retry').hidden = true;
    get('bank-status').textContent = '教材の確認問題を読み込み中…';
    countButtons.forEach(button => { button.disabled = true; });
    try {
      const catalogue = await readPage('/materials/categories/');
      const links = catalogue.querySelectorAll('#it-passport .subject a[data-material-id]');
      const paths = [...new Set([...links].map(link => link.getAttribute('href')))]
        .filter(path => /^\/materials\/it-passport\/[a-z0-9-]+\/$/.test(path));
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
      const availability = bank.length < 30 ? '問題が揃うと選べる問題数が増えます。' : '出題順は毎回ランダムです。';
      get('bank-status').textContent = '出題できる問題は現在' + bank.length + '問です。'
        + (partial ? '一部の教材を読み込めませんでした。' : availability);
      get('retry').hidden = !partial && bank.length > 0;
    } catch {
      get('bank-status').textContent = '問題を読み込めませんでした。再読み込みを試してください。';
      get('retry').hidden = false;
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
    get('progress').textContent = (index + 1) + ' / ' + questions.length + '問';
    get('prompt').textContent = question.prompt;
    const labels = shuffled(question.choices).map(choice => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'answer';
      radio.value = choice.value;
      radio.required = true;
      label.append(radio, choice.text);
      return label;
    });
    get('choices').replaceChildren(...labels);
    form.querySelector('button').hidden = false;
    get('result').hidden = true;
    get('next').hidden = true;
    review.open = false;
    previewContainer.replaceChildren();
    get('source').href = question.path;
    get('source').textContent = question.title + 'の教材ページを開く';
    get('progress').focus();
  }

  function start(count) {
    if (count > bank.length) return;
    questions = shuffled(bank).slice(0, count);
    index = 0;
    correctCount = 0;
    get('setup').hidden = true;
    get('summary').hidden = true;
    get('exercise').hidden = false;
    showQuestion();
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

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!get('result').hidden) return;
    const question = questions[index];
    const selected = new FormData(form).get('answer');
    if (selected === null) return;
    const correct = selected === question.answer;
    if (correct) correctCount++;
    for (const input of form.querySelectorAll('input')) input.disabled = true;
    form.querySelector('button').hidden = true;
    const answer = question.choices.find(choice => choice.value === question.answer);
    get('verdict').textContent = correct ? '正解' : '不正解 · 正解は「' + answer.text + '」';
    get('explanation').textContent = question.explanation;
    get('result').dataset.correct = String(correct);
    get('result').hidden = false;
    get('next').textContent = index + 1 === questions.length ? '結果を見る' : '次の問題';
    get('next').hidden = false;
    review.open = true;
    get('result').focus();
  });

  get('next').addEventListener('click', () => {
    if (++index < questions.length) {
      showQuestion();
      return;
    }
    get('exercise').hidden = true;
    get('summary').hidden = false;
    get('score').textContent = questions.length + '問中 ' + correctCount + '問正解';
    get('summary-title').focus();
  });
  get('again').addEventListener('click', () => start(questions.length));
  get('choose').addEventListener('click', () => {
    get('summary').hidden = true;
    get('setup').hidden = false;
    get('setup-title').focus();
  });
  get('retry').addEventListener('click', loadBank);
  countButtons.forEach(button => button.addEventListener('click', () => start(Number(button.dataset.count))));
  review.addEventListener('toggle', showReview);
  window.addEventListener('resize', resizeReview);
  loadBank();
})();
