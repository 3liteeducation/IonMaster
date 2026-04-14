export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 如果請求的是 .js 檔案 (防盜鏈邏輯保持不變)
    if (url.pathname.endsWith('.js')) {
      const referer = request.headers.get('Referer');
      if (!referer || !referer.includes('ionmaster.threeliteeducation.workers.dev')) {
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
          return new Response(JSON.stringify({ success: false, message: '❌ 密碼錯誤！請確認您的身份。' }), { headers });
        }
        return new Response(JSON.stringify({ success: true, data: userObj.data }), { headers });
      } else {
        return new Response(JSON.stringify({ success: true, isNew: true }), { headers });
      }
    }

    // --- 存檔 API ---
    if (url.pathname === '/api/save' && request.method === 'POST') {
      const { username, passcode, data, lvl } = await request.json();
      
      // 🚀 關鍵修改：存檔時，把排行榜需要的資訊當作「標籤 (metadata)」貼在檔案外！
      await env.IONMASTER_DATA.put(
        `user_${username}`, 
        JSON.stringify({ passcode, data }),
        {
          metadata: { username: username, exp: data.exp, lvl: lvl }
        }
      );
      
      // 注意：我們把原本容易發生衝突的 GLOBAL_LEADERBOARD 讀寫邏輯刪除了！
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // --- 排行榜 API ---
    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      // 🚀 關鍵修改：不再讀取容易出錯的單一排行榜檔案
      // 而是請資料庫列出所有開頭是 "user_" 的檔案，並收集它們的標籤！
      let listed = await env.IONMASTER_DATA.list({ prefix: 'user_' });
      let lb = [];
      
      for (let key of listed.keys) {
        // 如果這個玩家有分數標籤，就把他加入名單
        if (key.metadata) {
          lb.push({
            username: key.metadata.username,
            exp: key.metadata.exp,
            lvl: key.metadata.lvl
          });
        }
      }
      
      // 根據經驗值 (exp) 由大到小排序
      lb.sort((a, b) => b.exp - a.exp);
      // 只取前 50 名
      lb = lb.slice(0, 50);

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
