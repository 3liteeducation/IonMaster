// ==========================================
// Module 1: 集中式狀態管理 (Centralized State)
// ==========================================
const State = {
    data: {
        coins: 0, exp: 0, inventory: {}, quests: { date: "", list: [] }, 
        myHistory: [], errorLog: {}, redeemedCodes: [] // 👈 包含已兌換紀錄
    },
    game: { mode: '', score: 0, combo: 0, startTime: null, timerInterval: null, isAnimating: false, targetCard: null },
    pvp: { active: false, targetTime: 0, deck: [], myRecord: [] },
    
    init() {
        this.data.coins = this.safeParse('aaCoins', 0);
        this.data.exp = this.safeParse('aaExp', 0);
        this.data.inventory = this.safeParse('aaInventorySep', {});
        this.data.quests = this.safeParse('aaQuests', { date: "", list: [] });
        this.data.myHistory = this.safeParse('myIonHistory', []);
        this.data.errorLog = this.safeParse('aaErrorLog', {});
        this.data.redeemedCodes = this.safeParse('aaRedeemedCodes', []); // 👈 讀取兌換紀錄
        this.checkDailyQuests(); this.save();
    },
    safeParse(key, def) { try { let v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } },
    save() {
        localStorage.setItem('aaCoins', this.data.coins); localStorage.setItem('aaExp', this.data.exp);
        localStorage.setItem('aaInventorySep', JSON.stringify(this.data.inventory));
        localStorage.setItem('aaQuests', JSON.stringify(this.data.quests));
        localStorage.setItem('myIonHistory', JSON.stringify(this.data.myHistory));
        localStorage.setItem('aaErrorLog', JSON.stringify(this.data.errorLog));
        localStorage.setItem('aaRedeemedCodes', JSON.stringify(this.data.redeemedCodes)); // 👈 儲存兌換紀錄
        UI.updateProfile();
    },
    addExp(amt) {
        let oldLvl = this.getLevel().lvl; this.data.exp += amt; this.save();
        if(this.getLevel().lvl > oldLvl) { AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti({particleCount: 150, spread: 80, origin: {y: 0.3}}); }
    },
    getLevel() {
        let exp = this.data.exp; let lvl = Math.floor(Math.sqrt(exp / 15)) + 1; let title = "Lab Rookie";
        if(lvl >= 50) title = "A.A. Sir's Top Student"; else if(lvl >= 30) title = "Precipitation Master"; else if(lvl >= 10) title = "Ion Catcher";
        let next = 15 * Math.pow(lvl, 2); let prev = 15 * Math.pow(lvl - 1, 2);
        return { lvl, title, progress: Math.min(((exp - prev) / (next - prev)) * 100, 100) };
    },
    checkDailyQuests() {
        const today = new Date().toDateString();
        if (this.data.quests.date !== today) {
            let shuffled = Database.config.questTemplates.sort(() => 0.5 - Math.random()).slice(0, 3);
            this.data.quests = { date: today, list: shuffled.map(q => ({ ...q, progress: 0, isClaimed: false })) };
            let login = this.data.quests.list.find(q => q.id === 'q_login'); if(login) login.progress = 1;
        }
    },
    updateQuest(id, amt=1) {
        let q = this.data.quests.list.find(x => x.id === id);
        if(q && !q.isClaimed && q.progress < q.target) { q.progress = Math.min(q.progress + amt, q.target); this.save(); UI.renderQuests(); }
    },
    logError(c, a) { let key = c.formula+"_"+a.formula; this.data.errorLog[key] = (this.data.errorLog[key]||0)+1; this.save(); }
};

// ==========================================
// Module 2: 音效引擎 (Lazy Load)
// ==========================================
const AudioEngine = {
    ctx: null,
    init() { try { if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if(this.ctx.state === 'suspended') this.ctx.resume(); } catch(e){} },
    tone(freq, type, dur, vol=0.1) {
        this.init(); if(!this.ctx) return; try {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + dur);
        } catch(e){}
    },
    play(sound) {
        const s = {
            correct: () => { this.tone(600,'sine',0.1); setTimeout(()=>this.tone(800,'sine',0.2),100); },
            wrong: () => { this.tone(150,'sawtooth',0.3,0.2); }, click: () => { this.tone(400,'sine',0.05); },
            draw: () => { this.tone(800,'square',0.1,0.05); this.tone(1200,'sine',0.3,0.05); },
            ssr: () => { this.tone(400,'sine',0.2); setTimeout(()=>this.tone(600,'sine',0.2),150); setTimeout(()=>this.tone(900,'sine',0.4),300); },
            explode: () => { this.tone(100,'square',0.5,0.3); this.tone(50,'sawtooth',0.6,0.3); }
        };
        if(s[sound]) s[sound]();
    }
};
document.body.addEventListener('click', () => AudioEngine.init(), {once:true});

