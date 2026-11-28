const demo = document.getElementById('cookie-demo');
const buttons = [...demo.querySelectorAll('[data-cookie-mode]')];
const outcome = document.getElementById('outcome');
const explanation = document.getElementById('explanation');

const results = {
  with: ['✅ 注文履歴が開きました', 'Cookieの番号を照合できたので、サーバーがあなたの注文履歴を返しました。'],
  without: ['🔒 ログイン画面が開きました', 'サーバーはどのログインにひもづくリクエストか確認できませんでした。'],
};

for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const option of buttons) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    const [title, detail] = results[button.dataset.cookieMode];
    outcome.textContent = title;
    explanation.textContent = detail;
  });
}
demo.hidden = false;
