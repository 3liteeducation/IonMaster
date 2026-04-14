export default {
  // 🚀 新增：定時任務 (Cron Trigger)，負責在背景自動整理全校排行榜
  async scheduled(event, env, ctx) {
    console.log("🏗️ 正在背景生成排行榜快取...");
    
    // 取出所有玩家的標籤
    let listed = await env.IONMASTER_DATA.list({ prefix: 'user_' });
    let lb = [];
    for (let key of listed.keys) {
      if (key.metadata) {
        lb.push({
          username: key.metadata.username,
          exp: key.metadata.exp,
          lvl: key.metadata.lvl
        });
      }
    }
    
    // 根據經驗值排序，只取前 50 名
    lb.sort((a, b) => b.exp - a.exp);
    lb = lb.slice(0, 50);
    
    // 儲存到一個叫做 CACHE_LEADERBOARD_TOP50 的快取檔案裡
    await env.IONMASTER_DATA.put('CACHE_LEADERBOARD_TOP50', JSON.stringify(lb));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
   // 🛡️ 防盜鏈邏輯
    if (url.pathname.endsWith('.js')) {
      const referer = request.headers.get('Referer');
      // 🚀 將這裡的網址替換為全新的 ionmaster.3lite.io
      if (!referer || !referer.includes('ionmaster.3lite.io')) {
        return new Response("A.A. Sir 說：非請勿入！請乖乖從首頁進入實驗室 🧪", { status: 403 });
      }
    }

    const headers = { 'Content-Type': 'application/json' };

    // --- 登入 API ---
    if (url.pathname === '/api/login' && request.method === 'POST') {
      const { username, passcode } = await request.json();
      let rawData = await env.IONMASTER_DATA.get(`user_${username}`);
      
      if (rawData) {
        let userObj = JSON.parse(rawData);
        if (userObj.passcode !== passcode) {
          return new Response(JSON.stringify({ success: false, message: '❌ 密碼錯誤！' }), { headers });
        }
        return new Response(JSON.stringify({ success: true, data: userObj.data }), { headers });
      } else {
        return new Response(JSON.stringify({ success: true, isNew: true }), { headers });
      }
    }

    // --- 防作弊驗證的存檔 API ---
    if (url.pathname === '/api/save' && request.method === 'POST') {
      const { username, passcode, data, lvl } = await request.json();

      // 後端公式驗證：重新計算等級
      const calculatedLvl = Math.floor(Math.sqrt(data.exp / 15)) + 1;

      // 守衛判斷：如果前端傳來的等級與計算結果不符，判定為竄改
      if (lvl !== calculatedLvl) {
        console.error(`偵測到竄改！玩家：${username}, 宣稱等級：${lvl}, 實際等級：${calculatedLvl}`);
        return new Response(JSON.stringify({ 
          success: false, 
          message: '🧪 實驗室警告：偵測到數據異常！存檔已被系統攔截。' 
        }), { status: 400, headers });
      }

      if (calculatedLvl > 100) {
        return new Response(JSON.stringify({ success: false, message: '超出實驗室等級上限！' }), { status: 400, headers });
      }

      // 執行存檔與 Metadata 標籤更新
      await env.IONMASTER_DATA.put(
        `user_${username}`, 
        JSON.stringify({ passcode, data }),
        { metadata: { username: username, exp: data.exp, lvl: calculatedLvl } }
      );
      
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // --- 🚀 效能大升級的排行榜 API ---
    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      // 學生點擊排行榜時，不再遍歷資料庫，而是直接秒速拿取快取檔案！
      let cacheRaw = await env.IONMASTER_DATA.get('CACHE_LEADERBOARD_TOP50');
      let lb = cacheRaw ? JSON.parse(cacheRaw) : [];
      return new Response(JSON.stringify({ success: true, leaderboard: lb }), { headers });
    }

    // --- 兌換碼 API ---
    if (url.pathname === '/api/redeem' && request.method === 'POST') {
        const { code } = await request.json();
        const validCodes = {
            'AASIR-CHEM-PRO': { reward: 10000, expires: '2026-05-01T23:59:59' }, 
            'CHEM-GOD': { reward: 100, expires: '2026-12-31T23:59:59' },
            'WELCOME-3LITE': { reward: 10, expires: null }
        };
        const codeData = validCodes[code];
        if (!codeData) return new Response(JSON.stringify({ success: false, message: '無效代碼' }), { headers });
        if (codeData.expires && new Date() > new Date(codeData.expires)) return new Response(JSON.stringify({ success: false, message: '代碼已過期' }), { headers });
        return new Response(JSON.stringify({ success: true, reward: codeData.reward }), { headers });
    }

    return new Response("Not found", { status: 404 });
  },
};
