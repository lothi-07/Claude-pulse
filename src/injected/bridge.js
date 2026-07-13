// bridge.js — runs INSIDE claude.ai's own page (page context, not extension context).
// Two jobs:
//  1) Directly fetch the real usage % from Claude's own /usage endpoint
//  2) Watch conversation data fetches, to estimate token count per chat

(() => {
  // --- Job 1: fetch real usage data ---
  function getOrgId() {
    const match = document.cookie.match(/lastActiveOrg=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function fetchUsage() {
    const orgId = getOrgId();
    if (!orgId) return;

    fetch(`/api/organizations/${orgId}/usage`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        window.postMessage({ source: 'claude-usage-tracker', type: 'USAGE_DATA', payload: data }, '*');
      })
      .catch(() => {});
  }

  fetchUsage(); // on page load
  setInterval(fetchUsage, 30000); // refresh every 30s so the badge stays current

  // --- Job 2: watch conversation fetches for token tracking ---
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      if (url.match(/\/chat_conversations\/[^/?]+/)) {
        const clone = response.clone();
        clone.json().then((data) => {
          window.postMessage({ source: 'claude-usage-tracker', type: 'CONVERSATION_DATA', payload: data, url }, '*');
        }).catch(() => {});

        // A message was just sent/received in this conversation — usage % likely changed
        fetchUsage();
      }
    } catch (e) {
      // Never let our tracking logic break Claude's actual app
    }

    return response;
  };
})();
