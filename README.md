# Claude Pulse

A Chrome extension that shows your real Claude.ai session/weekly usage limits right on the page, and tracks which conversations use the most tokens.

Built to solve one annoying problem: not knowing how close you are to hitting Claude's free-tier limit until you're suddenly blocked mid-chat.

---

## Features

- **Live usage bars** — real Session (5h) and Weekly (7d) usage %, with reset countdown
- **Per-chat token tracking** — see which of your conversations are the heaviest
- **Popup dashboard** — click the extension icon to see all tracked chats ranked by usage
- **100% local** — no servers, no accounts, no data leaves your browser

---

## How it works

Claude's own site calls a private `/usage` endpoint to show your limits. This extension reads that same endpoint using your existing logged-in session (via your `lastActiveOrg` cookie) — no separate login needed.

- `src/injected/bridge.js` — runs inside the actual claude.ai page to fetch usage + conversation data
- `src/content/main.js` — receives that data, saves it locally, and draws the usage card

Token counts are an approximation (`characters / 4`), not Claude's real tokenizer.

---

## Setup

1. Clone or download this repo
2. Go to `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** → select the `Claude-pulse-main` folder
5. Open [claude.ai](https://claude.ai) and start chatting
6. Look bottom-right for the usage card, or click the extension icon for your chat list

**Not working ?**
- Make sure `claude.ai` site access is turned ON for the extension
- Close all claude.ai tabs and open a fresh one after any reload
- Check the Console (F12) for `[Claude-pulse-main]` logs

---

## Credit

Architecture inspired by [`she-llac/claude-counter`] (MIT), rebuilt independently with an added per-chat comparison feature.

## License

MIT
