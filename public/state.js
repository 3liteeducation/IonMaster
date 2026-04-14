// state.js - 專門處理玩家資料、登入與存檔邏輯
import { Database } from './data.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';

export const State = {
    username: "", 
    passcode: "", 
    data: {
        coins: 0, exp: 0, inventory: {}, quests: { date: "", list: [] }, 
        myHistory: [], errorLog: {}, redeemedCodes: [], pityCount: 50,
        isPendingSync: false // 🚀 新增：記錄是否有未上傳的離線存檔
    },
    game: { 
        mode: '', score: 0, combo: 0, startTime: null, timerInterval: null, 
        isAnimating: false, targetCard: null, battery: 0, feverCount: 0,
        alchemyTarget: 3, alchemyTimeLeft: 50
    },
    pvp: { active: false, targetTime: 0, deck: [], myRecord: [] },
    
    init() {
        this.data.coins = this.safeParse('aaCoins', 0);
        this.data.exp = this.safeParse('aaExp', 0);
        this.data.inventory = this.safeParse('aaInventorySep', {});
        this.data.quests = this.safeParse('aaQuests', { date: "", list: [] });
        this.data.myHistory = this.safeParse('myIonHistory', []);
        this.data.errorLog = this.safeParse('aaErrorLog', {});
        this.data.redeemedCodes = this.safeParse('aaRedeemedCodes', []);
        this.data.pityCount = this.safeParse('aaPityCount', 50); 
        this.data.isPendingSync = this.safeParse('aaPendingSync', false); // 🚀 讀取離線狀態

        // 🚀 離線同步：如果開機時發現有上次沒存到的檔，且目前有網路，就自動補傳
        if (this.data.isPendingSync && navigator.onLine) {
            console.log("📡 偵測到未同步的離線存檔，正在背景補傳...");
            this.uploadToServer();
        }
    },

    async login() {
        const uInput = document.getElementById('loginUsername');
        const pInput = document.getElementById('loginPasscode');
        const btn = document.getElementById('loginBtn');
        
        let user = uInput.value.trim().toUpperCase();
        let pass = pInput.value.trim();

        if (!user || !pass) { alert("⚠️ 帳號與密碼不得為空！"); return; }

        // 🚀 新增：LSSU 禁用詞彙審查 (Word Censorship)
        const isBanished = Database.banishedWords.some(word => {
            // 為了避免誤殺包含正常字母的短單字 (例如 G-era-ld 包含了 ERA)
            // 4 個字母以下的詞彙，我們要求帳號名稱必須「完全等於」或是「以空白分隔的單字包含它」
            if (word.length <= 4) {
                return user === word || user.split(/\s+/).includes(word);
            }
            // 長字眼則只要有包含就阻擋 (例如 SKIBIDI)
            return user.includes(word);
        });

        if (isBanished) {
            alert("🛑 實驗室警告：您的名稱包含了被 LSSU 列為「過度使用/煩人」的禁用詞彙 (Banished Word)！請發揮創意換一個正常的名稱。");
            return; // 阻擋登入流程
        }

        btn.innerText = "驗證中..."; btn.disabled = true;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, passcode: pass })
            });
            const result = await res.json();
            
            if (result.success) {
                this.username = user;
                this.passcode = pass;
                if (result.data) this.data = result.data; 

                this.checkDailyQuests(); 
                
                document.getElementById('loginModal').style.display = 'none';
                document.getElementById('profileName').innerText = this.username;
                
                this.save(); 
                UI.renderQuests(); 
                
                if(result.isNew) alert(`✨ 註冊成功！已為您建立雲端帳號：${this.username}`);
                AudioEngine.play('ssr');
            } else {
                alert(result.message); 
                btn.innerText = "進入系統"; btn.disabled = false;
            }
        } catch (e) {
            alert("❌ 雲端連線失敗，請檢查網路。");
            btn.innerText = "進入系統"; btn.disabled = false;
        }
    },

    safeParse(key, def) { try { let v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } },
    
    save() {
        // 1. 先存到瀏覽器本地 (保證本地永遠是最新的，離線也能玩)
        localStorage.setItem('aaCoins', this.data.coins); 
        localStorage.setItem('aaExp', this.data.exp);
        localStorage.setItem('aaInventorySep', JSON.stringify(this.data.inventory));
        localStorage.setItem('aaQuests', JSON.stringify(this.data.quests));
        localStorage.setItem('myIonHistory', JSON.stringify(this.data.myHistory));
        localStorage.setItem('aaErrorLog', JSON.stringify(this.data.errorLog));
        localStorage.setItem('aaRedeemedCodes', JSON.stringify(this.data.redeemedCodes));
        localStorage.setItem('aaPityCount', this.data.pityCount); 
        
        UI.updateProfile();
        let pityEl = document.getElementById('pityDisplay');
        if(pityEl) pityEl.innerText = `距離必中 SSR 還有 ${this.data.pityCount} 抽`;

        // 2. 🚀 判斷網路狀態進行雲端同步
        if (this.username) {
            if (navigator.onLine) {
                this.uploadToServer();
            } else {
                console.warn("⚠️ 網路斷線，存檔已存入本地，待連線後自動同步。");
                localStorage.setItem('aaPendingSync', 'true');
                this.data.isPendingSync = true;
            }
        }
    },

    // 🚀 新增：專門處理上傳邏輯的函數
    async uploadToServer() {
        try {
            const res = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: this.username, 
                    passcode: this.passcode, 
                    data: this.data,
                    lvl: this.getLevel().lvl 
                })
            });
            if (res.ok) {
                // 上傳成功，解除未同步警告
                localStorage.setItem('aaPendingSync', 'false');
                this.data.isPendingSync = false;
            }
        } catch (e) {
            // 上傳失敗（可能網路突然斷掉），標記為未同步
            localStorage.setItem('aaPendingSync', 'true');
            this.data.isPendingSync = true;
        }
    },

    addExp(amt) {
        let oldLvl = this.getLevel().lvl; this.data.exp += amt; this.save();
        if(this.getLevel().lvl > oldLvl) { AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti({particleCount: 150, spread: 80, origin: {y: 0.3}}); }
    },
    getLevel() {
        let exp = this.data.exp; let lvl = Math.floor(Math.sqrt(exp / 15)) + 1; 
        let title = lvl >= 50 ? "A.A. Sir's Top Student" : (lvl >= 30 ? "Precipitation Master" : (lvl >= 10 ? "Ion Catcher" : "Lab Rookie"));
        let next = 15 * Math.pow(lvl, 2); let prev = 15 * Math.pow(lvl - 1, 2);
        
        return { 
            lvl, title, 
            progress: Math.min(((exp - prev) / (next - prev)) * 100, 100),
            currExp: exp - prev, 
            reqExp: next - prev 
        };
    },
    checkDailyQuests() {
        const today = new Date().toDateString();
        if (this.data.quests.date !== today) {
            let shuffled = Database.config.questTemplates.sort(() => 0.5 - Math.random()).slice(0, 3);
            this.data.quests = { date: today, list: shuffled.map(q => ({ ...q, progress: 0, isClaimed: false })) };
            let login = this.data.quests.list.find(q => q.id === 'q_login'); if(login) login.progress = 1;
            this.save();
        }
    },
    updateQuest(id, amt=1) {
        let q = this.data.quests.list.find(x => x.id === id);
        if(q && !q.isClaimed && q.progress < q.target) { q.progress = Math.min(q.progress + amt, q.target); this.save(); UI.renderQuests(); }
    },
    logError(c, a) { let key = c.formula+"_"+a.formula; this.data.errorLog[key] = (this.data.errorLog[key]||0)+1; this.save(); }
};
