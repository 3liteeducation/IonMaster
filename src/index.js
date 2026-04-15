// src/index.js - Ion Master 終極後端守衛

// 🚀 核心安全：將禁用詞與髒話鎖在後端 (學生看不到)
const BANISHED_WORDS = [
  // LSSU 煩人詞彙
  "SKIBIDI", "RIZZ", "DEMURE", "COOKED", "GOAT", "GASLIGHTING", "CIRCLE BACK", "GYATT",
  // 核心髒話與敏感詞 (由 en.json 萃取)
  "FUCK", "SHIT", "BITCH", "ASS", "CUNT", "DICK", "COCK", "PORN", "XXX", "ANUS", "VAGINA", "PENIS",
  "NIGGER", "NIGGA", "RETARD", "BASTARD", "SLUT", "WHORE", "WANK", "PISS"
];

const BANISHED_EMOJIS = ["🍆", "💦", "🍑", "👅", "🖕", "🤬", "👉👌"];

function isNameForbidden(name) {
  const upperName = name.toUpperCase();
  // 檢查 Emoji
  if (BANISHED_EMOJIS.some(e => upperName.includes(e))) return true;
  // 檢查詞彙
  return BANISHED_WORDS.some(word => {
    if (word.length <= 4) {
      // 短單字採嚴格匹配或邊界匹配
      return upperName === word || upperName.split(/\s+/).includes(word);
    }
    return upperName.includes(word); // 長單字有包含就擋
  });
}

export default {
  // 定時任務：每分鐘整理一次排行榜快取
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
    
    // 🛡️ 防盜鏈：更新為你的新網域 ionmaster.3lite.io
    if (url.pathname.endsWith('.js')) {
      const referer = request.headers.get('Referer');
      if (!referer || (!referer.includes('ionmaster.3lite.io') && !referer.includes('ionmaster.threeliteeducation.workers.dev'))) {
        return new Response("A.A. Sir 說：非請勿入！🧪", { status: 403 });
      }
    }

    const headers = { 'Content-Type': 'application/json' };

    // --- 登入 API ---
    if (url.pathname === '/api/login' && request.method === 'POST') {
      const { username, passcode } = await request.json();
      
      // 🚀 新增：後端名字審查
      if (isNameForbidden(username)) {
        return new Response(JSON.stringify({ success: false, message: '🛑 系統警告：您的名稱包含不適當的內容，請換一個！' }), { headers });
      }

      let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
      if (rawData) {
        let userObj = JSON.parse(rawData);
        if (userObj.passcode !== passcode) return new Response(JSON.stringify({ success: false, message: '❌ 密碼錯誤！' }), { headers });
        return new Response(JSON.stringify({ success: true, data: userObj.data }), { headers });
      } else {
        return new Response(JSON.stringify({ success: true, isNew: true }), { headers });
      }
    }

    // --- 存檔 API (含防作弊驗證) ---
    if (url.pathname === '/api/save' && request.method === 'POST') {
      const { username, passcode, data, lvl } = await request.json();

      // 1. 等級公式驗證 (防作弊)
      const calculatedLvl = Math.floor(Math.sqrt(data.exp / 15)) + 1;
      if (lvl !== calculatedLvl) {
        return new Response(JSON.stringify({ success: false, message: '🧪 偵測到數據異常！存檔已被系統攔截。' }), { status: 400, headers });
      }

      // 2. 存檔與標籤更新
      await env.IONMASTER_DATA.put(
        `user_${username}`, 
        JSON.stringify({ passcode, data }),
        { metadata: { username: username, exp: data.exp, lvl: calculatedLvl } }
      );
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // --- 排行榜 API (讀取快取) ---
    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      let cache = await env.IONMASTER_DATA.get('CACHE_LEADERBOARD_TOP50');
      return new Response(cache || JSON.stringify([]), { headers });
    }

    // --- 兌換碼 API ---
    if (url.pathname === '/api/redeem' && request.method === 'POST') {
        const { code } = await request.json();
        const validCodes = { 'AASIR-CHEM-PRO': { reward: 10000 }, 'WELCOME-3LITE': { reward: 10 } };
        const codeData = validCodes[code];
        if (!codeData) return new Response(JSON.stringify({ success: false, message: '無效代碼' }), { headers });
        return new Response(JSON.stringify({ success: true, reward: codeData.reward }), { headers });
    }

    return new Response("Not found", { status: 404 });
  },
};
