// ui.js - 專門處理畫面渲染、彈出視窗與介面切換
import { Database } from './data.js';
import { AudioEngine } from './audio.js';
import { State } from './state.js';
import { Game } from './game.js';

export const UI = {
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
