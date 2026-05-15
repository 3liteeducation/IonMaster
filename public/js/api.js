// public/js/api.js
// ─────────────────────────────────────────────────────────────────────────────
// All fetch() calls go through here. Benefits:
//   • One place to add auth headers / retry logic / error normalisation
//   • Routes never construct fetch() inline — easier to mock/test
//   • Credentials (username + passcode) injected automatically
// ─────────────────────────────────────────────────────────────────────────────

import { State } from './state.js';

async function post(path, body) {
    const res = await fetch(path, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
    });
    if (!res.ok && res.status !== 400) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/** Inject auth credentials automatically for authenticated endpoints */
function withAuth(body) {
    return { username: State.username, passcode: State.passcode, ...body };
}

export const API = {
    login:       (username, passcode)        => post('/api/login', { username, passcode }),
    gameResult:  (mode, payload)             => post('/api/game_result', withAuth({ mode, payload })),
    gacha:       (times)                     => post('/api/gacha',       withAuth({ times })),
    alchemy:     (cardId, rarity, success)   => post('/api/alchemy',     withAuth({ cardId, rarity, success })),
    save:        (data, lvl)                 => post('/api/save',        withAuth({ data, lvl })),
    redeem:      (code)                      => post('/api/redeem', { code }),
    leaderboard: ()                          => get('/api/leaderboard'),
};