// ==========================================
// Module 3: 介面渲染管理器 (DOM Optimization)
// ==========================================
const UI = {
    switchView(viewId, btnElem) {
        AudioEngine.play('click');
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
        document.getElementById('view-' + viewId).classList.add('active');
        if(btnElem) btnElem.classList.add('active');
        if(viewId === 'gallery') this.filterGallery('all');
        if(viewId === 'lab') this.filterLab('all');
    },
    toggleModal(id, show) { if(show) AudioEngine.play('click'); document.getElementById(id).style.display = show ? 'flex' : 'none'; },
    setLock(locked) { State.game.isAnimating = locked; document.getElementById('animLock').style.display = locked ? 'block' : 'none'; },
    updateProfile() {
        document.getElementById('mainCoinCount').innerText = State.data.coins;
        let info = State.getLevel();
        document.getElementById('playerLevel').innerText = info.lvl;
        let titleEl = document.getElementById('playerTitle'); titleEl.innerText = info.title;
        titleEl.style.color = info.lvl >= 50 ? 'var(--rare)' : 'white';
        document.getElementById('expBar').style.width = info.progress + '%';
    },
    renderQuests() {
        const list = document.getElementById('questList'); list.innerHTML = '';
        State.data.quests.list.forEach((q, i) => {
            let btn = q.isClaimed ? `<button class="ios-btn" style="background:transparent; color:var(--rare); padding:0; width:auto; box-shadow:none;">✔️</button>` : 
                     (q.progress >= q.target ? `<button class="ios-btn primary-btn" style="padding:8px 12px; font-size:14px; width:auto;" onclick="Game.claimQuest(${i})">領取 ${q.reward}🪙</button>` : 
                     `<span style="font-size:14px; font-weight:bold; color:var(--apple-gray);">${q.progress}/${q.target}</span>`);
            list.innerHTML += `<div class="quest-item"><div class="quest-info"><div class="ios-subtitle" style="margin:0;">${q.title}</div><div class="ios-desc">${q.desc}</div></div>${btn}</div>`;
        });
    },
    getStarStr(n) { return "⭐".repeat(n); },
    
    // 【核心修復】精準讀取未解鎖卡牌的圖片
    createCardNode(card, stars, isOwned, onClick) {
        const item = document.createElement('div');
        item.className = `card-item ${isOwned ? 'owned ' + card.targetRarity.toLowerCase() : 'locked'} ${stars >= 3 ? 'max-star' : ''}`;
        
        // 確保不論解鎖與否，都讀取精確的稀有度路徑
        let imgPath = `images/${card.fileKey}_${card.targetRarity.toLowerCase()}.png`;
        
        if (isOwned) {
            item.innerHTML = `<img src="${imgPath}" class="full-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="fallback-content" style="display:none;"><div style="font-size:24px;">${card.html}</div><div style="font-size:12px; margin-top:5px;">${card.targetRarity}</div></div><div class="stars-overlay">${this.getStarStr(stars)}</div>`;
            item.onclick = onClick; 
        } else {
            // 這裡已經將原本寫死的 _n.png 改成了 ${imgPath}
            item.innerHTML = `<img src="${imgPath}" class="full-card-img locked-blur" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="fallback-content" style="display:none; background: #eee;"><div style="font-size:18px; color: #7f8c8d;">${card.html}</div><div style="font-size:10px;">${card.targetRarity}</div></div><div class="locked-overlay">🔒</div>`;
            if(onClick) item.onclick = onClick; 
        }
        return item;
    },
    
    filterGallery(type) {
        AudioEngine.play('click');
        document.querySelectorAll('#view-gallery .filter-chip').forEach(el => el.classList.remove('active')); event.target.classList.add('active');
        const grid = document.getElementById('galleryGrid'); grid.innerHTML = ''; let unlockCount = 0;
        const fragment = document.createDocumentFragment(); 
        Database.expandedPool.forEach(card => {
            const stars = State.data.inventory[card.uniqueId] || 0; const isOwned = stars > 0; if(isOwned) unlockCount++;
            const isCation = card.id < 22 || card.id === 99; const isAnion = card.id >= 22 && card.id <= 45;
            if (type === 'locked' && isOwned) return; if (type === 'ssr' && card.targetRarity !== 'SSR') return;
            if (type === 'cation' && !isCation) return; if (type === 'anion' && !isAnion) return;
            fragment.appendChild(this.createCardNode(card, stars, isOwned, isOwned ? () => Game.showGachaResult(card, card.targetRarity, stars, false, 0, false) : null));
        });
        grid.appendChild(fragment); document.getElementById('collectionCount').innerText = `${unlockCount}/184`;
    },
    filterLab(type) {
        AudioEngine.play('click');
        document.querySelectorAll('#view-lab .filter-chip').forEach(el => el.classList.remove('active')); event.target.classList.add('active');
        const grid = document.getElementById('labGrid'); grid.innerHTML = ''; const fragment = document.createDocumentFragment();
        Database.expandedPool.forEach(card => {
            if(card.isSpecial) return; if(type !== 'all' && card.targetRarity.toLowerCase() !== type) return;
            const stars = State.data.inventory[card.uniqueId] || 0; const isMaxed = stars >= 3;
            let item = this.createCardNode(card, stars, stars > 0, null); if(isMaxed) item.className += ' maxed-out';
            if (!isMaxed) {
                item.onclick = () => {
                    AudioEngine.play('click'); let cost = Database.config.alchemyCosts[card.targetRarity];
                    if (State.data.coins < cost) { alert(`🪙 餘額不足！需要 ${cost} 枚代幣。`); return; }
                    if (confirm(`確定消耗 ${cost} 🪙 來 ${(stars > 0)?"升星":"解鎖"}「${card.targetRarity}級 ${card.name}」？\n(需連答對3題，失敗不退款！)`)) {
                        State.data.coins -= cost; State.save(); State.game.targetCard = card; Game.start('alchemy');
                    }
                };
            }
            fragment.appendChild(item);
        });
        grid.appendChild(fragment);
    }
};

