// src/routes/gacha.js
// All gacha RNG and pity logic lives here — the single source of truth.
import { getUser, putUser } from '../lib/kv.js';
import { REFUNDS, PITY_RESET } from '../lib/constants.js';

const PLAYABLE_IDS  = Array.from({ length: 45 }, (_, i) => i + 1);
const SINGLE_COST   = 5;
const TEN_COST      = 45;   // 10% discount

export async function handleGacha(request, env) {
    const { username, passcode, times } = await request.json();
    const userObj = await getUser(env, username);
    if (!userObj || userObj.passcode !== passcode) return fail('身分驗證失敗');

    const data      = userObj.data;
    const cost      = times === 10 ? TEN_COST : times * SINGLE_COST;

    if (data.coins < cost) return fail('代幣不足！');
    data.coins -= cost;

    const results       = [];
    let   refund        = 0;
    let   hasGoldOrSR   = false;

    data.pityCount = data.pityCount ?? PITY_RESET;

    for (let i = 0; i < times; i++) {
        let rarity = rollRarity(data.pityCount);

        // 10-pull guarantee: last card is at least SR
        if (times === 10 && i === 9 && !hasGoldOrSR && rarity !== 'SSR') rarity = 'SR';
        if (rarity === 'SSR' || rarity === 'SR') hasGoldOrSR = true;

        // Pity counter management
        data.pityCount = rarity === 'SSR' ? PITY_RESET : data.pityCount - 1;

        const uniqueId  = `${PLAYABLE_IDS[Math.floor(Math.random() * PLAYABLE_IDS.length)]}_${rarity}`;
        const stars     = data.inventory[uniqueId] ?? 0;
        const isNew     = stars === 0;
        let   ref       = 0;

        if (isNew)       { data.inventory[uniqueId] = 1; data.exp += 10; }
        else if (stars < 3) { data.inventory[uniqueId]++;  data.exp += 5; }
        else             { ref = REFUNDS[rarity]; refund += ref; }

        results.push({ uniqueId, isNew, stars: data.inventory[uniqueId] ?? 3, ref });
    }

    data.coins += refund;
    await putUser(env, username, { passcode, data });

    return ok({ results, refund, newCoins: data.coins, newExp: data.exp, newPity: data.pityCount });
}

// ── rarity roll ───────────────────────────────────────────────────────────────
function rollRarity(pityCount) {
    if (pityCount <= 0) return 'SSR';
    const rand = Math.random() * 100;
    if (rand < 1.5)  return 'SSR';
    if (rand < 10)   return 'SR';
    if (rand < 30)   return 'R';
    return 'N';
}

function ok(body)   { return json({ success: true,  ...body }); }
function fail(msg)  { return json({ success: false, message: msg }); }
function json(body) { return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }); }
