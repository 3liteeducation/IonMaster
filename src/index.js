export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 🛡️ 防盜鏈邏輯
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
          return new Response(JSON.stringify({ success: false, message: '❌ 密碼錯誤！' }), { headers });
        }
        return new Response(JSON.stringify({ success: true, data: userObj.data }), { headers });
      } else {
        return new Response(JSON.stringify({ success: true, isNew: true }), { headers });
      }
    }

    // --- 🚀 關鍵修改：具備防作弊驗證的存檔 API ---
    if (url.pathname === '/api/save' && request.method === 'POST') {
      const { username, passcode, data, lvl } = await request.json();

      // 1. 🔍 後端公式驗證：重新計算等級
      // 根據公式：lvl = floor(sqrt(exp / 15)) + 1
      const calculatedLvl = Math.floor(Math.sqrt(data.exp / 15)) + 1;

      // 2. 🛡️ 守衛判斷：如果前端傳來的等級與計算結果不符，判定為竄改
      if (lvl !== calculatedLvl) {
        console.error(`偵測到竄改！玩家：${username}, 宣稱等級：${lvl}, 實際等級：${calculatedLvl}`);
        return new Response(JSON.stringify({ 
          success: false, 
          message: '🧪 實驗室警告：偵測到數據異常！存檔已被系統攔截。' 
        }), { status: 400, headers });
      }

      // 3. 限制最高等級（可選，例如設定 Lv.100 為上限）
      if (calculatedLvl > 100) {
        return new Response(JSON.stringify({ success: false, message: '超出實驗室等級上限！' }), { status: 400, headers });
      }

      // 通過驗證，執行存檔與 Metadata 標籤更新
      await env.IONMASTER_DATA.put(
        `user_${username}`, 
        JSON.stringify({ passcode, data }),
        {
          metadata: { username: username, exp: data.exp, lvl: calculatedLvl }
        }
      );
      
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // --- 排行榜 API ---
    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
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
      lb.sort((a, b) => b.exp - a.exp);
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
