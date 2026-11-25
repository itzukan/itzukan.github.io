'use strict';

const edit = document.getElementById('edit-file');
const commit = document.getElementById('commit-file');
const reset = document.getElementById('reset-demo');
const working = document.getElementById('working-file');
const savedMarker = document.getElementById('saved-marker');
const committedMarker = document.getElementById('committed-marker');
const selected = document.getElementById('history-file');
const historyDialog = document.getElementById('history-dialog');
const historyList = document.getElementById('history-list');
const initialHistory = historyList.firstElementChild;
const status = document.getElementById('demo-status');
const initialStatus = status.textContent;

function printTime(time) {
  return '開店時刻：' + time;
}

function start() {
  historyList.replaceChildren(initialHistory);
  working.textContent = printTime('10:00');
  savedMarker.hidden = true;
  committedMarker.hidden = true;
  status.textContent = initialStatus;
  edit.disabled = false;
  commit.disabled = true;
  reset.disabled = false;
}

initialHistory.querySelector('button').disabled = false;
historyList.addEventListener('click', event => {
  const version = event.target.closest('button[data-version]');
  if (!version) return;
  selected.textContent = printTime(version.dataset.version);
  historyDialog.showModal();
});
edit.addEventListener('click', () => {
  working.textContent = printTime('09:00');
  savedMarker.hidden = false;
  status.textContent = 'ファイルに9時開店を保存しました。履歴にあるのは10時開店のコミットだけです。②を押して、9時開店もコミットしましょう。';
  edit.disabled = true;
  commit.disabled = false;
  commit.focus();
});
commit.addEventListener('click', () => {
  const entry = document.createElement('li');
  const title = document.createElement('span');
  title.textContent = '開店時刻を9時に変更する';
  const view = document.createElement('button');
  view.type = 'button';
  view.dataset.version = '09:00';
  view.setAttribute('aria-haspopup', 'dialog');
  view.textContent = '9時開店のコミットを開く';
  entry.append(title, view);
  historyList.prepend(entry);
  committedMarker.hidden = false;
  status.textContent = '今日の案内文をコミットしました。「10時開店のコミットを開く」で昨日の案内文を確認しましょう。作業中のファイルには9時開店が残ります。';
  commit.disabled = true;
  initialHistory.querySelector('button').focus();
});
reset.addEventListener('click', () => {
  start();
  edit.focus();
});
start();

const branchActions = document.querySelectorAll('[data-branch-step]');
const branchDiagram = document.getElementById('branch-diagram');
const branchMessage = document.getElementById('branch-message');
const branchStages = {
  start: '作業ブランチを作成。両方とも10時開店のコミットを指します。',
  commit: '作業ブランチは9時開店。main は10時開店のままです。',
  merge: 'main にマージしました。両方とも9時開店のコミットを指します。',
};

for (const button of branchActions) {
  button.disabled = false;
  button.addEventListener('click', () => {
    const stage = button.dataset.branchStep;
    branchDiagram.dataset.stage = stage;
    branchMessage.textContent = branchStages[stage];
    for (const step of branchActions) {
      step.setAttribute('aria-pressed', String(step === button));
    }
  });
}

const reviewQuiz = document.getElementById('review-quiz');
const reviewFeedback = document.getElementById('review-feedback');
const reviewAnswer = document.getElementById('review-answer');
const reviewMarkers = reviewQuiz.closest('figure').querySelectorAll('.git-review-marker');
const reviewResponses = {
  approve: '依頼は営業時間の更新です。2つのファイルの変更がどちらも必要か、もう一度見てみましょう。',
  shop: 'shop.txt では開店時刻が変わっています。もう一方のファイルで何が変わったか確認しましょう。',
  menu: '正解です。価格の変更は営業時間の更新に含まれないので、別のPRに分けてもらいます。',
};

reviewQuiz.addEventListener('change', () => {
  reviewFeedback.textContent = '';
  reviewAnswer.hidden = true;
  for (const marker of reviewMarkers) marker.hidden = true;
});
reviewQuiz.addEventListener('submit', event => {
  event.preventDefault();
  const decision = new FormData(reviewQuiz).get('decision');
  reviewFeedback.textContent = reviewResponses[decision] ?? '';
  reviewAnswer.hidden = decision !== 'menu';
  for (const marker of reviewMarkers) marker.hidden = reviewAnswer.hidden;
});
reviewQuiz.querySelector('fieldset').disabled = false;
