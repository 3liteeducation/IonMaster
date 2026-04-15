// src/index.js - Ion Master 終極後端守衛 (防崩潰穩定版)

const BANISHED_WORDS = [
  "SKIBIDI", "RIZZ", "DEMURE", "COOKED", "GOAT", "GASLIGHTING", "CIRCLE BACK", "GYATT",
  "FUCK", "SHIT", "BITCH", "ASS", "CUNT", "DICK", "COCK", "PORN", "XXX", "ANUS", "VAGINA", "PENIS",
  "NIGGER", "NIGGA", "RETARD", "BASTARD", "SLUT", "WHORE", "WANK", "PISS"
];
const BANISHED_EMOJIS = ["🍆", "💦", "🍑", "👅", "🖕", "🤬", "👉👌"];

const QUEST_TEMPLATES = [
    { id: 'q_speed', title: "極速狂飆", desc: "完成 1 次速度模式", target: 1, reward: 15 },
    { id: 'q_practice', title: "勤能補拙", desc: "在練習模式答對 10 題", target: 10, reward: 10 },
    { id: 'q_gacha', title: "試煉手氣", desc: "進行 1 次抽卡", target: 1, reward: 5 },
    { id: 'q_login', title: "實驗室報到", desc: "每日登入", target: 1, reward: 5 }
];

const ALCHEMY_COSTS = { 'N': 15, 'R': 30, 'SR': 80, 'SSR': 150 };

function isNameForbidden(name) {
  const upperName = name.toUpperCase();
  if (BANISHED_EMOJIS.some(e => upperName.includes(e))) return true;
  return BANISHED_WORDS.some(word => {
    if (word.length <= 4) return upperName === word || upperName.split(/\s+/).includes(word);
    return upperName.includes(word); 
  });
}

