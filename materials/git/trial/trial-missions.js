'use strict';

const trialMissions = [
  {
    title: '指定されたファイルだけをコミットする',
    request: '先輩「README.md のセットアップ手順を先に反映して。settings.json の設定変更は確認中なので、今回のコミットには入れないでください。」',
    initial: 'どちらも変更済みです。ステージにはまだ何も入っていません。',
    files: {
      'README.md': { before: 'セットアップ: npm install', after: 'セットアップ: npm ci' },
      'settings.json': { before: '{ "theme": "light" }', after: '{ "theme": "dark" }' },
    },
    staged: {},
    expected: { 'README.md': 'セットアップ: npm ci' },
    messageExample: 'README の依存関係インストール手順を npm ci に変更する',
    hint: 'git status で状態を確認し、git add に README.md だけを指定します。git diff --staged で対象を確認してからコミットします。',
    explanation: 'git add で指定した README.md の内容だけがステージに入ります。コミット後も、settings.json の変更は作業中のまま残ります。',
  },
  {
    title: '追加の修正をコミットに含める',
    request: '先輩「手順書に対応Node.jsのバージョンも追記したので、セットアップ手順と一緒にコミットしてください。」',
    initial: 'README.md の「npm ci」への修正はステージに追加済みです。その後に「Node.js 22」を追記しました。',
    files: {
      'README.md': { before: 'セットアップ: npm install', after: 'セットアップ: npm ci\n動作環境: Node.js 22' },
    },
    staged: { 'README.md': 'セットアップ: npm ci' },
    expected: { 'README.md': 'セットアップ: npm ci\n動作環境: Node.js 22' },
    messageExample: 'セットアップ手順に npm ci と Node.js 22 を明記する',
    hint: 'git diff と git diff --staged を見比べます。追記がまだステージに入っていなければ、同じファイルをもう一度 git add します。',
    explanation: 'git add がステージに入れるのは、実行した時点の内容です。その後の編集は自動で追加されません。もう一度 git add してからコミットすると、追記まで履歴に残ります。',
  },
];
