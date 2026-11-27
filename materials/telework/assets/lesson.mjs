const buttons = [...document.querySelectorAll('[data-route]')];
for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const option of buttons) option.setAttribute('aria-pressed', String(option === button));
    const full = button.dataset.route === 'full';
    document.getElementById('external-hop').textContent = full ? '🔒 会社のVPN' : '🌐 自宅回線から直接';
    document.getElementById('route-result').textContent = full
      ? 'この設定例では、YouTubeへの通信も会社のVPNを通ります。'
      : 'この設定例では、YouTubeは会社のVPNを通らず、社内ポータルは会社のVPNを通ります。';
  });
}
const quiz = document.getElementById('vpn-quiz');
quiz?.addEventListener('submit', event => {
  event.preventDefault();
  const correct = new FormData(quiz).get('vpn') === 'depends';
  const answer = document.getElementById('answer');
  answer.textContent = (correct ? '正解。' : 'もう一度。') + '通る経路、接続先のログ、個別動画のURLを分けて考えます。';
  answer.hidden = false;
});

async function addPublishedVideos() {
  try {
    const response = await fetch(new URL('./video-links.json', import.meta.url));
    if (!response.ok) return;
    const links = await response.json();
    for (const element of document.querySelectorAll('[data-theme]')) {
      const video = links[element.dataset.theme];
      if (video?.status !== 'published' || !video.url) continue;
      const url = new URL(video.url);
      if (url.origin !== 'https://www.instagram.com' || !/^\/(reel|p)\/[\w-]+\/?$/.test(url.pathname)) continue;
      const link = document.createElement('a');
      link.href = url.origin + url.pathname;
      link.textContent = 'Instagramの動画を見る';
      const line = document.createElement('p');
      line.append(link);
      element.append(line);
    }
  } catch {
    // The lessons remain readable when no video links have been registered.
  }
}
addPublishedVideos();
