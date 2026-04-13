export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'application/json' };

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

    if (url.pathname === '/api/save' && request.method === 'POST') {
      const { username, passcode, data, lvl } = await request.json();
      
      await env.IONMASTER_DATA.put(`user_${username}`, JSON.stringify({ passcode, data }));
      
      let lbRaw = await env.IONMASTER_DATA.get('GLOBAL_LEADERBOARD');
      let lb = lbRaw ? JSON.parse(lbRaw) : [];
      
      let idx = lb.findIndex(x => x.username === username);
      if (idx > -1) { 
          lb[idx].exp = data.exp; lb[idx].lvl = lvl; 
      } else { 
          lb.push({ username, exp: data.exp, lvl }); 
      }
      
      lb.sort((a, b) => b.exp - a.exp);
      lb = lb.slice(0, 50);
      await env.IONMASTER_DATA.put('GLOBAL_LEADERBOARD', JSON.stringify(lb));

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      let lbRaw = await env.IONMASTER_DATA.get('GLOBAL_LEADERBOARD');
      return new Response(JSON.stringify({ success: true, leaderboard: lbRaw ? JSON.parse(lbRaw) : [] }), { headers });
    }

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
