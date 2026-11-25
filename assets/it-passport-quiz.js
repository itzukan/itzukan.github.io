(() => {
  'use strict';
  for (const form of document.querySelectorAll('form.quiz')) {
    const result = form.querySelector('output');
    form.addEventListener('change', () => { result.textContent = ''; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      result.textContent = new FormData(form).get('answer') === form.dataset.answer
        ? form.dataset.correct
        : form.dataset.retry;
    });
  }
})();