// ==========================================
// Module 4: 遊戲核心邏輯 (Game Controller)
// ==========================================
const Game = {
    claimQuest(idx) {
        let q = State.data.quests.list[idx];
        if(q.progress >= q.target && !q.isClaimed) { AudioEngine.play('ssr'); q.isClaimed = true; State.data.coins += q.reward; State.save(); UI.renderQuests(); if(typeof confetti !== 'undefined') confetti({particleCount: 50, spread: 60, origin: {y: 0.8}});}
    },
    redeemCode() {
        AudioEngine.play('click');
        const input = document.getElementById('redeemInput');
        const code = input.value.trim().toUpperCase();
        if (!code) { alert('❌ 請輸入禮物碼！'); return; }

        // 🎁 在這裡自由設定您的禮物碼、獎勵、以及過期時間！
        // 格式：'禮物碼': { reward: 代幣數量, expires: 'YYYY-MM-DDTHH:mm:ss' 或 null }
        const validCodes = {
            'AASIR-PRO': { reward: 100, expires: '2026-05-01T23:59:59' }, 
            'CHEM-GOD': { reward: 50, expires: '2026-12-31T23:59:59' },
            'WELCOME-3LITE': { reward: 10, expires: null } // null 代表永久有效
        };

        if (!validCodes.hasOwnProperty(code)) {
            alert('❌ 無效的禮物碼！請確認是否輸入正確。');
            return;
        }

        const codeData = validCodes[code];

        // ⏳ 檢查時間限制機制
        if (codeData.expires !== null) {
            const now = new Date(); 
            const expiryDate = new Date(codeData.expires); 
            
            if (now > expiryDate) {
                AudioEngine.play('wrong');
                alert('⏳ 哎呀！這個禮物碼已經過期啦！下次請早點來兌換喔。');
                return;
            }
        }

        // 檢查是否已經兌換過
        if (State.data.redeemedCodes.includes(code)) {
            alert('⚠️ 這個禮物碼您已經兌換過囉！把機會留給別人吧。');
            return;
        }

        // 兌換成功邏輯
        const reward = codeData.reward;
        State.data.coins += reward;
        State.data.redeemedCodes.push(code); // 紀錄已使用
        State.save();
        
        input.value = ''; // 清空輸入框
        UI.toggleModal('redeemModal', false);
        AudioEngine.play('ssr');
        if(typeof confetti !== 'undefined') confetti({particleCount: 200, spread: 100, origin: {y: 0.3}});
        alert(`🎉 兌換成功！獲得 ${reward} 🪙 AA 代幣！`);
    },
    start(mode) {
        AudioEngine.play('click'); State.game.mode = mode; State.game.score = 0; State.game.combo = 0; State.game.timerInterval = null; State.pvp.myRecord = [];
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.getElementById('view-play').classList.add('active'); document.getElementById('activeGameArea').style.display = 'block'; document.querySelector('.game-modes').style.display = 'none';
        document.body.className = (mode === 'alchemy') ? 'bg-alchemy' : (mode === 'speed' || mode === 'pvp' ? 'bg-speed' : 'bg-main');
        
        let pTxt = document.getElementById('progressText'); let tDisp = document.getElementById('timerDisplay');
        if (mode === 'speed' || mode === 'pvp') {
            pTxt.innerText = "進度: 0/10"; pTxt.style.color = "var(--secondary)"; tDisp.style.display = 'block';
            State.game.startTime = Date.now(); State.game.timerInterval = setInterval(() => { tDisp.innerText = ((Date.now() - State.game.startTime) / 1000).toFixed(1) + "s"; }, 100);
        } else if (mode === 'practice') {
            pTxt.innerText = "已答對: 0 題"; pTxt.style.color = "var(--secondary)"; tDisp.style.display = 'none';
        } else if (mode === 'alchemy') {
            pTxt.innerText = "煉金進度: 0/3"; pTxt.style.color = "var(--rare)"; tDisp.style.display = 'none';
        }
        document.getElementById('batteryLevel').style.width = '0%'; this.nextQuestion();
    },
    quit() {
        AudioEngine.play('click'); clearInterval(State.game.timerInterval); document.body.className = 'bg-main'; document.body.classList.remove('screen-shake');
        document.getElementById('activeGameArea').style.display = 'none'; document.querySelector('.game-modes').style.display = 'block';
        if(State.pvp.active) { window.history.pushState({}, '', window.location.pathname); State.pvp.active = false; document.getElementById('pvpBanner').style.display = 'none'; }
        UI.switchView('home');
    },
    nextQuestion() {
        let m = State.game.mode; if ((m === 'speed' || m === 'pvp') && State.game.score >= 10) { this.finishSpeed(); return; } if (m === 'alchemy' && State.game.score >= 3) { this.finishAlchemy(true); return; }
        State.game.isAnswered = false; let curC, curA, scenario;

        if (m === 'pvp') {
            let qD = State.pvp.deck[State.game.score]; curC = Database.playableCations.find(c => c.id === qD.c); curA = Database.playableAnions.find(a => a.id === qD.a); scenario = qD.s;
        } else {
            const isValid = (c, a) => { const bl = ['NH4_OH','H_NO3','H_NO2','H_Cl','H_Br','H_I','H_SO4','H_SO3','H_OH','H_O','H_CO3','H_PO4','H_CN','H_MnO4','H_ClO3','H_ClO','H_CrO4','H_Cr2O7','H_H','H_HSO4','H_HCO3']; return !bl.includes(c.formula + '_' + a.formula); };
            if (m === 'alchemy') {
                let tc = State.game.targetCard; let isC = Database.playableCations.some(c => c.id === tc.id);
                let pool = (isC ? Database.playableAnions : Database.playableCations).filter(p => isC ? isValid(tc, p) : isValid(p, tc));
                if(isC) { curC = tc; curA = pool[Math.floor(Math.random() * pool.length)]; } else { curA = tc; curC = pool[Math.floor(Math.random() * pool.length)]; }
            } else {
                do { curC = Database.playableCations[Math.floor(Math.random() * Database.playableCations.length)]; curA = Database.playableAnions[Math.floor(Math.random() * Database.playableAnions.length)]; } while (!isValid(curC, curA));
            }
            scenario = Math.floor(Math.random() * 3);
        }
        
        if (m === 'speed') State.pvp.myRecord.push({ c: curC.id, a: curA.id, s: scenario });
        
        const getGCD = (a, b) => b ? getGCD(b, a % b) : a; const fSub = t => t.replace(/([0-9]+)/g, '<sub>$1</sub>');
        const bForm = (c, a, sc, sa) => { let cp = fSub(c.formula); if(sc>1) cp = c.poly?`(${cp})<sub>${sc}</sub>`:`${cp}<sub>${sc}</sub>`; let ap = fSub(a.formula); if(sa>1) ap = a.poly?`(${ap})<sub>${sa}</sub>`:`${ap}<sub>${sa}</sub>`; return cp+ap; };
        const bName = (c, a) => `<span style="font-size:22px;">${c.name.replace(/ion/i,'').trim()} ${a.name.replace(/ion/i,'').trim().toLowerCase()}</span>`;
        
        let cSub = curA.charge, aSub = curC.charge; let com = getGCD(cSub, aSub); cSub /= com; aSub /= com;
        let opts = [], oSet = new Set(), qEl = document.getElementById('question');
        qEl.innerHTML = (scenario <= 1) ? `<span>${curC.html} &nbsp;+&nbsp; ${curA.html}</span>` : `<span style="font-size:26px;">${curC.name.replace(/ion/i,'').trim()} ion<br>+<br>${curA.name.replace(/ion/i,'').trim()} ion</span>`;

        if (scenario === 0 || scenario === 2) {
            let correct = bForm(curC, curA, cSub, aSub); opts.push({h: correct, c: true}); oSet.add(correct);
            while(opts.length < 4) { let fake = bForm(curC, curA, Math.floor(Math.random()*3)+1, Math.floor(Math.random()*3)+1); if(!oSet.has(fake)) { oSet.add(fake); opts.push({h: fake, c: false}); } }
        } else {
            let correct = bName(curC, curA); opts.push({h: correct, c: true}); oSet.add(correct);
            while(opts.length < 4) { let fake = bName(curC, Database.playableAnions[Math.floor(Math.random() * Database.playableAnions.length)]); if(!oSet.has(fake)) { oSet.add(fake); opts.push({h: fake, c: false}); } }
        }

        opts.sort(() => 0.5 - Math.random()); let oArea = document.getElementById('optionsArea'); oArea.innerHTML = '';
        opts.forEach(opt => { let b = document.createElement('button'); b.className = 'option-btn'; b.innerHTML = opt.h; b.onclick = () => this.handleAns(b, opt.c, curC, curA); oArea.appendChild(b); });
    },
    handleAns(btn, isCorrect, c, a) {
        if(State.game.isAnswered) return; State.game.isAnswered = true; let m = State.game.mode;
        if(isCorrect) {
            AudioEngine.play('correct'); btn.classList.add('correct'); State.game.score++;
            if (m === 'speed' || m === 'pvp') { document.getElementById('progressText').innerText = `進度: ${State.game.score}/10`; document.getElementById('batteryLevel').style.width = (State.game.score * 10) + "%"; } 
            else if (m === 'alchemy') { document.getElementById('progressText').innerText = `煉金: ${State.game.score}/3`; document.getElementById('batteryLevel').style.width = (State.game.score * 33.3) + "%"; } 
            else { State.addExp(5); State.updateQuest('q_practice', 1); document.getElementById('progressText').innerText = `答對: ${State.game.score}`; State.game.combo++; if (State.game.combo >= 5) { State.data.coins++; State.game.combo = 0; State.save(); } document.getElementById('batteryLevel').style.width = ((State.game.score % 10) * 10 || 100) + "%"; }
            setTimeout(()=>this.nextQuestion(), 400); 
        } else {
            AudioEngine.play('wrong'); btn.classList.add('wrong'); State.logError(c, a);
            if (m === 'alchemy') { setTimeout(()=>this.finishAlchemy(false), 300); } else { setTimeout(() => { btn.classList.remove('wrong'); State.game.isAnswered = false; }, 1000); }
        }
    },
    finishSpeed() {
        clearInterval(State.game.timerInterval); let fTime = (Date.now() - State.game.startTime) / 1000; State.updateQuest('q_speed', 1);
        let content = document.getElementById('resultContent');
        let best = State.data.myHistory.length > 0 ? Math.min(...State.data.myHistory.map(x => x.time)) : Infinity; State.addExp(50);
        
        let html = `<h2 class="ios-title">${State.pvp.active ? "⚔️ 決鬥結束" : "🎯 挑戰完成"}</h2>`;
        html += `<p class="ios-desc">${State.pvp.active ? `目標時間：${State.pvp.targetTime}s<br>你的時間：` : "本次時間："}</p>`;
        html += `<div style="font-size:36px; color:var(--legend); font-weight:bold; margin-bottom: 10px;">${fTime.toFixed(2)}s</div>`;
        
        if(State.pvp.active) {
            if(fTime < State.pvp.targetTime) { html += `<div class="reward-badge" style="display:block;">🎉 踢館成功！+5🪙 +150EXP</div>`; State.data.coins += 5; State.addExp(150); AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti({particleCount: 150, spread: 80}); } 
            else { html += `<div class="reward-badge" style="display:block; background:#8e8e93;">💀 挑戰失敗...</div>`; }
            window.history.pushState({}, '', window.location.pathname); State.pvp.active = false; document.getElementById('pvpBanner').style.display = 'none';
        } else {
            html += `<div class="glass-panel" style="padding:10px; margin:15px 0;"><div style="color:var(--apple-orange); font-weight:bold; font-size:12px;">👑 歷史最佳 (PB)</div><div style="font-size:24px; font-weight:bold;">${Math.min(best, fTime).toFixed(2)}s</div></div>`;
            if (State.data.myHistory.length > 0 && fTime < best) { html += `<div class="reward-badge" style="display:block;">🎉 破紀錄！+2🪙 +100EXP</div>`; State.data.coins += 2; State.addExp(100); AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti({particleCount: 100, spread: 70, origin: {y: 0.6}}); }
            html += `<button class="ios-btn warning-btn mb-2" onclick="Game.sharePvP(${fTime})">⚔️ 邀請同學挑戰此紀錄！</button>`;
            State.data.myHistory.unshift({ time: fTime }); localStorage.setItem('myIonHistory', JSON.stringify(State.data.myHistory.slice(0, 5)));
        }
        html += `<button class="ios-btn cancel-btn mt-2" onclick="Game.quit()">返回首頁</button>`;
        content.innerHTML = html; UI.toggleModal('resultModal', true); State.save();
    },
    finishAlchemy(success) {
        if(!success) { AudioEngine.play('explode'); document.body.classList.add('screen-shake'); UI.toggleModal('explosionModal', true); return; }
        let c = State.game.targetCard; let stars = State.data.inventory[c.uniqueId] || 0; let isNew = stars === 0;
        State.data.inventory[c.uniqueId] = stars + 1; State.addExp(30); State.save();
        
        UI.setLock(true); document.body.className = 'bg-main'; document.getElementById('gachaAnimText').innerText = "煉金大成功！"; UI.toggleModal('gachaAnimModal', true); AudioEngine.play('draw');
        setTimeout(() => { document.getElementById('whiteFlash').classList.add('active'); setTimeout(() => { UI.toggleModal('gachaAnimModal', false); document.getElementById('gachaAnimText').innerText = "高能反應合成中..."; this.showGachaResult(c, c.targetRarity, State.data.inventory[c.uniqueId], isNew, 0, true); this.quit(); setTimeout(() => { document.getElementById('whiteFlash').classList.remove('active'); UI.setLock(false);}, 100); }, 400); }, 1500); 
    },
    drawCard(times) {
        if(State.game.isAnimating) return; AudioEngine.play('click'); let cost = times * 5; if (State.data.coins < cost) { alert(`🪙 代幣不足！需要 ${cost} 枚。`); return; }
        State.data.coins -= cost; State.updateQuest('q_gacha', times); State.save(); UI.setLock(true);
        let res = []; let refund = 0;
        for(let i=0; i<times; i++) {
            let r = 'N'; let rand = Math.random() * 100; if(rand<1.5) r='SSR'; else if(rand<10) r='SR'; else if(rand<30) r='R';
            let pool = Database.expandedPool.filter(x => x.targetRarity === r); if(r==='SSR') pool = pool.filter(x => (Math.random()<0.1) ? x.isSpecial : !x.isSpecial); else pool = pool.filter(x => !x.isSpecial);
            let c = pool[Math.floor(Math.random() * pool.length)]; let stars = State.data.inventory[c.uniqueId] || 0; let isNew = stars === 0; let ref = 0;
            if(isNew) { State.data.inventory[c.uniqueId] = 1; State.addExp(10); } else if(stars<3) { State.data.inventory[c.uniqueId]++; State.addExp(5); } else { ref = Database.config.refunds[r]; refund += ref; }
            res.push({ c, isNew, stars: State.data.inventory[c.uniqueId] || 3, ref });
        }
        State.data.coins += refund; State.save();
        UI.toggleModal('gachaAnimModal', true); AudioEngine.play('draw');
        setTimeout(() => { document.getElementById('whiteFlash').classList.add('active'); setTimeout(() => { UI.toggleModal('gachaAnimModal', false); if(times===1) this.showGachaResult(res[0].c, res[0].c.targetRarity, res[0].stars, res[0].isNew, res[0].ref, false); else this.showTenDraw(res, refund); setTimeout(() => { document.getElementById('whiteFlash').classList.remove('active'); UI.setLock(false);}, 100); }, 400); }, 2000); 
    },
    showGachaResult(card, rarity, stars, isNew, refundAmt, isAlchemy) {
        State.game.currentDrawnCard = { ...card, currentRarity: rarity, currentStars: stars }; 
        let color = rarity==='SSR' ? 'var(--rare)' : (rarity==='SR' ? 'var(--apple-purple)' : 'var(--secondary)');
        if(rarity==='SSR') { if(isNew||isAlchemy) AudioEngine.play('ssr'); else if(!refundAmt) AudioEngine.play('correct'); }
        
        let title = "", sub = "";
        if(isAlchemy || isNew || refundAmt !== undefined) {
            if(isAlchemy) { title = "煉金成功"; sub = isNew ? "🎉 成功解鎖！" : `🌟 升級為 ${stars} 星！`; }
            else {
                if(isNew) { title = "發現新卡牌"; if(typeof confetti !== 'undefined') confetti({particleCount: 50, spread: 60}); }
                else if(refundAmt === 0) { title = "卡片升星"; sub = `🌟 吸收碎片，升級為 ${stars} 星！`; }
                else { title = "卡片分解"; sub = `♻️ 轉換為 ${refundAmt} 🪙 退還。`; color = "var(--apple-gray)"; }
            }
        } else { title = "元素卡片"; }

        let html = `<div style="font-weight:bold; color:${color}; margin-bottom:5px;">[${rarity}]</div><h2 class="ios-title" style="margin-top:0;">${title}</h2><p class="ios-desc">${sub}</p>`;
        let cardDiv = document.createElement('div'); cardDiv.className = `reveal-card show ${rarity.toLowerCase()}`; if(stars>=3) cardDiv.className += ' max-star';
        cardDiv.innerHTML = UI.createCardNode(card, stars, true, null).innerHTML;
        
        let wrapper = document.createElement('div'); wrapper.innerHTML = html; wrapper.appendChild(cardDiv);
        wrapper.innerHTML += `<button class="ios-btn primary-btn mt-3" onclick="Game.shareCard()">📤 炫耀收藏</button><button class="ios-btn cancel-btn mt-2" onclick="UI.toggleModal('gachaModal', false); UI.filterGallery('all');">關閉</button>`;
        document.getElementById('gachaContent').innerHTML = ''; document.getElementById('gachaContent').appendChild(wrapper); UI.toggleModal('gachaModal', true);
    },
    showTenDraw(results, totalRefund) {
        let html = `<h2 class="ios-title">十連抽結果</h2>`;
        if(totalRefund > 0) html += `<p class="ios-desc" style="color:var(--apple-orange); font-weight:bold;">♻️ 分解退款：共 ${totalRefund} 🪙</p>`;
        html += `<div class="gallery-grid" style="grid-template-columns: repeat(5, 1fr); max-height:none; padding:0;" id="tenGrid"></div>`;
        html += `<button class="ios-btn primary-btn mt-3" onclick="UI.toggleModal('gachaModal', false); UI.filterGallery('all');">確認收穫</button>`;
        
        document.getElementById('gachaContent').innerHTML = html; UI.toggleModal('gachaModal', true);
        const grid = document.getElementById('tenGrid'); let hasSSR = false;
        results.forEach((res, i) => {
            if(res.c.targetRarity === 'SSR') hasSSR = true;
            let item = UI.createCardNode(res.c, res.stars, true, null); item.className += ` ${res.c.targetRarity.toLowerCase()}`; if(res.stars>=3) item.className += ' max-star';
            item.style.opacity = '0'; item.style.transform = 'translateY(20px)'; item.style.transition = '0.4s';
            let badge = `<div style="position:absolute; top:5px; right:5px; padding:2px 5px; border-radius:5px; font-size:10px; font-weight:bold; color:white; z-index:10; background:${res.isNew?'var(--apple-purple)':(res.ref>0?'var(--apple-gray)':'var(--rare)')};">${res.isNew?'NEW!':(res.ref>0?'+'+res.ref+'🪙':'⭐UP')}</div>`;
            item.innerHTML += badge; grid.appendChild(item);
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateY(0)'; AudioEngine.play('click'); }, i * 150);
        });
        if(hasSSR) setTimeout(() => { AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti({particleCount: 200, spread: 100, origin: {y: 0.5}}); }, 1500);
    },
    shareCard() {
        if (!State.game.currentDrawnCard) return; AudioEngine.play('click');
        const s = State.game.currentDrawnCard; const starStr = "⭐".repeat(s.currentStars || 1); const title = State.getLevel().title;
        // 👇 這裡已經為您換上最新的 Cloudflare 網址
        const text = `🧪「${title}」收集到了 [${s.currentRarity}] 級別的 ${starStr}「${s.name}」！\n你能超越我嗎？來 3lite Education 挑戰：\nhttps://ionmaster.threeliteeducation.workers.dev/`;
        if (navigator.share) navigator.share({ title: 'Ion Master', text: text, url: 'https://ionmaster.threeliteeducation.workers.dev/' }).catch(e=>{}); 
        else navigator.clipboard.writeText(text).then(() => alert('📝 已複製到剪貼簿！'));
    },
    sharePvP(time) {
        AudioEngine.play('click');
        let encoded = btoa(JSON.stringify({ t: parseFloat(time), d: State.pvp.myRecord }));
        let url = window.location.origin + window.location.pathname + "?pvp=" + encoded;
        const text = `⚔️「${State.getLevel().title}」向你發起合成決鬥！\n🎯 目標時間：${time} 秒\n點擊接受挑戰：\n${url}`;
        if (navigator.share) navigator.share({ title: 'PvP 挑戰', text: text, url: url }).catch(e=>{}); 
        else navigator.clipboard.writeText(text).then(() => alert('📝 挑戰連結已複製！'));
    }
};

