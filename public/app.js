// app.js - 主程式入口與安全防護
import { State } from './state.js';
import { UI } from './ui.js';
import { Game } from './game.js';

const Security = {
    init() {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());
        document.addEventListener('dragstart', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) || (e.ctrlKey && (e.key === 'U' || e.key === 'u')) || (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'U' || e.key === 'u'))) { e.preventDefault(); return false; }
        });
    }
};

const PWA = {
    deferredPrompt: null,
    init() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            const installBtn = document.getElementById('installAppBtn');
            if (installBtn) {
                installBtn.style.display = 'block';
                installBtn.onclick = async () => {
                    installBtn.style.display = 'none';
                    this.deferredPrompt.prompt();
                    const { outcome } = await this.deferredPrompt.userChoice;
                    console.log(`玩家選擇: ${outcome}`);
                    this.deferredPrompt = null;
                };
            }
        });
        window.addEventListener('appinstalled', () => {
            const installBtn = document.getElementById('installAppBtn');
            if (installBtn) installBtn.style.display = 'none';
            console.log('🎉 App 已成功安裝到桌面！');
        });
    }
};

// 🛡️ 防作弊橋樑：我們只把 HTML 按鈕「需要」呼叫的功能開放出去！
window.UI = UI;
window.Game = Game;
// 🚀 關鍵封印：我們只開放 State.login 給登入按鈕，不開放 State.data (金幣與經驗值)！
window.State = {
    login: () => State.login()
};

window.onload = () => {
    Security.init(); 
    State.init(); 
    PWA.init();
    
    document.getElementById('loginModal').style.display = 'flex';
    
    const pvpData = new URLSearchParams(window.location.search).get('pvp');
    if (pvpData) {
        try {
            const parsed = JSON.parse(atob(pvpData));
            if(parsed.t && parsed.d && parsed.d.length === 10) {
                State.pvp.active = true; State.pvp.deck = parsed.d; State.pvp.targetTime = parsed.t;
                document.getElementById('pvpBanner').style.display = 'block'; document.getElementById('pvpTargetTime').innerText = parsed.t;
            }
        } catch(e) {}
    }
};
