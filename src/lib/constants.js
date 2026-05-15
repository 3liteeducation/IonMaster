// src/lib/constants.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all game constants.
// Frontend (data.js) should mirror any values it needs — never import from here
// directly (Cloudflare Workers backend only).
// ─────────────────────────────────────────────────────────────────────────────

export const PITY_RESET = 50;

export const REFUNDS = { N: 2, R: 4, SR: 6, SSR: 10 };

export const ALCHEMY_COSTS = { N: 15, R: 30, SR: 80, SSR: 150 };

export const QUEST_TEMPLATES = [
    { id: 'q_speed',    title: '極速狂飆',   desc: '完成 1 次速度模式',      target: 1,  reward: 15 },
    { id: 'q_practice', title: '勤能補拙',   desc: '在練習模式答對 10 題',   target: 10, reward: 10 },
    { id: 'q_gacha',    title: '試煉手氣',   desc: '進行 1 次抽卡',          target: 1,  reward: 5  },
    { id: 'q_login',    title: '實驗室報到', desc: '每日登入',               target: 1,  reward: 5  },
];

/** Gift codes → coin reward. Change here only — no scattered hardcoding. */
export const VALID_CODES = {
    'AASIR-CHEM-PRO': 10000,
    'WELCOME-3LITE':  10,
};

/** Allowed origins for JS referer check */
export const ALLOWED_ORIGINS = [
    'ionmaster.3lite.io',
    'ionmaster.threeliteeducation.workers.dev',
];