// ==========================================
// Module 5: 數據存檔模組
// ==========================================
const StorageManager = {
    export() {
        AudioEngine.play('click');
        try {
            const data = { 
                aaCoins: localStorage.getItem('aaCoins'), 
                aaExp: localStorage.getItem('aaExp'), 
                aaInventorySep: localStorage.getItem('aaInventorySep'), 
                myIonHistory: localStorage.getItem('myIonHistory'), 
                aaQuests: localStorage.getItem('aaQuests'), 
                aaErrorLog: localStorage.getItem('aaErrorLog'),
                aaRedeemedCodes: localStorage.getItem('aaRedeemedCodes') // 👈 確保匯出時包含兌換紀錄
            };
            document.getElementById('saveCodeInput').value = btoa(encodeURIComponent(JSON.stringify(data)));
            document.getElementById('saveCodeInput').select(); document.execCommand('copy'); alert('✅ 存檔碼已複製！');
        } catch(e) { alert('❌ 匯出失敗。'); }
    },
    import() {
        AudioEngine.play('click'); const input = document.getElementById('saveCodeInput').value.trim();
        if(!input) return alert('❌ 請貼上存檔碼！'); if(!confirm('⚠️ 警告：這將覆蓋現有進度！')) return;
        try {
            const data = JSON.parse(decodeURIComponent(atob(input)));
            for(let key in data) { if(data[key] !== undefined) localStorage.setItem(key, data[key]); }
            State.init(); UI.toggleModal('saveModal', false); alert('✅ 讀取成功！');
        } catch(e) { alert('❌ 讀取失敗！存檔碼損毀。'); }
    }
};

