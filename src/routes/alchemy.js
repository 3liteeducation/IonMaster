// src/routes/alchemy.js
import { getUser, putUser } from '../lib/kv.js';
import { ALCHEMY_COSTS } from '../lib/constants.js';

export async function handleAlchemy(request, env) {
    const { username, passcode, cardId, rarity, success } = await request.json();
    const userObj = await getUser(env, username);
    if (!userObj || userObj.passcode !== passcode) return fail('身分驗證失敗');

    const data = userObj.data;
    const cost = ALCHEMY_COSTS[rarity];

    if (!cost)          return fail('無效稀有度');
    if (data.coins < cost) return fail(`需要 ${cost} 🪙，代幣不足！`);

    data.coins -= cost;

    if (success) {
        data.inventory[cardId] = (data.inventory[cardId] ?? 0) + 1;
        data.exp += 30;
    }

    await putUser(env, username, { passcode, data });
    return ok({ newCoins: data.coins, newExp: data.exp, newInventory: data.inventory });
}

function ok(body)   { return json({ success: true,  ...body }); }
function fail(msg)  { return json({ success: false, message: msg }); }
function json(body) { return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }); }
