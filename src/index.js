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

    // --- 🚀 新增：絕對公平的雲端抽卡 API ---
    if (url.pathname === '/api/gacha' && request.method === 'POST') {
      const { username, passcode, times } = await request.json();
      
      // 1. 驗證身分
      let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
      if (!rawData) return new Response(JSON.stringify({ success: false, message: '找不到玩家資料' }), { headers });
      let userObj = JSON.parse(rawData);
      if (userObj.passcode !== passcode) return new Response(JSON.stringify({ success: false, message: '身分驗證失敗' }), { headers });

      let data = userObj.data;
      let cost = (times === 10) ? 45 : times * 5;
      
      // 2. 檢查餘額
      if (data.coins < cost) return new Response(JSON.stringify({ success: false, message: '代幣不足，伺服器拒絕請求！' }), { headers });

      // 3. 扣除代幣
      data.coins -= cost;

      let results = [];
      let refund = 0;
      let hasGoldOrPurple = false;
      const PLAYABLE_IDS = Array.from({length: 45}, (_, i) => i + 1); // 1 到 45 號是普通卡片

      // 4. 雲端擲骰子邏輯 (駭客絕對摸不到這裡)
      for (let i = 0; i < times; i++) {
          let r = 'N'; 
          let rand = Math.random() * 100;
          
          data.pityCount = (data.pityCount || 50) - 1; // 保底計數器減 1
          
          if (data.pityCount <= 0) { r = 'SSR'; } 
          else { 
              if (rand < 1.5) r = 'SSR'; 
              else if (rand < 10) r = 'SR'; 
              else if (rand < 30) r = 'R'; 
          }
          
          // 十連抽保底 SR
          if (times === 10 && i === 9 && !hasGoldOrPurple && r !== 'SSR') { r = 'SR'; }
          if (r === 'SSR' || r === 'SR') hasGoldOrPurple = true;
          if (r === 'SSR') { data.pityCount = 50; } // 抽到 SSR 重置保底

          // 隨機選一張卡片
          let randomId = PLAYABLE_IDS[Math.floor(Math.random() * PLAYABLE_IDS.length)];
          let uniqueId = `${randomId}_${r}`;

          // 計算是否為新卡、升星或退款
          let stars = data.inventory[uniqueId] || 0;
          let isNew = stars === 0;
          let ref = 0;

          if (isNew) { 
              data.inventory[uniqueId] = 1; 
              data.exp += 10; 
          } else if (stars < 3) { 
              data.inventory[uniqueId]++; 
              data.exp += 5; 
          } else { 
              const REFUNDS = { 'N': 2, 'R': 4, 'SR': 6, 'SSR': 10 };
              ref = REFUNDS[r]; 
              refund += ref; 
          }

          results.push({ uniqueId, isNew, stars: data.inventory[uniqueId] || 3, ref });
      }

      data.coins += refund;
      
      // 5. 重新計算等級並存檔
      const calculatedLvl = Math.floor(Math.sqrt(data.exp / 15)) + 1;
      await env.IONMASTER_DATA.put(
          `user_${username}`, 
          JSON.stringify({ passcode, data }),
          { metadata: { username: username, exp: data.exp, lvl: calculatedLvl } }
      );

      // 6. 將結果傳回給前端
      return new Response(JSON.stringify({ 
          success: true, results, refund, newCoins: data.coins, newExp: data.exp, newPity: data.pityCount 
      }), { headers });
    }
    // --- API 結束 ---

// --- 🚀 新增：防作弊的遊戲成績結算 API ---
    if (url.pathname === '/api/game_result' && request.method === 'POST') {
      const { username, passcode, mode, payload } = await request.json();
      
      // 1. 驗證身分
      let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
      if (!rawData) return new Response(JSON.stringify({ success: false, message: '找不到玩家資料' }), { headers });
      let userObj = JSON.parse(rawData);
      if (userObj.passcode !== passcode) return new Response(JSON.stringify({ success: false, message: '身分驗證失敗' }), { headers });

      let data = userObj.data;
      let earnedExp = 0;
      let earnedCoins = 0;

      // 2. 審核「速度模式」成績
      if (mode === 'speed') {
          const { time, isPb, isPvpWin } = payload;
          
          // 🛑 防作弊核心：人類不可能在 3.5 秒內看完並點擊 10 題
          if (time < 3.5) { 
              console.error(`偵測到異常通關時間！玩家：${username}, 時間：${time}s`);
              return new Response(JSON.stringify({ success: false, message: '🛑 實驗室警告：偵測到異常的高速通關，成績不予採計！' }), { headers });
          }
          
          // 伺服器親自計算應得獎勵
          earnedExp += 50; // 基礎通關獎勵
          if (isPb) { earnedExp += 100; earnedCoins += 2; } // 破紀錄獎勵
          if (isPvpWin) { earnedExp += 150; earnedCoins += 5; } // PvP 獲勝獎勵
      }

      // 3. 將伺服器算好的獎勵加入資料庫
      data.exp += earnedExp;
      data.coins += earnedCoins;

      // 4. 重新計算等級並存檔
      const calculatedLvl = Math.floor(Math.sqrt(data.exp / 15)) + 1;
      await env.IONMASTER_DATA.put(
          `user_${username}`, 
          JSON.stringify({ passcode, data }),
          { metadata: { username: username, exp: data.exp, lvl: calculatedLvl } }
      );

      // 5. 回傳最新餘額給前端
      return new Response(JSON.stringify({ 
          success: true, 
          newExp: data.exp, 
          newCoins: data.coins
      }), { headers });
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