// ==========================================
// Module 6: 最高級前端防護盾 (Security & Anti-Cheat)
// ==========================================
const Security = {
    init() {
        // 1. 禁用右鍵選單 (防止另存圖片 / 檢查元素)
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // 2. 禁用文字與元素選取 (防止反白複製)
        document.addEventListener('selectstart', e => e.preventDefault());
        
        // 3. 禁用圖片與元素拖曳 (防止學生把圖片直接拖拉到桌面)
        document.addEventListener('dragstart', e => e.preventDefault());
        
        // 4. 嚴格攔截開發者工具快捷鍵 (覆蓋 Windows 與 Mac)
        document.addEventListener('keydown', e => {
            if (
                e.key === 'F12' || // 攔截 F12
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) || // Win: Ctrl+Shift+I/J/C
                (e.ctrlKey && (e.key === 'U' || e.key === 'u')) || // Win: Ctrl+U (檢視原始碼)
                (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'U' || e.key === 'u')) // Mac: Cmd+Option+I/J/U
            ) {
                e.preventDefault();
                return false;
            }
        });
    }
};

// ==========================================
// 初始化啟動 (加入防護盾)
// ==========================================
window.onload = () => {
    Security.init(); // 啟動最高防護
    State.init(); 
    UI.renderQuests();
    
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
