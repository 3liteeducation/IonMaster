// src/routes/game.js
import { getUser, putUser, calcLvl } from '../lib/kv.js';

const MIN_SPEED_TIME = 3.5;          // seconds – anti-cheat floor
const MAX_COINS_PER_SECOND = 2;      // anti-cheat ceiling for practice/color

export async function handleGameResult(request, env) {
    const { username, passcode, mode, payload } = await request.json();
    const { userObj, data } = await auth(env, username, passcode);
    if (!userObj) return fail('找不到玩家或驗證失敗');

    let earnedExp = 0, earnedCoins = 0;

    if (mode === 'speed') {
        const { time, isPb, isPvpWin } = payload;
        if (time < MIN_SPEED_TIME) return fail('🛑 偵測到異常速度！');
        earnedExp += 50;
        if (isPb)     { earnedExp += 100; earnedCoins += 2; }
        if (isPvpWin) { earnedExp += 150; earnedCoins += 5; }
    } else if (mode === 'practice' || mode === 'color') {
        const { sessionExp, sessionCoins, playTime } = payload;
        if (sessionCoins > playTime * MAX_COINS_PER_SECOND) return fail('🛑 代幣獲取過快！');
        earnedExp   = sessionExp;
        earnedCoins = sessionCoins;
    } else {
        return fail('未知遊戲模式');
    }

    data.exp    += earnedExp;
    data.coins  += earnedCoins;
    await putUser(env, username, { passcode, data });

    return ok({ newExp: data.exp, newCoins: data.coins });
}

// ── helpers ───────────────────────────────────────────────────────────────────
async function auth(env, username, passcode) {
    const userObj = await getUser(env, username);
    if (!userObj || userObj.passcode !== passcode) return {};
    const data = userObj.data ?? { coins: 0, exp: 0, inventory: {}, quests: { date: '', list: [] } };
    return { userObj, data };
}

function ok(body)   { return json({ success: true,  ...body }); }
function fail(msg)  { return json({ success: false, message: msg }); }
function json(body) { return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }); }
