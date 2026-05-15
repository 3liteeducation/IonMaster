// src/routes/misc.js
import { getUser, putUser, calcLvl } from '../lib/kv.js';
import { VALID_CODES } from '../lib/constants.js';

const HEADERS = { 'Content-Type': 'application/json' };

// ── Leaderboard: served from cache, refreshed by cron ─────────────────────────
export async function handleLeaderboard(env) {
    const cached = await env.IONMASTER_DATA.get('CACHE_LEADERBOARD_TOP50');
    return new Response(
        cached ?? JSON.stringify({ success: true, leaderboard: [] }),
        { headers: HEADERS }
    );
}

// ── Gift code redemption ───────────────────────────────────────────────────────
export async function handleRedeem(request) {
    const { code } = await request.json();
    const reward   = VALID_CODES[code?.toUpperCase?.()];
    if (!reward) return json({ success: false, message: '無效代碼' });
    return json({ success: true, reward });
}

// ── Legacy /api/save (offline sync fallback) ──────────────────────────────────
// Validates that the client-computed level matches server math — basic anti-tamper.
export async function handleSave(request, env) {
    const { username, passcode, data, lvl } = await request.json();
    const calculated = calcLvl(data.exp ?? 0);
    if (lvl !== calculated) {
        return new Response(JSON.stringify({ success: false, message: '🧪 偵測到數據異常！' }), { status: 400, headers: HEADERS });
    }
    await putUser(env, username, { passcode, data });
    return json({ success: true });
}

function json(body) { return new Response(JSON.stringify(body), { headers: HEADERS }); }
