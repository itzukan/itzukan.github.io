'use strict';

const missions = trialMissions;
const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const progressKey = params.get('qa') === '1' ? null : 'itzukan-git-progress-v1-trial';
const completed = new Set();
try {
  const saved = progressKey && JSON.parse(localStorage.getItem(progressKey));
  if (Array.isArray(saved)) saved.filter(index => Number.isInteger(index) && index >= 0 && index < missions.length).forEach(index => completed.add(index));
} catch {}
const menu = missions.map(({ title }, index) => {
  const button = document.createElement('button');
  button.className = 'mission';
  button.type = 'button';
  button.textContent = title;
  button.addEventListener('click', () => load(index));
  byId('missions').append(button);
  return button;
});
let current = 0;
let recorded;
let working;
let staged;
let committed;
function renderFiles() {
  byId('branch').textContent = 'ブランチ main';
  const rows = Object.entries(working).map(([file, after]) => {
    const pending = Object.hasOwn(staged, file);
    const changed = (pending ? staged[file] : recorded[file]) !== after;
    const state = pending && changed ? 'ステージに追加済み・その後の修正あり'
      : pending ? 'ステージに追加済み'
      : changed ? '作業中の変更あり' : '変更なし';
    const row = document.createElement('div');
    row.className = 'workspace-row';
    const name = document.createElement('code');
    name.textContent = file;
    const label = document.createElement('span');
    label.textContent = state;
    row.append(name, label);
    return row;
  });
  byId('workspace').replaceChildren(...rows);
  byId('progress').textContent = '進捗 ' + completed.size + ' / ' + missions.length + '問';
  byId('trial-continuation').hidden = completed.size !== missions.length;
  menu.forEach((button, index) => {
    button.textContent = (completed.has(index) ? '✓ ' : '') + missions[index].title;
  });
}

function load(index, focus = true) {
  current = index;
  const mission = missions[index];
  recorded = Object.fromEntries(Object.entries(mission.files).map(([file, versions]) => [file, versions.before]));
  working = Object.fromEntries(Object.entries(mission.files).map(([file, versions]) => [file, versions.after]));
  staged = { ...mission.staged };
  committed = false;
  byId('commit-example-row').hidden = !mission.messageExample;
  for (const [id, text] of [
    ['mission-title', mission.title], ['request', mission.request],
    ['initial-files', mission.initial], ['hint', mission.hint], ['explanation', mission.explanation],
    ['commit-example', mission.messageExample ? 'git commit -m "' + mission.messageExample + '"' : ''],
    ['feedback', ''], ['output', 'まず git status でファイルの状態を確認できます。'],
  ]) byId(id).textContent = text;
  byId('command').value = '';
  byId('solution').hidden = true;
  byId('solution').open = false;
  byId('next').hidden = true;
  menu.forEach((button, number) => {
    if (number === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  renderFiles();
  if (focus) byId('mission-title').focus();
}

function finish(message) {
  completed.add(current);
  try { if (progressKey) localStorage.setItem(progressKey, JSON.stringify([...completed])); } catch {}
  byId('feedback').textContent = '✓ ' + message;
  byId('solution').hidden = false;
  byId('next').hidden = current === missions.length - 1;
  if (completed.size === missions.length) byId('feedback').textContent += ' 全' + missions.length + '問クリアです。';
}

function status() {
  const pending = Object.keys(staged);
  const changed = Object.entries(working)
    .filter(([file, after]) => (staged[file] ?? recorded[file]) !== after)
    .map(([file]) => file);
  return [
    'On branch main',
    pending.length ? 'Changes to be committed:\n  modified: ' + pending.join('\n  modified: ') : '',
    changed.length ? 'Changes not staged for commit:\n  modified: ' + changed.join('\n  modified: ') : '',
    pending.length || changed.length ? '' : 'nothing to commit, working tree clean',
  ].filter(Boolean).join('\n\n');
}

function diff(stagedOnly) {
  const parts = [];
  for (const [file, after] of Object.entries(working)) {
    const before = stagedOnly ? recorded[file] : staged[file] ?? recorded[file];
    const next = stagedOnly ? staged[file] : after;
    if (next === undefined || before === next) continue;
    parts.push(fileDiff(file, before, next));
  }
  return parts.join('\n\n') || '表示する差分はありません。';
}

function fileDiff(file, before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let shared = 0;
  while (shared < beforeLines.length && beforeLines[shared] === afterLines[shared]) shared++;
  return '--- a/' + file + '\n+++ b/' + file + '\n' + [
    ...beforeLines.slice(0, shared).map(line => ' ' + line),
    ...beforeLines.slice(shared).map(line => '-' + line),
    ...afterLines.slice(shared).map(line => '+' + line),
  ].join('\n');
}

function run(command) {
  const { expected } = missions[current];
  if (command === 'git status') return status();
  if (command === 'git diff' || command === 'git diff --staged') return diff(command.endsWith('--staged'));
  if (committed) return 'このコミットの後も git status や git diff で確認できます。再挑戦するには「この問題をやり直す」を押してください。';

  const add = /^git\s+add\s+(\S+)$/.exec(command);
  if (add) {
    const names = add[1] === '.' ? Object.keys(working) : [add[1]];
    if (names.some(file => !Object.hasOwn(working, file))) return 'この問題のファイル名を指定してください。';
    for (const file of names) {
      if (recorded[file] !== working[file]) staged[file] = working[file];
    }
    return 'コマンドは正常終了しました。git status で状態を確認できます。';
  }

  const commit = /^git\s+commit\s+-m\s+(?:"([^"]+)"|'([^']+'))$/.exec(command);
  if (commit) {
    const names = Object.keys(staged);
    if (!names.length) return 'ステージに変更がありません。git add で対象を指定してください。';
    const correct = names.length === Object.keys(expected).length
      && names.every(file => staged[file] === expected[file]);
    Object.assign(recorded, staged);
    staged = {};
    committed = true;
    if (correct) {
      finish('依頼どおりの内容をコミットできました。');
    } else {
      byId('feedback').textContent = '依頼と異なる内容がコミットされました。結果を見て、この問題をやり直してください。';
    }
    return 'コミット: ' + (commit[1] ?? commit[2]) + '\nブランチ: main\nコミットしたファイル: ' + names.join(', ');
  }
  return '使えるコマンド欄を確認してください。コミットのメッセージは引用符で囲みます。';
}

byId('terminal').addEventListener('submit', event => {
  event.preventDefault();
  const command = byId('command').value.trim();
  if (!command) return;
  byId('output').textContent = '$ ' + command + '\n' + run(command);
  byId('command').value = '';
  renderFiles();
  byId('command').focus();
});
byId('reset').addEventListener('click', () => load(current));
byId('next').addEventListener('click', () => load(current + 1));
load(0, false);
byId('command').disabled = false;
byId('run-command').disabled = false;
