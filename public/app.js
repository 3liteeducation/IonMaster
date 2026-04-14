const State = {
    username: "", 
    passcode: "", 
    data: {
        coins: 0, exp: 0, inventory: {}, quests: { date: "", list: [] }, 
        myHistory: [], errorLog: {}, redeemedCodes: [], pityCount: 50
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
            fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: this.username, 
                    passcode: this.passcode, 
                    data: this.data,
                    lvl: this.getLevel().lvl 
                })
            }).catch(e => console.log('雲端同步失敗', e));
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

const AudioEngine = {
    ctx: null,
    init() { try { if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if(this.ctx.state === 'suspended') this.ctx.resume(); } catch(e){} },
    tone(freq, type, dur, vol=0.1) {
        this.init(); if(!this.ctx) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + dur);
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
        titleEl.style.color = info.lvl >= 50 ? 'var(--rare)' : 'var(--apple-blue)';
        
        document.getElementById('expBar').style.width = info.progress + '%';
        document.getElementById('expText').innerText = `${info.currExp} / ${info.reqExp} EXP`;
    },
    renderQuests() {
        const list = document.getElementById('questList'); list.innerHTML = '';
        if(State.data.quests.list.length === 0) { list.innerHTML = "<p class='ios-desc'>載入中...</p>"; return; }
        
        State.data.quests.list.forEach((q, i) => {
            let btn = q.isClaimed ? `✔️` : (q.progress >= q.target ? `<button class="ios-btn primary-btn" onclick="Game.claimQuest(${i})">領取 ${q.reward}🪙</button>` : `${q.progress}/${q.target}`);
            list.innerHTML += `<div class="quest-item"><div class="quest-info"><div class="ios-subtitle">${q.title}</div><div class="ios-desc">${q.desc}</div></div>${btn}</div>`;
        });
    },
    async showLeaderboard() {
        AudioEngine.play('click');
        UI.toggleModal('leaderboardModal', true);
        const lbContent = document.getElementById('leaderboardContent');
        lbContent.innerHTML = "載入中...";
        try {
            const res = await fetch('/api/leaderboard');
            const result = await res.json();
            if(result.success && result.leaderboard.length > 0) {
                lbContent.innerHTML = "";
                result.leaderboard.forEach((player, i) => {
                    let rankDisplay = (i===0) ? '🥇' : (i===1) ? '🥈' : (i===2) ? '🥉' : `${i+1}`;
                    let cls = (i<3) ? `top-${i+1}` : '';
                    lbContent.innerHTML += `<div class="lb-row ${cls}"><div class="lb-rank">${rankDisplay}</div><div class="lb-name">${player.username}</div><div class="lb-lvl">Lv.${player.lvl}</div></div>`;
                });
            } else {
                lbContent.innerHTML = "<p class='ios-desc' style='text-align:center;'>目前尚無排名數據</p>";
            }
        } catch(e) {
            lbContent.innerHTML = "<p class='ios-desc' style='text-align:center;'>網路異常，無法讀取排行榜</p>";
        }
    },
    createCardNode(card, stars, isOwned, onClick) {
        const item = document.createElement('div');
        item.className = `card-item ${isOwned ? 'owned ' + card.targetRarity.toLowerCase() : 'locked'} ${stars >= 3 ? 'max-star' : ''}`;
        let imgPath = `images/${card.fileKey}_${card.targetRarity.toLowerCase()}.png`;
        if (isOwned) {
            item.innerHTML = `<img src="${imgPath}" loading="lazy" class="full-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="fallback-content" style="display:none;"><div style="font-size:24px;">${card.html}</div><div style="font-size:12px; margin-top:3px; color:var(--apple-gray);">${card.targetRarity}</div></div><div class="stars-overlay">⭐`.repeat(stars) + `</div>`;
            item.onclick = onClick; 
        } else {
            item.innerHTML = `<img src="${imgPath}" loading="lazy" class="full-card-img locked-blur" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="fallback-content" style="display:none; background:#eee;"><div style="font-size:18px; color:#7f8c8d;">${card.html}</div><div style="font-size:10px; margin-top:3px;">${card.targetRarity}</div></div><div class="locked-overlay">🔒</div>`;
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
                    AudioEngine.play('click'); 
                    let cost = Database.config.alchemyCosts[card.targetRarity];
                    let targets = { 'N': 3, 'R': 5, 'SR': 7, 'SSR': 10 };
                    let target = targets[card.targetRarity];
                    
                    if (State.data.coins < cost) { alert(`🪙 餘額不足！需要 ${cost} 枚代幣。`); return; }
                    if (confirm(`確定消耗 ${cost} 🪙 來 ${(stars > 0)?"升星":"解鎖"}「${card.targetRarity}級 ${card.name}」？\n⚠️ 警告：這是一場高壓反應！需連對 ${target} 題，且每題限時 5 秒！`)) {
                        State.data.coins -= cost; 
                        State.save(); 
                        State.game.targetCard = card; 
                        State.game.alchemyTarget = target;
                        Game.start('alchemy');
                    }
                };
            }
            fragment.appendChild(item);
        });
        grid.appendChild(fragment);
    }
};

