chrome.storage.local.get(['conversations'], (result) => {
  const conversations = result.conversations || {};
  const list = document.getElementById('list');
  const entries = Object.values(conversations).sort((a, b) => b.tokenEstimate - a.tokenEstimate);

  if (entries.length === 0) {
    list.innerHTML = '<div class="empty">No chats tracked yet.</div>';
    return;
  }

  list.innerHTML = entries.map((c) => `
    <div class="row">
      <span class="title">${c.title}</span>
      <span class="tokens">~${c.tokenEstimate.toLocaleString()} tok</span>
    </div>
  `).join('');
});
