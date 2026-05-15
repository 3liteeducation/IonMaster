// public/js/app.js  —  Entry point
// ─────────────────────────────────────────────────────────────────────────────
// Responsibilities: boot State, init PWA, expose minimal globals for HTML
// onclick attributes, parse PvP URL params.
// Security hardening lives in its own module.
// ─────────────────────────────────────────────────────────────────────────────

import { State }       from './state.js';
import { UI }          from './ui.js';
import { Game }        from './game.js';
import { AudioEngine } from './audio.js';

// ── Security: block devtools shortcuts ───────────────────────────────────────
(function initSecurity() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('dragstart',   e => e.preventDefault());
    document.addEventListener('keydown', e => {
        const { key, ctrlKey, shiftKey, metaKey, altKey } = e;
        const devtoolsKeys = new Set(['F12', 'I', 'i', 'J', 'j', 'C', 'c', 'U', 'u']);
        if (
            key === 'F12' ||
            (ctrlKey && shiftKey && devtoolsKeys.has(key)) ||
            (ctrlKey && (key === 'U' || key === 'u')) ||
            (metaKey && altKey && devtoolsKeys.has(key))
        ) {
            e.preventDefault();
            return false;
        }
    });
})();

// ── PWA install prompt ────────────────────────────────────────────────────────
(function initPWA() {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
        const btn = document.getElementById('installAppBtn');
        if (!btn) return;
        btn.style.display = 'block';
        btn.onclick = async () => {
            btn.style.display = 'none';
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
        };
    });

    window.addEventListener('appinstalled', () => {
        const btn = document.getElementById('installAppBtn');
        if (btn) btn.style.display = 'none';
    });
})();

// ── Minimal global surface for HTML onclick attributes ────────────────────────
// Only expose what inline HTML actually needs.
// State.data (coins, exp, inventory) is intentionally NOT exposed.
window.UI   = UI;
window.Game = Game;
window.State = { login: () => State.login() };

// ── Boot ──────────────────────────────────────────────────────────────────────
window.onload = () => {
    State.init();
    UI.updateProfile();
    document.getElementById('loginModal').style.display = 'flex';

    // PvP challenge URL param
    const pvpParam = new URLSearchParams(window.location.search).get('pvp');
    if (pvpParam) {
        try {
            const parsed = JSON.parse(atob(pvpParam));
            if (parsed.t && parsed.d?.length === 10) {
                State.pvp.active     = true;
                State.pvp.deck       = parsed.d;
                State.pvp.targetTime = parsed.t;
                document.getElementById('pvpBanner').style.display     = 'block';
                document.getElementById('pvpTargetTime').innerText     = parsed.t;
            }
        } catch { /* malformed param — ignore */ }
    }
};
