export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 攔截網頁發過來的 API 請求
    if (url.pathname === '/api/redeem' && request.method === 'POST') {
      try {
        const body = await request.json();
        const code = body.code;

        // 🛡️ 真正的密碼藏在伺服器這裡！學生絕對看不到
        const validCodes = {
          'AASIR-CHEM-PRO': { reward: 10000, expires: '2026-05-01T23:59:59' }, 
          'CHEM-GOD': { reward: 100, expires: '2026-12-31T23:59:59' },
          'WELCOME-3LITE': { reward: 10, expires: null }
        };

        const codeData = validCodes[code];

        // 狀況一：查無此密碼
        if (!codeData) {
          return new Response(JSON.stringify({ success: false, message: '無效的禮物碼或輸入錯誤！' }), { headers: { 'Content-Type': 'application/json' } });
        }

        // 狀況二：密碼過期
        if (codeData.expires && new Date() > new Date(codeData.expires)) {
          return new Response(JSON.stringify({ success: false, message: '哎呀！這個禮物碼已經過期啦！' }), { headers: { 'Content-Type': 'application/json' } });
        }

        // 狀況三：密碼正確，發放代幣
        return new Response(JSON.stringify({ success: true, reward: codeData.reward }), { headers: { 'Content-Type': 'application/json' } });

      } catch (e) {
        return new Response(JSON.stringify({ success: false, message: '伺服器處理錯誤' }), { status: 400 });
      }
    }

    // 如果不是 API 請求，回傳 404 (Cloudflare 會自動接手處理 public 裡的網頁)
    return new Response("Not found", { status: 404 });
  },
};
