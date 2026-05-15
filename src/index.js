// src/index.js  —  Ion Master Backend (Cloudflare Worker)
// ─────────────────────────────────────────────────────────────────────────────
// Router pattern: one route → one handler file.
// No business logic lives here — this file is pure dispatch + cron.
// ─────────────────────────────────────────────────────────────────────────────

import { handleLogin }        from './routes/auth.js';
import { handleGameResult }   from './routes/game.js';
import { handleGacha }        from './routes/gacha.js';
import { handleAlchemy }      from './routes/alchemy.js';
import { handleLeaderboard, handleRedeem, handleSave } from './routes/misc.js';
import { ALLOWED_ORIGINS }    from './lib/constants.js';
import { calcLvl }            from './lib/kv.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default {

    // ── Scheduled cron: rebuild leaderboard cache ─────────────────────────────
    // Runs on whatever schedule is set in wrangler.jsonc.
    // Recommended: "0 * * * *" (hourly) instead of "* * * * *" (every minute)
    // to drastically cut KV list() calls — the most expensive KV operation.
    async scheduled(event, env) {
        const listed = await env.IONMASTER_DATA.list({ prefix: 'user_' });

        const lb = listed.keys
            .filter(k => k.metadata)
            .map(k => ({ username: k.metadata.username, exp: k.metadata.exp, lvl: k.metadata.lvl }))
            .sort((a, b) => b.exp - a.exp)
            .slice(0, 50);

        await env.IONMASTER_DATA.put(
            'CACHE_LEADERBOARD_TOP50',
            JSON.stringify({ success: true, leaderboard: lb })
        );
    },

    // ── HTTP request handler ──────────────────────────────────────────────────
    async fetch(request, env) {
        const url    = new URL(request.url);
        const method = request.method;

        // JS file referer check — blocks direct hotlinking of game scripts
        if (url.pathname.endsWith('.js')) {
            const referer = request.headers.get('Referer') ?? '';
            if (!ALLOWED_ORIGINS.some(o => referer.includes(o))) {
                return new Response('A.A. Sir 說：非請勿入！🧪', { status: 403 });
            }
        }

        try {
            // ── Route table ───────────────────────────────────────────────────
            if (url.pathname === '/api/login'       && method === 'POST') return handleLogin(request, env);
            if (url.pathname === '/api/game_result' && method === 'POST') return handleGameResult(request, env);
            if (url.pathname === '/api/gacha'       && method === 'POST') return handleGacha(request, env);
            if (url.pathname === '/api/alchemy'     && method === 'POST') return handleAlchemy(request, env);
            if (url.pathname === '/api/save'        && method === 'POST') return handleSave(request, env);
            if (url.pathname === '/api/redeem'      && method === 'POST') return handleRedeem(request);
            if (url.pathname === '/api/leaderboard' && method === 'GET')  return handleLeaderboard(env);

            return new Response('Not found', { status: 404 });

        } catch (err) {
            // Global catch — surfaces errors to the client for easier debugging
            console.error('Backend Error:', err);
            return new Response(
                JSON.stringify({ success: false, message: `伺服器處理錯誤: ${err.message}` }),
                { status: 500, headers: JSON_HEADERS }
            );
        }
    }
};
