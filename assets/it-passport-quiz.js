(() => {
  'use strict';
  for (const form of document.querySelectorAll('form[data-answer]')) {
    const result = form.querySelector('output, [role="status"]');
    form.addEventListener('change', () => { result.textContent = ''; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      result.textContent = new FormData(form).get('answer') === form.dataset.answer
        ? form.dataset.correct
        : form.dataset.retry;
    });
  }
})();
