// src/lib/kv.js
// ─────────────────────────────────────────────────────────────────────────────
// All Cloudflare KV reads/writes go through here.
//
// KV reduction strategy
// ─────────────────────
// Problem: every API endpoint was doing its own get+put pair, meaning a single
// player action like login could consume 2 KV ops. With cron + leaderboard
// that adds up fast.
//
// Solutions applied:
//   1. getUser / putUser are the ONLY functions that touch KV for player data.
//      All routes import these — no raw env.IONMASTER_DATA calls elsewhere.
//   2. putUser builds metadata in one place (no duplicate calcLvl calls).
//   3. Leaderboard is written once per cron run, not per request.
//   4. In-request caching: within a single Worker invocation, a second
//      getUser for the same key skips a real KV read.
// ─────────────────────────────────────────────────────────────────────────────

/** In-request cache — lives only for the duration of one Worker invocation */
const _cache = new Map();

/**
 * Read a player record from KV.
 * Returns the parsed object or null if not found.
 */
export async function getUser(env, username) {
    const key = `user_${username}`;
    if (_cache.has(key)) return _cache.get(key);

    const raw = await env.IONMASTER_DATA.get(key);
    if (!raw) return null;

    const obj = JSON.parse(raw);
    _cache.set(key, obj);
    return obj;
}

/**
 * Write a player record to KV.
 * Metadata is built here so every writer stays consistent.
 * Also updates the in-request cache so subsequent reads in the same
 * invocation don't go back to KV.
 */
export async function putUser(env, username, userObj) {
    const key  = `user_${username}`;
    const exp  = userObj.data?.exp ?? 0;
    const lvl  = calcLvl(exp);

    _cache.set(key, userObj);

    await env.IONMASTER_DATA.put(
        key,
        JSON.stringify(userObj),
        { metadata: { username, exp, lvl } }
    );
}

/**
 * Compute player level from raw EXP.
 * Exported so routes can use it for validation without importing game logic.
 */
export function calcLvl(exp) {
    return Math.floor(Math.sqrt(exp / 15)) + 1;
}

/**
 * Return today's date string in UTC+8 (YYYY-MM-DD).
 * Avoids timezone-related crashes seen with Intl.DateTimeFormat on older CF runtimes.
 */
export function getTodayUTC8() {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}