const Game = {
    claimQuest(idx) {
        let q = State.data.quests.list[idx];
        if(q.progress >= q.target && !q.isClaimed) { AudioEngine.play('ssr'); q.isClaimed = true; State.data.coins += q.reward; State.save(); UI.renderQuests(); if(typeof confetti !== 'undefined') confetti({particleCount: 50, spread: 60, origin: {y: 0.8}});}
    },
    async redeemCode() {
        AudioEngine.play('click');
        const input = document.getElementById('redeemInput');
        const code = input.value.trim().toUpperCase();
        if (!code) { alert('❌ 請輸入禮物碼！'); return; }

        if (State.data.redeemedCodes.includes(code)) {
            alert('⚠️ 這個禮物碼您已經兌換過囉！');
            return;
        }

        try {
            const response = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code }) 
            });
            const result = await response.json();

            if (!result.success) { AudioEngine.play('wrong'); alert(`❌ ${result.message}`); return; }

            const reward = result.reward;
            State.data.coins += reward;
            State.data.redeemedCodes.push(code); 
            State.save();
            
            input.value = ''; 
            UI.toggleModal('redeemModal', false);
            AudioEngine.play('ssr');
            if(typeof confetti !== 'undefined') confetti({particleCount: 200, spread: 100, origin: {y: 0.3}});
            alert(`🎉 兌換成功！獲得 ${reward} 🪙 AA 代幣！`);

        } catch (error) { alert('❌ 無法連線到伺服器。'); }
    },
    start(mode) {
        AudioEngine.play('click'); 
        State.game.mode = mode; State.game.score = 0; State.game.timerInterval = null; State.pvp.myRecord = [];
        State.game.combo = 0; State.game.battery = 0; State.game.feverCount = 0;

        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.getElementById('view-play').classList.add('active'); document.getElementById('activeGameArea').style.display = 'block'; document.querySelector('.game-modes').style.display = 'none';
        document.body.className = (mode === 'alchemy') ? 'bg-alchemy' : (mode === 'speed' || mode === 'pvp' ? 'bg-speed' : 'bg-main');
        document.getElementById('batteryLevel').style.background = "var(--apple-green)"; 
        
        let pTxt = document.getElementById('progressText'); let tDisp = document.getElementById('timerDisplay');
        if (mode === 'speed' || mode === 'pvp') {
            pTxt.innerText = "進度: 0/10"; pTxt.style.color = "var(--secondary)"; tDisp.style.display = 'block';
            State.game.startTime = Date.now(); State.game.timerInterval = setInterval(() => { tDisp.innerText = ((Date.now() - State.game.startTime) / 1000).toFixed(1) + "s"; }, 100);
        } else if (mode === 'practice' || mode === 'color') {
            pTxt.innerText = "答對: 0 (連擊: 0)"; 
            pTxt.style.color = mode === 'color' ? "var(--apple-purple)" : "var(--secondary)"; 
            tDisp.style.display = 'none';
        } else if (mode === 'alchemy') {
            pTxt.innerText = `煉金: 0/${State.game.alchemyTarget}`; 
            pTxt.style.color = "var(--rare)"; 
            tDisp.style.display = 'block'; 
            tDisp.style.color = "var(--apple-red)";
        }
        document.getElementById('batteryLevel').style.width = '0%'; this.nextQuestion();
    },
    quit() {
        AudioEngine.play('click'); clearInterval(State.game.timerInterval); document.body.className = 'bg-main'; document.body.classList.remove('screen-shake');
        document.getElementById('activeGameArea').style.display = 'none'; document.querySelector('.game-modes').style.display = 'block';
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
        if(State.pvp.active) { window.history.pushState({}, '', window.location.pathname); State.pvp.active = false; document.getElementById('pvpBanner').style.display = 'none'; }
        UI.switchView('home');
    },
    nextQuestion() {
        let m = State.game.mode; 
        if ((m === 'speed' || m === 'pvp') && State.game.score >= 10) { this.finishSpeed(); return; } 
        if (m === 'alchemy' && State.game.score >= State.game.alchemyTarget) { this.finishAlchemy(true); return; }
        State.game.isAnswered = false; let curC, curA, scenario, colorIdx;

        if (m === 'pvp') {
            let qD = State.pvp.deck[State.game.score]; scenario = qD.s;
            if (scenario === 3) { colorIdx = qD.c; } 
            else { curC = Database.playableCations.find(c => c.id === qD.c); curA = Database.playableAnions.find(a => a.id === qD.a); }
        } else if (m === 'color') {
            scenario = 3; colorIdx = Math.floor(Math.random() * Database.colorQuestions.length);
        } else {
            const isValid = (c, a) => { const bl = ['NH4_OH','H_NO3','H_NO2','H_Cl','H_Br','H_I','H_SO4','H_SO3','H_OH','H_O','H_CO3','H_PO4','H_CN','H_MnO4','H_ClO3','H_ClO','H_CrO4','H_Cr2O7','H_H','H_HSO4','H_HCO3']; return !bl.includes(c.formula + '_' + a.formula); };
            scenario = Math.floor(Math.random() * 3); 
            if (m === 'alchemy') {
                let tc = State.game.targetCard; let isC = Database.playableCations.some(c => c.id === tc.id);
                let pool = (isC ? Database.playableAnions : Database.playableCations).filter(p => isC ? isValid(tc, p) : isValid(p, tc));
                if(isC) { curC = tc; curA = pool[Math.floor(Math.random() * pool.length)]; } else { curA = tc; curC = pool[Math.floor(Math.random() * pool.length)]; }
            } else {
                do { curC = Database.playableCations[Math.floor(Math.random() * Database.playableCations.length)]; curA = Database.playableAnions[Math.floor(Math.random() * Database.playableAnions.length)]; } while (!isValid(curC, curA));
            }
        }
        
        if (m === 'speed') State.pvp.myRecord.push({ c: (scenario === 3 ? colorIdx : curC.id), a: (curA ? curA.id : 0), s: scenario });
        
        if (m === 'alchemy') {
            clearInterval(State.game.timerInterval);
            State.game.alchemyTimeLeft = 50; 
            document.getElementById('timerDisplay').innerText = "05.0s";
            State.game.timerInterval = setInterval(() => {
                if (State.game.isAnswered) return;
                State.game.alchemyTimeLeft--;
                document.getElementById('timerDisplay').innerText = "0" + (State.game.alchemyTimeLeft / 10).toFixed(1) + "s";
                if (State.game.alchemyTimeLeft <= 0) { clearInterval(State.game.timerInterval); this.handleAns(null, false, curC, curA, true); }
            }, 100);
        }

        let opts = [], oSet = new Set(), qEl = document.getElementById('question');

        if (scenario === 3) {
            let cq = Database.colorQuestions[colorIdx];
            qEl.innerHTML = `<span style="font-size:18px; color:var(--apple-gray);">化學色彩學</span><br><span style="font-size:32px;">${cq.q}</span>`;
            opts.push({h: cq.a, c: true}); oSet.add(cq.a);
            while (opts.length < 4) { 
                let fake = Database.allColors[Math.floor(Math.random() * Database.allColors.length)]; 
                if (!oSet.has(fake)) { oSet.add(fake); opts.push({h: fake, c: false}); } 
            }
        } else {
            const getGCD = (a, b) => b ? getGCD(b, a % b) : a; const fSub = t => t.replace(/([0-9]+)/g, '<sub>$1</sub>');
            const bForm = (c, a, sc, sa) => { let cp = fSub(c.formula); if(sc>1) cp = c.poly?`(${cp})<sub>${sc}</sub>`:`${cp}<sub>${sc}</sub>`; let ap = fSub(a.formula); if(sa>1) ap = a.poly?`(${ap})<sub>${sa}</sub>`:`${ap}<sub>${sa}</sub>`; return cp+ap; };
            const bName = (c, a) => `<span style="font-size:22px;">${c.name.replace(/ion/i,'').trim()} ${a.name.replace(/ion/i,'').trim().toLowerCase()}</span>`;
            let cSub = curA.charge, aSub = curC.charge; let com = getGCD(cSub, aSub); cSub /= com; aSub /= com;
            
            qEl.innerHTML = (scenario <= 1) ? `<span>${curC.html} &nbsp;+&nbsp; ${curA.html}</span>` : `<span style="font-size:26px;">${curC.name.replace(/ion/i,'').trim()} ion<br>+<br>${curA.name.replace(/ion/i,'').trim()} ion</span>`;
            if (scenario === 0 || scenario === 2) {
                let correct = bForm(curC, curA, cSub, aSub); opts.push({h: correct, c: true}); oSet.add(correct);
                while(opts.length < 4) { let fake = bForm(curC, curA, Math.floor(Math.random()*3)+1, Math.floor(Math.random()*3)+1); if(!oSet.has(fake)) { oSet.add(fake); opts.push({h: fake, c: false}); } }
            } else {
                let correct = bName(curC, curA); opts.push({h: correct, c: true}); oSet.add(correct);
                while(opts.length < 4) { let fake = bName(curC, Database.playableAnions[Math.floor(Math.random() * Database.playableAnions.length)]); if(!oSet.has(fake)) { oSet.add(fake); opts.push({h: fake, c: false}); } }
            }
        }

        opts.sort(() => 0.5 - Math.random()); let oArea = document.getElementById('optionsArea'); oArea.innerHTML = '';
        opts.forEach(opt => { let b = document.createElement('button'); b.className = 'option-btn'; b.innerHTML = opt.h; b.onclick = () => this.handleAns(b, opt.c, curC, curA); oArea.appendChild(b); });
    },
    handleAns(btn, isCorrect, c, a, isTimeout = false) {
        if(State.game.isAnswered) return; State.game.isAnswered = true; let m = State.game.mode;
        if (m === 'alchemy') clearInterval(State.game.timerInterval);
        
        if(isCorrect) {
            AudioEngine.play('correct'); if(btn) btn.classList.add('correct'); 
            State.game.score++; State.game.combo++; 
            
            if (m === 'speed' || m === 'pvp') { 
                document.getElementById('progressText').innerText = `進度: ${State.game.score}/10`; document.getElementById('batteryLevel').style.width = (State.game.score * 10) + "%"; 
            } 
            else if (m === 'alchemy') { 
                document.getElementById('progressText').innerText = `煉金: ${State.game.score}/${State.game.alchemyTarget}`; 
                document.getElementById('batteryLevel').style.width = ((State.game.score / State.game.alchemyTarget) * 100) + "%"; 
            } 
            else if (m === 'practice' || m === 'color') { 
                State.updateQuest('q_practice', 1);
                
                if (State.game.feverCount > 0) {
                    State.addExp(m === 'color' ? 20 : 10); 
                    State.data.coins += (m === 'color' ? 3 : 1); 
                    State.game.feverCount--;
                    
                    document.getElementById('progressText').innerText = `🔥 狂熱剩餘: ${State.game.feverCount} 題`;
                    document.getElementById('batteryLevel').style.width = (State.game.feverCount * 20) + "%"; 
                    
                    if (State.game.feverCount === 0) {
                        State.game.battery = 0; document.body.classList.remove('bg-fever');
                        document.getElementById('progressText').innerText = `答對: ${State.game.score} (連擊: ${State.game.combo})`;
                        document.getElementById('progressText').style.color = m === 'color' ? "var(--apple-purple)" : "var(--secondary)";
                        document.getElementById('batteryLevel').style.background = "var(--apple-green)";
                    }
                } else {
                    State.addExp(m === 'color' ? 10 : 5); 
                    if (m === 'color') State.data.coins += 1; 
                    State.game.battery++; 
                    
                    document.getElementById('progressText').innerText = `答對: ${State.game.score} (連擊: ${State.game.combo})`;
                    document.getElementById('batteryLevel').style.width = (State.game.battery * 10) + "%";
                    
                    if (State.game.battery >= 10) { 
                        State.game.feverCount = 5; document.body.classList.add('bg-fever'); AudioEngine.play('ssr'); 
                        let pTxt = document.getElementById('progressText'); pTxt.innerText = `🔥 狂熱啟動: 代幣暴增！`; pTxt.style.color = "var(--apple-orange)";
                        let bLvl = document.getElementById('batteryLevel'); bLvl.style.background = "var(--apple-orange)"; bLvl.style.width = "100%";
                        if(typeof confetti !== 'undefined') confetti({particleCount: 150, spread: 80, origin: {y: 0.6}});
                    }
                }
                State.save();
            }
            setTimeout(()=>this.nextQuestion(), 400); 
        } else {
            AudioEngine.play('wrong'); if(btn) btn.classList.add('wrong'); 
            State.game.combo = 0; 
            if (!isTimeout && c && a && m !== 'color') State.logError(c, a); 
            
            if (m === 'alchemy') { 
                if (isTimeout) document.getElementById('timerDisplay').innerText = "BOOM!";
                setTimeout(()=>this.finishAlchemy(false), 500); 
            } else { 
                if (m === 'practice' || m === 'color') {
                    State.game.battery = 0;
                    if (State.game.feverCount > 0) {
                        State.game.feverCount = 0; document.body.classList.remove('bg-fever');
                        document.getElementById('progressText').style.color = m === 'color' ? "var(--apple-purple)" : "var(--secondary)";
                        document.getElementById('batteryLevel').style.background = "var(--apple-green)";
                    }
                    document.getElementById('batteryLevel').style.width = "0%";
                    document.getElementById('progressText').innerText = `答對: ${State.game.score} 💀 (連擊中斷)`;
                }
                setTimeout(() => { if(btn) btn.classList.remove('wrong'); State.game.isAnswered = false; }, 1000); 
            }
        }
    },
    finishSpeed() {
        clearInterval(State.game.timerInterval); let fTime = (Date.now() - State.game.startTime) / 1000; State.updateQuest('q_speed', 1);
        let content = document.getElementById('resultContent'); let best = State.data.myHistory.length > 0 ? Math.min(...State.data.myHistory.map(x => x.time)) : Infinity; State.addExp(50);
        
        let html = `<h2 class="ios-title">${State.pvp.active ? "⚔️ 決鬥結束" : "🎯 挑戰完成"}</h2><p class="ios-desc">${State.pvp.active ? `目標時間：${State.pvp.targetTime}s<br>你的時間：` : "本次時間："}</p><div style="font-size:36px; color:var(--legend); font-weight:bold; margin-bottom: 10px;">${fTime.toFixed(2)}s</div>`;
        
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
        if(State.game.isAnimating) return; AudioEngine.play('click'); 
        let cost = (times === 10) ? 45 : times * 5; 
        if (State.data.coins < cost) { alert(`🪙 代幣不足！需要 ${cost} 枚。`); return; }
        
        State.data.coins -= cost; State.updateQuest('q_gacha', times); UI.setLock(true);
        let res = []; let refund = 0; let hasGoldOrPurple = false; 

        for(let i = 0; i < times; i++) {
            let r = 'N'; let rand = Math.random() * 100; 
            State.data.pityCount--;
            if (State.data.pityCount <= 0) { r = 'SSR'; } 
            else { if(rand < 1.5) r = 'SSR'; else if(rand < 10) r = 'SR'; else if(rand < 30) r = 'R'; }
            if (times === 10 && i === 9 && !hasGoldOrPurple && r !== 'SSR') { r = 'SR'; }
            if (r === 'SSR' || r === 'SR') hasGoldOrPurple = true;
            if (r === 'SSR') { State.data.pityCount = 50; }

            let pool = Database.expandedPool.filter(x => x.targetRarity === r); 
            if(r === 'SSR') pool = pool.filter(x => (Math.random() < 0.1) ? x.isSpecial : !x.isSpecial); else pool = pool.filter(x => !x.isSpecial);
            let c = pool[Math.floor(Math.random() * pool.length)]; let stars = State.data.inventory[c.uniqueId] || 0; let isNew = stars === 0; let ref = 0;
            
            if(isNew) { State.data.inventory[c.uniqueId] = 1; State.addExp(10); } 
            else if(stars < 3) { State.data.inventory[c.uniqueId]++; State.addExp(5); } 
            else { ref = Database.config.refunds[r]; refund += ref; }
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
        wrapper.innerHTML += `<div style="display: flex; gap: 10px; margin-top: 15px;"><button class="ios-btn primary-btn" onclick="Game.shareCard()">📤 分享</button><button class="ios-btn info-btn" onclick="Game.copyShareText()">📋 複製文字</button></div><button class="ios-btn cancel-btn mt-2" onclick="UI.toggleModal('gachaModal', false); UI.filterGallery('all');">關閉</button>`;
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
        const text = `🧪「${title}」在 Ion Master 收集到了 [${s.currentRarity}] 級別的 ${starStr}「${s.name}」！\n來 3lite Education 挑戰：\nhttps://ionmaster.threeliteeducation.workers.dev/`;
        if (navigator.share) { navigator.share({ title: 'Ion Master', text: text, url: 'https://ionmaster.threeliteeducation.workers.dev/' }).catch(e=>{}); } 
        else { this.copyShareText(); }
    },
    copyShareText() {
        if (!State.game.currentDrawnCard) return; AudioEngine.play('click');
        const s = State.game.currentDrawnCard; const starStr = "⭐".repeat(s.currentStars || 1); const title = State.getLevel().title;
        const text = `🧪「${title}」在 Ion Master 收集到了 [${s.currentRarity}] 級別的 ${starStr}「${s.name}」！\nhttps://ionmaster.threeliteeducation.workers.dev/`;
        navigator.clipboard.writeText(text).then(() => { alert('📋 已成功複製到剪貼簿！快去貼給同學吧！'); }).catch(err => { alert('❌ 複製失敗，請手動框選文字複製。'); });
    },
    sharePvP(time) {
        AudioEngine.play('click');
        let encoded = btoa(JSON.stringify({ t: parseFloat(time), d: State.pvp.myRecord }));
        let url = window.location.origin + window.location.pathname + "?pvp=" + encoded;
        const text = `⚔️「${State.getLevel().title}」在 Ion Master 向你發起挑戰！\n🎯 目標時間：${time} 秒\n點擊接受挑戰：\n${url}`;
        navigator.clipboard.writeText(text).then(() => { alert('📋 挑戰連結已成功複製到剪貼簿！快去貼給同學吧！'); }).catch(err => { alert('❌ 複製失敗，請手動框選文字複製。'); });
    }
};

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

window.onload = () => {
    Security.init(); 
    State.init(); 
    
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
