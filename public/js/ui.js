// public/js/ui.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure DOM manipulation — no fetch(), no game logic.
// ─────────────────────────────────────────────────────────────────────────────

import { Database }    from './data.js';
import { AudioEngine } from './audio.js';
import { State }       from './state.js';
import { API }         from './api.js';

export const UI = {

    // ── Navigation ────────────────────────────────────────────────────────────
    switchView(viewId, btnElem) {
        AudioEngine.play('click');
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');
        if (btnElem) btnElem.classList.add('active');
        if (viewId === 'gallery') this.filterGallery('all');
        if (viewId === 'lab')     this.filterLab('all');
    },

    toggleModal(id, show) {
        if (show) AudioEngine.play('click');
        document.getElementById(id).style.display = show ? 'flex' : 'none';
    },

    setLock(locked) {
        State.game.isAnimating = locked;
        document.getElementById('animLock').style.display = locked ? 'block' : 'none';
    },

    // ── Profile / HUD ─────────────────────────────────────────────────────────
    updateProfile() {
        const info    = State.getLevel();
        const titleEl = document.getElementById('playerTitle');

        document.getElementById('mainCoinCount').innerText = State.data.coins;
        document.getElementById('playerLevel').innerText   = info.lvl;
        titleEl.innerText    = info.title;
        titleEl.style.color  = info.lvl >= 50 ? 'var(--rare)' : 'var(--apple-blue)';
        document.getElementById('expBar').style.width  = `${info.progress}%`;
        document.getElementById('expText').innerText   = `${info.currExp} / ${info.reqExp} EXP`;

        const pityEl = document.getElementById('pityDisplay');
        if (pityEl) pityEl.innerText = `距離必中 SSR 還有 ${State.data.pityCount} 抽`;
    },

    // ── Quests ────────────────────────────────────────────────────────────────
    renderQuests() {
        const list = document.getElementById('questList');
        list.innerHTML = '';

        if (!State.data.quests.list.length) {
            list.innerHTML = "<p class='ios-desc'>載入中...</p>";
            return;
        }

        // Lazy-import Game to avoid circular deps
        const frag = document.createDocumentFragment();
        State.data.quests.list.forEach((q, i) => {
            const div  = document.createElement('div');
            div.className = 'quest-item';

            let btn;
            if (q.isClaimed) {
                btn = '✔️';
            } else if (q.progress >= q.target) {
                btn = `<button class="ios-btn primary-btn" data-quest-idx="${i}">領取 ${q.reward}🪙</button>`;
            } else {
                btn = `${q.progress}/${q.target}`;
            }

            div.innerHTML = `
                <div class="quest-info">
                    <div class="ios-subtitle">${q.title}</div>
                    <div class="ios-desc">${q.desc}</div>
                </div>
                ${btn}`;
            frag.appendChild(div);
        });

        list.appendChild(frag);

        // Delegate click events — avoids inline onclick with Game reference
        list.querySelectorAll('[data-quest-idx]').forEach(btn => {
            btn.addEventListener('click', () => {
                import('./game.js').then(({ Game }) => Game.claimQuest(Number(btn.dataset.questIdx)));
            });
        });
    },

    // ── Leaderboard ───────────────────────────────────────────────────────────
    async showLeaderboard() {
        AudioEngine.play('click');
        this.toggleModal('leaderboardModal', true);
        const lbContent = document.getElementById('leaderboardContent');
        lbContent.innerHTML = '載入中...';

        try {
            const result = await API.leaderboard();
            if (result.leaderboard?.length) {
                lbContent.innerHTML = result.leaderboard.map((player, i) => {
                    const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                    const cls  = i < 3 ? `top-${i + 1}` : '';
                    return `<div class="lb-row ${cls}">
                        <div class="lb-rank">${rank}</div>
                        <div class="lb-name">${player.username}</div>
                        <div class="lb-lvl">Lv.${player.lvl}</div>
                    </div>`;
                }).join('');
            } else {
                lbContent.innerHTML = "<p class='ios-desc' style='text-align:center;'>目前尚無排名數據</p>";
            }
        } catch {
            lbContent.innerHTML = "<p class='ios-desc' style='text-align:center;'>網路異常，無法讀取排行榜</p>";
        }
    },

    // ── Card node factory ─────────────────────────────────────────────────────
    createCardNode(card, stars, isOwned, onClick) {
        const item    = document.createElement('div');
        const rarity  = card.targetRarity.toLowerCase();
        const maxStar = stars >= 3 ? ' max-star' : '';
        const imgPath = `images/${card.fileKey}_${rarity}.png`;

        if (isOwned) {
            item.className = `card-item owned ${rarity}${maxStar}`;
            item.innerHTML = `
                <img src="${imgPath}" loading="lazy" class="full-card-img"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="fallback-content" style="display:none;">
                    <div style="font-size:24px;">${card.html}</div>
                    <div style="font-size:12px; margin-top:3px; color:var(--apple-gray);">${card.targetRarity}</div>
                </div>
                <div class="stars-overlay">${'⭐'.repeat(stars)}</div>`;
            if (onClick) item.onclick = onClick;
        } else {
            item.className = `card-item locked`;
            item.innerHTML = `
                <img src="${imgPath}" loading="lazy" class="full-card-img locked-blur"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="fallback-content" style="display:none; background:#eee;">
                    <div style="font-size:18px; color:#7f8c8d;">${card.html}</div>
                    <div style="font-size:10px; margin-top:3px;">${card.targetRarity}</div>
                </div>
                <div class="locked-overlay">🔒</div>`;
            if (onClick) item.onclick = onClick;
        }

        return item;
    },

    // ── Gallery ───────────────────────────────────────────────────────────────
    filterGallery(type) {
        AudioEngine.play('click');
        _activateChip('#view-gallery', event?.target);

        const grid   = document.getElementById('galleryGrid');
        const frag   = document.createDocumentFragment();
        let unlocked = 0;

        Database.expandedPool.forEach(card => {
            const stars   = State.data.inventory[card.uniqueId] ?? 0;
            const isOwned = stars > 0;
            if (isOwned) unlocked++;

            const isCation = card.id < 22 || card.id === 99;
            const isAnion  = card.id >= 22 && card.id <= 45;

            if (type === 'locked' && isOwned)              return;
            if (type === 'ssr'    && card.targetRarity !== 'SSR') return;
            if (type === 'cation' && !isCation)            return;
            if (type === 'anion'  && !isAnion)             return;

            frag.appendChild(this.createCardNode(
                card, stars, isOwned,
                isOwned
                    ? () => import('./game.js').then(({ Game }) => Game.showGachaResult(card, card.targetRarity, stars, false, 0, false))
                    : null
            ));
        });

        grid.innerHTML = '';
        grid.appendChild(frag);
        document.getElementById('collectionCount').innerText = `${unlocked}/184`;
    },

    // ── Lab (Alchemy grid) ────────────────────────────────────────────────────
    filterLab(type) {
        AudioEngine.play('click');
        _activateChip('#view-lab', event?.target);

        const grid = document.getElementById('labGrid');
        const frag = document.createDocumentFragment();
        const ALCHEMY_TARGETS = { N: 3, R: 5, SR: 7, SSR: 10 };

        Database.expandedPool.forEach(card => {
            if (card.isSpecial)                                     return;
            if (type !== 'all' && card.targetRarity.toLowerCase() !== type) return;

            const stars  = State.data.inventory[card.uniqueId] ?? 0;
            const isMaxed = stars >= 3;
            const item   = this.createCardNode(card, stars, stars > 0, null);
            if (isMaxed) item.classList.add('maxed-out');

            if (!isMaxed) {
                item.onclick = () => {
                    AudioEngine.play('click');
                    const cost   = Database.config.alchemyCosts[card.targetRarity];
                    const target = ALCHEMY_TARGETS[card.targetRarity];

                    if (State.data.coins < cost) {
                        alert(`🪙 餘額不足！需要 ${cost} 枚代幣。`);
                        return;
                    }
                    const action = stars > 0 ? '升星' : '解鎖';
                    if (confirm(`確定消耗 ${cost} 🪙 來 ${action}「${card.targetRarity}級 ${card.name}」？\n⚠️ 需連對 ${target} 題，且每題限時 5 秒！`)) {
                        State.game.targetCard    = card;
                        State.game.alchemyTarget = target;
                        import('./game.js').then(({ Game }) => Game.start('alchemy'));
                    }
                };
            }

            frag.appendChild(item);
        });

        grid.innerHTML = '';
        grid.appendChild(frag);
    },
};

// ── Internal helpers ──────────────────────────────────────────────────────────
function _activateChip(scopeSelector, target) {
    document.querySelectorAll(`${scopeSelector} .filter-chip`).forEach(el => el.classList.remove('active'));
    if (target) target.classList.add('active');
}
