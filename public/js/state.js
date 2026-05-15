// public/js/state.js
// ─────────────────────────────────────────────────────────────────────────────
// Player state, localStorage persistence, and level calculations.
// Does NOT touch the DOM — that's UI's job.
// API calls moved to api.js — state.js only manages data.
// ─────────────────────────────────────────────────────────────────────────────

import { API }         from './api.js';
import { AudioEngine } from './audio.js';

// ── Default shapes (avoids scattered fallbacks across the codebase) ───────────
const DEFAULT_DATA = () => ({
    coins:          0,
    exp:            0,
    inventory:      {},
    quests:         { date: '', list: [] },
    myHistory:      [],
    errorLog:       {},
    redeemedCodes:  [],
    pityCount:      50,
    isPendingSync:  false,
});

const DEFAULT_GAME = () => ({
    mode:           '',
    score:          0,
    combo:          0,
    startTime:      null,
    timerInterval:  null,
    isAnimating:    false,
    isAnswered:     false,
    targetCard:     null,
    battery:        0,
    feverCount:     0,
    alchemyTarget:  3,
    alchemyTimeLeft: 50,
    sessionExp:     0,
    sessionCoins:   0,
    currentDrawnCard: null,
});

export const State = {
    username: '',
    passcode: '',
    data:     DEFAULT_DATA(),
    game:     DEFAULT_GAME(),
    pvp:      { active: false, targetTime: 0, deck: [], myRecord: [] },

    // ── Boot ─────────────────────────────────────────────────────────────────
    init() {
        const d = this.data;
        d.coins         = load('aaCoins',         0);
        d.exp           = load('aaExp',            0);
        d.inventory     = load('aaInventorySep',   {});
        d.quests        = load('aaQuests',         { date: '', list: [] });
        d.myHistory     = load('myIonHistory',     []);
        d.errorLog      = load('aaErrorLog',       {});
        d.redeemedCodes = load('aaRedeemedCodes',  []);
        d.pityCount     = load('aaPityCount',      50);
        d.isPendingSync = load('aaPendingSync',    false);

        if (d.isPendingSync && navigator.onLine) {
            console.log('📡 離線存檔補傳中...');
            this._upload();
        }
    },

    // ── Login ─────────────────────────────────────────────────────────────────
    async login() {
        const uEl  = document.getElementById('loginUsername');
        const pEl  = document.getElementById('loginPasscode');
        const btn  = document.getElementById('loginBtn');
        const user = uEl.value.trim().toUpperCase();
        const pass = pEl.value.trim();

        if (!user || !pass) { alert('⚠️ 帳號與密碼不得為空！'); return; }

        btn.innerText = '驗證中...';
        btn.disabled  = true;

        try {
            const result = await API.login(user, pass);

            if (!result.success) {
                alert(result.message);
                btn.innerText = '進入系統';
                btn.disabled  = false;
                return;
            }

            this.username = user;
            this.passcode = pass;
            if (result.data) this.data = result.data;

            document.getElementById('loginModal').style.display  = 'none';
            document.getElementById('profileName').innerText     = user;

            this.save();

            // Lazy-import UI to avoid circular dep at module parse time
            const { UI } = await import('./ui.js');
            UI.renderQuests();
            UI.updateProfile();

            if (result.isNew) alert(`✨ 註冊成功！已為您建立雲端帳號：${user}`);
            AudioEngine.play('ssr');

        } catch {
            alert('❌ 雲端連線失敗，請檢查網路。');
            btn.innerText = '進入系統';
            btn.disabled  = false;
        }
    },

    // ── Persistence ───────────────────────────────────────────────────────────
    save() {
        const d = this.data;
        localStorage.setItem('aaCoins',        d.coins);
        localStorage.setItem('aaExp',          d.exp);
        localStorage.setItem('aaInventorySep', JSON.stringify(d.inventory));
        localStorage.setItem('aaQuests',       JSON.stringify(d.quests));
        localStorage.setItem('myIonHistory',   JSON.stringify(d.myHistory));
        localStorage.setItem('aaErrorLog',     JSON.stringify(d.errorLog));
        localStorage.setItem('aaRedeemedCodes',JSON.stringify(d.redeemedCodes));
        localStorage.setItem('aaPityCount',    d.pityCount);

        // Fire-and-forget sync — UI is never blocked by this
        if (this.username) {
            if (navigator.onLine) {
                this._upload();
            } else {
                localStorage.setItem('aaPendingSync', 'true');
                d.isPendingSync = true;
            }
        }
    },

    async _upload() {
        try {
            const lvl = this.getLevel().lvl;
            const res = await API.save(this.data, lvl);
            if (res.success) {
                localStorage.setItem('aaPendingSync', 'false');
                this.data.isPendingSync = false;
            }
        } catch {
            localStorage.setItem('aaPendingSync', 'true');
            this.data.isPendingSync = true;
        }
    },

    // ── Level & EXP ──────────────────────────────────────────────────────────
    getLevel() {
        const exp  = this.data.exp;
        const lvl  = Math.floor(Math.sqrt(exp / 15)) + 1;
        const prev = 15 * Math.pow(lvl - 1, 2);
        const next = 15 * Math.pow(lvl, 2);

        const titles = [
            [50, "A.A. Sir's Top Student"],
            [30, 'Precipitation Master'],
            [10, 'Ion Catcher'],
            [0,  'Lab Rookie'],
        ];
        const title = (titles.find(([min]) => lvl >= min) ?? titles.at(-1))[1];

        return {
            lvl,
            title,
            progress: Math.min(((exp - prev) / (next - prev)) * 100, 100),
            currExp:  exp - prev,
            reqExp:   next - prev,
        };
    },

    addExp(amt) {
        const oldLvl = this.getLevel().lvl;
        this.data.exp += amt;
        this.save();
        if (this.getLevel().lvl > oldLvl) {
            AudioEngine.play('ssr');
            if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80, origin: { y: 0.3 } });
        }
    },

    // ── Quest helpers ─────────────────────────────────────────────────────────
    updateQuest(id, amt = 1) {
        const q = this.data.quests.list.find(x => x.id === id);
        if (q && !q.isClaimed && q.progress < q.target) {
            q.progress = Math.min(q.progress + amt, q.target);
            this.save();
            import('./ui.js').then(({ UI }) => UI.renderQuests());
        }
    },

    // ── Error log ─────────────────────────────────────────────────────────────
    logError(c, a) {
        const key = `${c.formula}_${a.formula}`;
        this.data.errorLog[key] = (this.data.errorLog[key] ?? 0) + 1;
        this.save();
    },

    // ── Game state reset ──────────────────────────────────────────────────────
    resetGame() {
        this.game = DEFAULT_GAME();
    },
};

// ── localStorage helpers ──────────────────────────────────────────────────────
function load(key, def) {
    try {
        const v = localStorage.getItem(key);
        return v !== null ? JSON.parse(v) : def;
    } catch {
        return def;
    }
}
