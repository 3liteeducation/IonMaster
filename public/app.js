// app.js - 主程式入口與安全防護
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

// 🚀 新增：PWA 安裝邏輯模組
const PWA = {
    deferredPrompt: null,
    init() {
        // 1. 攔截瀏覽器發出的「可安裝提示」
        window.addEventListener('beforeinstallprompt', (e) => {
            // 防止瀏覽器在底下顯示預設的迷你提示列 (特別是手機版)
            e.preventDefault();
            
            // 將這個事件存起來，晚點才能呼叫
            this.deferredPrompt = e;
            
            // 讓我們的「安裝到桌面」按鈕顯示出來
            const installBtn = document.getElementById('installAppBtn');
            if (installBtn) {
                installBtn.style.display = 'block';
                
                // 綁定點擊事件
                installBtn.onclick = async () => {
                    // 按下後先隱藏按鈕
                    installBtn.style.display = 'none';
                    // 觸發剛剛存起來的安裝提示
                    this.deferredPrompt.prompt();
                    // 等待玩家選擇 (安裝或取消)
                    const { outcome } = await this.deferredPrompt.userChoice;
                    console.log(`玩家選擇: ${outcome}`);
                    // 清空存起來的事件
                    this.deferredPrompt = null;
                };
            }
        });

        // 2. 監聽是否已經成功安裝
        window.addEventListener('appinstalled', () => {
            const installBtn = document.getElementById('installAppBtn');
            if (installBtn) installBtn.style.display = 'none';
            console.log('🎉 App 已成功安裝到桌面！');
        });
    }
};

window.onload = () => {
    Security.init(); 
    State.init(); 
    PWA.init(); // 🚀 啟動 PWA 監聽器
    
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
