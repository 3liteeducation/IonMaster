// src/routes/auth.js
import { getUser, putUser, getTodayUTC8 } from '../lib/kv.js';
import { isNameForbidden } from '../lib/moderation.js';
import { QUEST_TEMPLATES } from '../lib/constants.js';

export async function handleLogin(request, env) {
    const { username, passcode } = await request.json();

    if (!username || !passcode) {
        return fail('⚠️ 帳號與密碼不得為空！');
    }
    if (isNameForbidden(username)) {
        return fail('🛑 系統警告：您的名稱包含不適當的內容，請換一個！');
    }

    const userObj = await getUser(env, username);

    // --- New user registration ---
    if (!userObj) {
        return ok({ isNew: true });
    }

    // --- Existing user login ---
    if (userObj.passcode !== passcode) {
        return fail('❌ 密碼錯誤！');
    }

    const data = userObj.data ?? { coins: 0, exp: 0, inventory: {}, quests: { date: '', list: [] } };
    if (!data.quests) data.quests = { date: '', list: [] };

    // Refresh daily quests if needed (UTC+8)
    const today = getTodayUTC8();
    if (data.quests.date !== today) {
        const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random()).slice(0, 3);
        data.quests = {
            date: today,
            list: shuffled.map(q => ({ ...q, progress: 0, isClaimed: false }))
        };
        // Auto-complete login quest
        const loginQ = data.quests.list.find(q => q.id === 'q_login');
        if (loginQ) loginQ.progress = 1;

        // Write back only the quest refresh — avoids a full re-write on every login
        await putUser(env, username, { passcode: userObj.passcode, data });
    }

    return ok({ data });
}

// ── helpers ───────────────────────────────────────────────────────────────────
function ok(body)   { return json({ success: true,  ...body }); }
function fail(msg)  { return json({ success: false, message: msg }); }
function json(body) { return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }); }
