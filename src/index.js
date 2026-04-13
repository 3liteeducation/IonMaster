export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'application/json' };

    // 🔒 API 1: 登入並讀取存檔
    if (url.pathname === '/api/login' && request.method === 'POST') {
      const { username } = await request.json();
      // 從 KV 資料庫撈取該玩家的資料
      let savedData = await env.IONMASTER_DATA.get(`player_${username}`);
      
      if (savedData) {
        return new Response(JSON.stringify({ success: true, data: JSON.parse(savedData) }), { headers });
      } else {
        // 如果是新玩家，回傳初始數據
        return new Response(JSON.stringify({ success: true, isNew: true }), { headers });
      }
    }

    // 💾 API 2: 同步存檔到雲端
    if (url.pathname === '/api/save' && request.method === 'POST') {
      const { username, data } = await request.json();
      // 將資料壓成字串存進 KV
      await env.IONMASTER_DATA.put(`player_${username}`, JSON.stringify(data));
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // 🎁 API 3: 禮物碼 (保留原本邏輯)
    if (url.pathname === '/api/redeem' && request.method === 'POST') {
        const { code } = await request.json();
        const validCodes = {
            'AASIR-CHEM-PRO': { reward: 10000, expires: '2026-05-01T23:59:59' }, 
            'CHEM-GOD': { reward: 100, expires: '2026-12-31T23:59:59' }
        };
        const codeData = validCodes[code];
        if (!codeData) return new Response(JSON.stringify({ success: false, message: '無效代碼' }), { headers });
        return new Response(JSON.stringify({ success: true, reward: codeData.reward }), { headers });
    }

    return new Response("Not found", { status: 404 });
  },
};
