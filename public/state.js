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
        isPendingSync: false
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
        this.data.isPendingSync = this.safeParse('aaPendingSync', false);

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
                localStorage.setItem('aaPendingSync', 'false');
                this.data.isPendingSync = false;
            }
        } catch (e) {
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
    updateQuest(id, amt=1) {
        let q = this.data.quests.list.find(x => x.id === id);
        if(q && !q.isClaimed && q.progress < q.target) { q.progress = Math.min(q.progress + amt, q.target); this.save(); UI.renderQuests(); }
    },
    logError(c, a) { let key = c.formula+"_"+a.formula; this.data.errorLog[key] = (this.data.errorLog[key]||0)+1; this.save(); }
};