export default {
  async scheduled(event, env, ctx) {
    let listed = await env.IONMASTER_DATA.list({ prefix: 'user_' });
    let lb = [];
    for (let key of listed.keys) {
      if (key.metadata) lb.push({ username: key.metadata.username, exp: key.metadata.exp, lvl: key.metadata.lvl });
    }
    lb.sort((a, b) => b.exp - a.exp);
    await env.IONMASTER_DATA.put('CACHE_LEADERBOARD_TOP50', JSON.stringify(lb.slice(0, 50)));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'application/json' };

    if (url.pathname.endsWith('.js')) {
      const referer = request.headers.get('Referer');
      if (!referer || (!referer.includes('ionmaster.3lite.io') && !referer.includes('ionmaster.threeliteeducation.workers.dev'))) {
        return new Response("A.A. Sir 說：非請勿入！🧪", { status: 403 });
      }
    }

    // 🛡️ 加入全域防崩潰網 (try-catch)
    try {
        // --- 登入 API ---
        if (url.pathname === '/api/login' && request.method === 'POST') {
          const { username, passcode } = await request.json();
          
          if (isNameForbidden(username)) {
            return new Response(JSON.stringify({ success: false, message: '🛑 系統警告：您的名稱包含不適當的內容，請換一個！' }), { headers });
          }

          let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
          if (rawData) {
            let userObj = JSON.parse(rawData);
            if (userObj.passcode !== passcode) return new Response(JSON.stringify({ success: false, message: '❌ 密碼錯誤！' }), { headers });
            
            // 防呆：如果存檔結構損壞，給予預設值
            let data = userObj.data || { coins: 0, exp: 0, inventory: {}, quests: { date: "", list: [] } };
            if (!data.quests) data.quests = { date: "", list: [] }; 
            
            // 🚀 修復 Cloudflare 時區崩潰問題：改用純數學計算 UTC+8
            const now = new Date();
            const serverToday = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            if (data.quests.date !== serverToday) {
                // 使用展開運算子複製陣列，避免直接修改常數
                let shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random()).slice(0, 3);
                data.quests = { 
                    date: serverToday, 
                    list: shuffled.map(q => ({ ...q, progress: 0, isClaimed: false })) 
                };
                let loginQ = data.quests.list.find(q => q.id === 'q_login'); 
                if(loginQ) loginQ.progress = 1;
                
                await env.IONMASTER_DATA.put(
                    `user_${username}`, 
                    JSON.stringify({ passcode: userObj.passcode, data }),
                    { metadata: { username: username, exp: data.exp || 0, lvl: Math.floor(Math.sqrt((data.exp||0) / 15)) + 1 } }
                );
            }
            return new Response(JSON.stringify({ success: true, data: data }), { headers });
          } else {
            return new Response(JSON.stringify({ success: true, isNew: true }), { headers });
          }
        }

        // --- 遊戲成績結算 API ---
        if (url.pathname === '/api/game_result' && request.method === 'POST') {
          const { username, passcode, mode, payload } = await request.json();
          let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
          if (!rawData) return new Response(JSON.stringify({ success: false, message: '找不到玩家' }), { headers });
          let userObj = JSON.parse(rawData);
          if (userObj.passcode !== passcode) return new Response(JSON.stringify({ success: false, message: '驗證失敗' }), { headers });

          let data = userObj.data || { coins: 0, exp: 0, inventory: {}, quests: { date: "", list: [] } };
          let earnedExp = 0, earnedCoins = 0;

          if (mode === 'speed') {
              const { time, isPb, isPvpWin } = payload;
              if (time < 3.5) return new Response(JSON.stringify({ success: false, message: '🛑 偵測到異常速度！' }), { headers });
              earnedExp += 50; if (isPb) { earnedExp += 100; earnedCoins += 2; } if (isPvpWin) { earnedExp += 150; earnedCoins += 5; } 
          } else if (mode === 'practice' || mode === 'color') {
              const { sessionExp, sessionCoins, playTime } = payload;
              if (sessionCoins > playTime * 2) return new Response(JSON.stringify({ success: false, message: '🛑 代幣獲取過快！' }), { headers });
              earnedExp = sessionExp; earnedCoins = sessionCoins;
          }

          data.exp += earnedExp; data.coins += earnedCoins;
          await env.IONMASTER_DATA.put(`user_${username}`, JSON.stringify({ passcode, data }), { metadata: { username, exp: data.exp, lvl: Math.floor(Math.sqrt(data.exp / 15)) + 1 } });
          return new Response(JSON.stringify({ success: true, newExp: data.exp, newCoins: data.coins }), { headers });
        }

        // --- 雲端抽卡 API ---
        if (url.pathname === '/api/gacha' && request.method === 'POST') {
          const { username, passcode, times } = await request.json();
          let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
          if (!rawData) return new Response(JSON.stringify({ success: false, message: '找不到玩家資料' }), { headers });
          let userObj = JSON.parse(rawData);
          if (userObj.passcode !== passcode) return new Response(JSON.stringify({ success: false, message: '身分驗證失敗' }), { headers });

          let data = userObj.data; let cost = (times === 10) ? 45 : times * 5;
          if (data.coins < cost) return new Response(JSON.stringify({ success: false, message: '代幣不足！' }), { headers });
          data.coins -= cost;
          
          let results = [], refund = 0, hasGoldOrPurple = false;
          const PLAYABLE_IDS = Array.from({length: 45}, (_, i) => i + 1); 

          for (let i = 0; i < times; i++) {
              let r = 'N', rand = Math.random() * 100;
              data.pityCount = (data.pityCount || 50) - 1; 
              if (data.pityCount <= 0) { r = 'SSR'; } else { if (rand < 1.5) r = 'SSR'; else if (rand < 10) r = 'SR'; else if (rand < 30) r = 'R'; }
              if (times === 10 && i === 9 && !hasGoldOrPurple && r !== 'SSR') r = 'SR';
              if (r === 'SSR' || r === 'SR') hasGoldOrPurple = true;
              if (r === 'SSR') data.pityCount = 50; 

              let uniqueId = `${PLAYABLE_IDS[Math.floor(Math.random() * PLAYABLE_IDS.length)]}_${r}`;
              let stars = data.inventory[uniqueId] || 0, isNew = stars === 0, ref = 0;

              if (isNew) { data.inventory[uniqueId] = 1; data.exp += 10; } 
              else if (stars < 3) { data.inventory[uniqueId]++; data.exp += 5; } 
              else { const REFUNDS = { 'N': 2, 'R': 4, 'SR': 6, 'SSR': 10 }; ref = REFUNDS[r]; refund += ref; }
              results.push({ uniqueId, isNew, stars: data.inventory[uniqueId] || 3, ref });
          }

          data.coins += refund;
          await env.IONMASTER_DATA.put(`user_${username}`, JSON.stringify({ passcode, data }), { metadata: { username, exp: data.exp, lvl: Math.floor(Math.sqrt(data.exp / 15)) + 1 } });
          return new Response(JSON.stringify({ success: true, results, refund, newCoins: data.coins, newExp: data.exp, newPity: data.pityCount }), { headers });
        }

        // --- 雲端煉金 API ---
        if (url.pathname === '/api/alchemy' && request.method === 'POST') {
          const { username, passcode, cardId, rarity, success } = await request.json();
          let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
          let userObj = JSON.parse(rawData);
          let data = userObj.data; let cost = ALCHEMY_COSTS[rarity];
          if (data.coins < cost) return new Response(JSON.stringify({ success: false, message: '代幣不足！' }), { headers });
          data.coins -= cost;
          if (success) { data.inventory[cardId] = (data.inventory[cardId] || 0) + 1; data.exp += 30; }
          await env.IONMASTER_DATA.put(`user_${username}`, JSON.stringify({ passcode, data }), { metadata: { username, exp: data.exp, lvl: Math.floor(Math.sqrt(data.exp / 15)) + 1 } });
          return new Response(JSON.stringify({ success: true, newCoins: data.coins, newExp: data.exp, newInventory: data.inventory }), { headers });
        }

        // --- 存檔 API (舊版相容與補傳) ---
        if (url.pathname === '/api/save' && request.method === 'POST') {
          const { username, passcode, data, lvl } = await request.json();
          const calculatedLvl = Math.floor(Math.sqrt((data.exp||0) / 15)) + 1;
          if (lvl !== calculatedLvl) return new Response(JSON.stringify({ success: false, message: '🧪 偵測到數據異常！' }), { status: 400, headers });
          await env.IONMASTER_DATA.put(`user_${username}`, JSON.stringify({ passcode, data }), { metadata: { username, exp: data.exp, lvl: calculatedLvl } });
          return new Response(JSON.stringify({ success: true }), { headers });
        }

        // --- 排行榜 & 兌換碼 API ---
        if (url.pathname === '/api/leaderboard') return new Response(await env.IONMASTER_DATA.get('CACHE_LEADERBOARD_TOP50') || "[]", { headers });
        if (url.pathname === '/api/redeem' && request.method === 'POST') {
            const { code } = await request.json(); const validCodes = { 'AASIR-CHEM-PRO': 10000, 'WELCOME-3LITE': 10 };
            return validCodes[code] ? new Response(JSON.stringify({ success: true, reward: validCodes[code] }), { headers }) : new Response(JSON.stringify({ success: false, message: '無效代碼' }), { headers });
        }

        return new Response("Not found", { status: 404 });
        
    } catch (err) {
        // 🔴 終極防線：攔截所有崩潰並回報給前端，方便我們抓蟲！
        console.error("Backend Error:", err);
        return new Response(JSON.stringify({ 
            success: false, 
            message: `伺服器處理錯誤: ${err.message}` 
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
};
