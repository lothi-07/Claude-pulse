// main.js — runs in the EXTENSION's isolated context on claude.ai pages.
// Job: (1) inject bridge.js into the real page, (2) listen for its messages,
// (3) save data to chrome.storage.local, (4) draw a small usage badge.

// --- Step 1: inject bridge.js into the actual page ---
function injectBridge() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/injected/bridge.js');
  script.onload = function () { this.remove(); };
  (document.head || document.documentElement).appendChild(script);
}
injectBridge();

// --- Helper: rough token estimate (chars / 4 is a standard rule-of-thumb approximation) ---
function estimateTokens(text) {
  return Math.round((text || '').length / 4);
}

// --- Helper: get conversation ID from the current URL ---
function getConversationId() {
  const match = window.location.pathname.match(/\/chat\/([^/?]+)/);
  return match ? match[1] : null;
}

// --- Step 2: listen for messages from bridge.js ---
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'claude-usage-tracker') return;

  if (event.data.type === 'USAGE_DATA') {
    handleUsageData(event.data.payload);
  }

  if (event.data.type === 'CONVERSATION_DATA') {
    handleConversationData(event.data.payload);
  }
});

// --- Step 3a: handle session/weekly usage % ---
function handleUsageData(data) {
  chrome.storage.local.set({ latestUsage: data });
  renderUsageBadge(data);
}

// --- Step 3b: handle per-conversation token estimate ---
function handleConversationData(data) {
  const convoId = getConversationId();
  if (!convoId) return;

  const title = document.title.replace(' - Claude', '').trim() || 'Untitled chat';

  // pudhusa
  if (!Array.isArray(data?.chat_messages)) return;

  let totalChars = 0;
  data.chat_messages.forEach((msg) => {
    if (Array.isArray(msg?.content)) {
      msg.content.forEach((block) => {
        if (block?.text) totalChars += block.text.length;
      });
    } else if (typeof msg?.text === 'string') {
      totalChars += msg.text.length;
    }
  });
  if (totalChars === 0) return;
  const tokenEstimate = estimateTokens(' '.repeat(totalChars));

  chrome.storage.local.get(['conversations'], (result) => {
    const conversations = result.conversations || {};
    conversations[convoId] = {
      title,
      tokenEstimate,
      lastUpdated: Date.now(),
    };
    chrome.storage.local.set({ conversations });
  });
}

// --- Helper: turn a resets_at timestamp into "resets in 2h 14m" ---
function formatResetTime(isoString) {
  if (!isoString) return '';
  const resetDate = new Date(isoString);
  const now = new Date();
  const diffMs = resetDate - now;
  if (diffMs <= 0) return 'resets soon';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `resets in ${days}d ${hours}h`;
  if (hours > 0) return `resets in ${hours}h ${minutes}m`;
  return `resets in ${minutes}m`;
}

// --- Step 4: in-page bar-chart card showing session/weekly usage ---
function severityClass(percent) {
  if (percent >= 85) return 'danger';
  if (percent >= 60) return 'warning';
  return 'normal';
}

function barRow(label, percent, resetsAt) {
  const pct = Math.round(percent);
  const cls = severityClass(pct);
  return `
    <div class="cc-row">
      <div class="cc-label">
        <span>${label}</span>
        <span class="cc-percent">${pct}%</span>
      </div>
      <div class="cc-track">
        <div class="cc-fill ${cls}" style="width: ${pct}%"></div>
      </div>
      <div class="cc-reset">${formatResetTime(resetsAt)}</div>
    </div>
  `;
}

function renderUsageBadge(data) {
  let badge = document.getElementById('cc-usage-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'cc-usage-badge';
    document.body.appendChild(badge);
  }

  // pudhusa
  const limits = Array.isArray(data?.limits) ? data.limits : [];
  const session = data?.five_hour || limits.find((l) => l.kind === 'session');
  const weekly = data?.seven_day || limits.find((l) => l.kind === 'weekly_all');
  const sessionPct = session?.utilization ?? session?.percent;
  const weeklyPct = weekly?.utilization ?? weekly?.percent;

  if (typeof sessionPct !== 'number' && typeof weeklyPct !== 'number') {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = '';

  badge.innerHTML =
    (typeof sessionPct === 'number' ? barRow('Session (5h)', sessionPct, session.resets_at) : '') +
    (typeof weeklyPct === 'number' ? barRow('Weekly (7d)', weeklyPct, weekly.resets_at) : '');
}
