// game.js - 專門處理遊戲模式、計分、抽卡與判定邏輯
import { Database } from './data.js';
import { AudioEngine } from './audio.js';
import { State } from './state.js';
import { UI } from './ui.js';

export const Game = {
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
                // 🚀 弱點突破機制：如果是在練習或速度模式，有 30% 機率考以前錯過的題目
                const errorKeys = Object.keys(State.data.errorLog);
                let useErrorLog = (Math.random() < 0.3 && errorKeys.length > 0);
                
                if (useErrorLog) {
                    const randomError = errorKeys[Math.floor(Math.random() * errorKeys.length)];
                    const [cForm, aForm] = randomError.split('_');
                    curC = Database.playableCations.find(c => c.formula === cForm);
                    curA = Database.playableAnions.find(a => a.formula === aForm);
                    
                    // 確保讀出來的資料是有效的
                    if (!curC || !curA || !isValid(curC, curA)) {
                        useErrorLog = false; 
                    } else {
                        console.log(`🧠 觸發弱點突破：再次挑戰易錯題 ${cForm} + ${aForm}`);
                    }
                }

                // 如果沒觸發弱點突破，就走原本的完全隨機邏輯
                if (!useErrorLog) {
                    do { curC = Database.playableCations[Math.floor(Math.random() * Database.playableCations.length)]; curA = Database.playableAnions[Math.floor(Math.random() * Database.playableAnions.length)]; } while (!isValid(curC, curA));
                }
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
            
            // 🚀 如果答對了，檢查是不是把以前的錯題答對了，如果是，可以把它從弱點清單中稍微扣除次數（減輕弱點）
            if (c && a) {
                let key = c.formula + "_" + a.formula;
                if (State.data.errorLog[key]) {
                    State.data.errorLog[key]--;
                    if (State.data.errorLog[key] <= 0) delete State.data.errorLog[key];
                }
            }

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
        // 🚀 更新這裡的網址
        const text = `🧪「${title}」在 Ion Master 收集到了 [${s.currentRarity}] 級別的 ${starStr}「${s.name}」！\n來 3lite Education 挑戰：\nhttps://ionmaster.3lite.io/`;
        if (navigator.share) { 
            // 🚀 更新這裡的 url
            navigator.share({ title: 'Ion Master', text: text, url: 'https://ionmaster.3lite.io/' }).catch(e=>{}); 
        } 
        else { this.copyShareText(); }
    },
    copyShareText() {
        if (!State.game.currentDrawnCard) return; AudioEngine.play('click');
        const s = State.game.currentDrawnCard; const starStr = "⭐".repeat(s.currentStars || 1); const title = State.getLevel().title;
        // 🚀 更新這裡的網址
        const text = `🧪「${title}」在 Ion Master 收集到了 [${s.currentRarity}] 級別的 ${starStr}「${s.name}」！\nhttps://ionmaster.3lite.io/`;
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
