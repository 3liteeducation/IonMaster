{\rtf1\ansi\ansicpg950\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw16840\paperh23820\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // ==========================================\
// Module 1: \uc0\u38598 \u20013 \u24335 \u29376 \u24907 \u31649 \u29702  (Centralized State)\
// ==========================================\
const State = \{\
    data: \{\
        coins: 0, exp: 0, inventory: \{\}, quests: \{ date: "", list: [] \}, \
        myHistory: [], errorLog: \{\} // \uc0\u38577 \u24615 \u23416 \u32722 \u25976 \u25818 \u36861 \u36452 \
    \},\
    game: \{ mode: '', score: 0, combo: 0, startTime: null, timerInterval: null, isAnimating: false, targetCard: null \},\
    pvp: \{ active: false, targetTime: 0, deck: [], myRecord: [] \},\
    \
    init() \{\
        this.data.coins = this.safeParse('aaCoins', 0);\
        this.data.exp = this.safeParse('aaExp', 0);\
        this.data.inventory = this.safeParse('aaInventorySep', \{\});\
        this.data.quests = this.safeParse('aaQuests', \{ date: "", list: [] \});\
        this.data.myHistory = this.safeParse('myIonHistory', []);\
        this.data.errorLog = this.safeParse('aaErrorLog', \{\});\
        this.checkDailyQuests(); this.save();\
    \},\
    safeParse(key, def) \{ try \{ let v = localStorage.getItem(key); return v ? JSON.parse(v) : def; \} catch(e) \{ return def; \} \},\
    save() \{\
        localStorage.setItem('aaCoins', this.data.coins); localStorage.setItem('aaExp', this.data.exp);\
        localStorage.setItem('aaInventorySep', JSON.stringify(this.data.inventory));\
        localStorage.setItem('aaQuests', JSON.stringify(this.data.quests));\
        localStorage.setItem('myIonHistory', JSON.stringify(this.data.myHistory));\
        localStorage.setItem('aaErrorLog', JSON.stringify(this.data.errorLog));\
        UI.updateProfile();\
    \},\
    addExp(amt) \{\
        let oldLvl = this.getLevel().lvl; this.data.exp += amt; this.save();\
        if(this.getLevel().lvl > oldLvl) \{ AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti(\{particleCount: 150, spread: 80, origin: \{y: 0.3\}\}); \}\
    \},\
    getLevel() \{\
        let exp = this.data.exp; let lvl = Math.floor(Math.sqrt(exp / 15)) + 1; let title = "Lab Rookie";\
        if(lvl >= 50) title = "A.A. Sir's Top Student"; else if(lvl >= 30) title = "Precipitation Master"; else if(lvl >= 10) title = "Ion Catcher";\
        let next = 15 * Math.pow(lvl, 2); let prev = 15 * Math.pow(lvl - 1, 2);\
        return \{ lvl, title, progress: Math.min(((exp - prev) / (next - prev)) * 100, 100) \};\
    \},\
    checkDailyQuests() \{\
        const today = new Date().toDateString();\
        if (this.data.quests.date !== today) \{\
            let shuffled = Database.config.questTemplates.sort(() => 0.5 - Math.random()).slice(0, 3);\
            this.data.quests = \{ date: today, list: shuffled.map(q => (\{ ...q, progress: 0, isClaimed: false \})) \};\
            let login = this.data.quests.list.find(q => q.id === 'q_login'); if(login) login.progress = 1;\
        \}\
    \},\
    updateQuest(id, amt=1) \{\
        let q = this.data.quests.list.find(x => x.id === id);\
        if(q && !q.isClaimed && q.progress < q.target) \{ q.progress = Math.min(q.progress + amt, q.target); this.save(); UI.renderQuests(); \}\
    \},\
    logError(c, a) \{ let key = c.formula+"_"+a.formula; this.data.errorLog[key] = (this.data.errorLog[key]||0)+1; this.save(); \}\
\};\
\
// ==========================================\
// Module 2: \uc0\u38899 \u25928 \u24341 \u25806  (Lazy Load)\
// ==========================================\
const AudioEngine = \{\
    ctx: null,\
    init() \{ try \{ if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if(this.ctx.state === 'suspended') this.ctx.resume(); \} catch(e)\{\} \},\
    tone(freq, type, dur, vol=0.1) \{\
        this.init(); if(!this.ctx) return; try \{\
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();\
            osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);\
            gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);\
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + dur);\
        \} catch(e)\{\}\
    \},\
    play(sound) \{\
        const s = \{\
            correct: () => \{ this.tone(600,'sine',0.1); setTimeout(()=>this.tone(800,'sine',0.2),100); \},\
            wrong: () => \{ this.tone(150,'sawtooth',0.3,0.2); \}, click: () => \{ this.tone(400,'sine',0.05); \},\
            draw: () => \{ this.tone(800,'square',0.1,0.05); this.tone(1200,'sine',0.3,0.05); \},\
            ssr: () => \{ this.tone(400,'sine',0.2); setTimeout(()=>this.tone(600,'sine',0.2),150); setTimeout(()=>this.tone(900,'sine',0.4),300); \},\
            explode: () => \{ this.tone(100,'square',0.5,0.3); this.tone(50,'sawtooth',0.6,0.3); \}\
        \};\
        if(s[sound]) s[sound]();\
    \}\
\};\
document.body.addEventListener('click', () => AudioEngine.init(), \{once:true\});\
\
// ==========================================\
// Module 3: \uc0\u20171 \u38754 \u28210 \u26579 \u31649 \u29702 \u22120  (DOM Optimization)\
// ==========================================\
const UI = \{\
    switchView(viewId, btnElem) \{\
        AudioEngine.play('click');\
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));\
        document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));\
        document.getElementById('view-' + viewId).classList.add('active');\
        if(btnElem) btnElem.classList.add('active');\
        if(viewId === 'gallery') this.filterGallery('all');\
        if(viewId === 'lab') this.filterLab('all');\
    \},\
    toggleModal(id, show) \{ if(show) AudioEngine.play('click'); document.getElementById(id).style.display = show ? 'flex' : 'none'; \},\
    setLock(locked) \{ State.game.isAnimating = locked; document.getElementById('animLock').style.display = locked ? 'block' : 'none'; \},\
    updateProfile() \{\
        document.getElementById('mainCoinCount').innerText = State.data.coins;\
        let info = State.getLevel();\
        document.getElementById('playerLevel').innerText = info.lvl;\
        let titleEl = document.getElementById('playerTitle'); titleEl.innerText = info.title;\
        titleEl.style.color = info.lvl >= 50 ? 'var(--rare)' : 'white';\
        document.getElementById('expBar').style.width = info.progress + '%';\
    \},\
    renderQuests() \{\
        const list = document.getElementById('questList'); list.innerHTML = '';\
        State.data.quests.list.forEach((q, i) => \{\
            let btn = q.isClaimed ? `<button class="ios-btn" style="background:transparent; color:var(--rare); padding:0; width:auto; box-shadow:none;">\uc0\u10004 \u65039 </button>` : \
                     (q.progress >= q.target ? `<button class="ios-btn primary-btn" style="padding:8px 12px; font-size:14px; width:auto;" onclick="Game.claimQuest($\{i\})">\uc0\u38936 \u21462  $\{q.reward\}\u55358 \u56985 </button>` : \
                     `<span style="font-size:14px; font-weight:bold; color:var(--apple-gray);">$\{q.progress\}/$\{q.target\}</span>`);\
            list.innerHTML += `<div class="quest-item"><div class="quest-info"><div class="ios-subtitle" style="margin:0;">$\{q.title\}</div><div class="ios-desc">$\{q.desc\}</div></div>$\{btn\}</div>`;\
        \});\
    \},\
    getStarStr(n) \{ return "\uc0\u11088 ".repeat(n); \},\
    // \uc0\u26680 \u24515 \u28210 \u26579 \u22120  (\u20351 \u29992  DocumentFragment \u20778 \u21270 \u25928 \u33021 )\
    createCardNode(card, stars, isOwned, onClick) \{\
        const item = document.createElement('div');\
        item.className = `card-item $\{isOwned ? 'owned ' + card.targetRarity.toLowerCase() : 'locked'\} $\{stars >= 3 ? 'max-star' : ''\}`;\
        let imgPath = `images/$\{card.fileKey\}_$\{card.targetRarity.toLowerCase()\}.png`;\
        if (isOwned) \{\
            item.innerHTML = `<img src="$\{imgPath\}" class="full-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="fallback-content" style="display:none;"><div style="font-size:24px;">$\{card.html\}</div><div style="font-size:12px; margin-top:5px;">$\{card.targetRarity\}</div></div><div class="stars-overlay">$\{this.getStarStr(stars)\}</div>`;\
            item.onclick = onClick; \
        \} else \{\
            item.innerHTML = `<img src="images/$\{card.fileKey\}_n.png" class="full-card-img locked-blur" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="fallback-content" style="display:none; background: #eee;"><div style="font-size:18px; color: #7f8c8d;">$\{card.html\}</div><div style="font-size:10px;">$\{card.targetRarity\}</div></div><div class="locked-overlay">\uc0\u55357 \u56594 </div>`;\
            if(onClick) item.onclick = onClick; \
        \}\
        return item;\
    \},\
    filterGallery(type) \{\
        AudioEngine.play('click');\
        document.querySelectorAll('#view-gallery .filter-chip').forEach(el => el.classList.remove('active')); event.target.classList.add('active');\
        const grid = document.getElementById('galleryGrid'); grid.innerHTML = ''; let unlockCount = 0;\
        const fragment = document.createDocumentFragment(); // \uc0\u25928 \u33021 \u20778 \u21270 \
        Database.expandedPool.forEach(card => \{\
            const stars = State.data.inventory[card.uniqueId] || 0; const isOwned = stars > 0; if(isOwned) unlockCount++;\
            const isCation = card.id < 22 || card.id === 99; const isAnion = card.id >= 22 && card.id <= 45;\
            if (type === 'locked' && isOwned) return; if (type === 'ssr' && card.targetRarity !== 'SSR') return;\
            if (type === 'cation' && !isCation) return; if (type === 'anion' && !isAnion) return;\
            fragment.appendChild(this.createCardNode(card, stars, isOwned, isOwned ? () => Game.showGachaResult(card, card.targetRarity, stars, false, 0, false) : null));\
        \});\
        grid.appendChild(fragment); document.getElementById('collectionCount').innerText = `$\{unlockCount\}/184`;\
    \},\
    filterLab(type) \{\
        AudioEngine.play('click');\
        document.querySelectorAll('#view-lab .filter-chip').forEach(el => el.classList.remove('active')); event.target.classList.add('active');\
        const grid = document.getElementById('labGrid'); grid.innerHTML = ''; const fragment = document.createDocumentFragment();\
        Database.expandedPool.forEach(card => \{\
            if(card.isSpecial) return; if(type !== 'all' && card.targetRarity.toLowerCase() !== type) return;\
            const stars = State.data.inventory[card.uniqueId] || 0; const isMaxed = stars >= 3;\
            let item = this.createCardNode(card, stars, stars > 0, null); if(isMaxed) item.className += ' maxed-out';\
            if (!isMaxed) \{\
                item.onclick = () => \{\
                    AudioEngine.play('click'); let cost = Database.config.alchemyCosts[card.targetRarity];\
                    if (State.data.coins < cost) \{ alert(`\uc0\u55358 \u56985  \u39192 \u38989 \u19981 \u36275 \u65281 \u38656 \u35201  $\{cost\} \u26522 \u20195 \u24163 \u12290 `); return; \}\
                    if (confirm(`\uc0\u30906 \u23450 \u28040 \u32791  $\{cost\} \u55358 \u56985  \u20358  $\{(stars > 0)?"\u21319 \u26143 ":"\u35299 \u37782 "\}\u12300 $\{card.targetRarity\}\u32026  $\{card.name\}\u12301 \u65311 \\n(\u38656 \u36899 \u31572 \u23565 3\u38988 \u65292 \u22833 \u25943 \u19981 \u36864 \u27454 \u65281 )`)) \{\
                        State.data.coins -= cost; State.save(); State.game.targetCard = card; Game.start('alchemy');\
                    \}\
                \};\
            \}\
            fragment.appendChild(item);\
        \});\
        grid.appendChild(fragment);\
    \}\
\};\
\
// ==========================================\
// Module 4: \uc0\u36938 \u25138 \u26680 \u24515 \u37007 \u36655  (Game Controller)\
// ==========================================\
const Game = \{\
    claimQuest(idx) \{\
        let q = State.data.quests.list[idx];\
        if(q.progress >= q.target && !q.isClaimed) \{ AudioEngine.play('ssr'); q.isClaimed = true; State.data.coins += q.reward; State.save(); UI.renderQuests(); if(typeof confetti !== 'undefined') confetti(\{particleCount: 50, spread: 60, origin: \{y: 0.8\}\});\}\
    \},\
    start(mode) \{\
        AudioEngine.play('click'); State.game.mode = mode; State.game.score = 0; State.game.combo = 0; State.game.timerInterval = null; usedQuestions.clear(); State.pvp.myRecord = [];\
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));\
        document.getElementById('view-play').classList.add('active'); document.getElementById('activeGameArea').style.display = 'block'; document.querySelector('.game-modes').style.display = 'none';\
        document.body.className = (mode === 'alchemy') ? 'bg-alchemy' : (mode === 'speed' || mode === 'pvp' ? 'bg-speed' : 'bg-main');\
        \
        let pTxt = document.getElementById('progressText'); let tDisp = document.getElementById('timerDisplay');\
        if (mode === 'speed' || mode === 'pvp') \{\
            pTxt.innerText = "\uc0\u36914 \u24230 : 0/10"; pTxt.style.color = "var(--secondary)"; tDisp.style.display = 'block';\
            State.game.startTime = Date.now(); State.game.timerInterval = setInterval(() => \{ tDisp.innerText = ((Date.now() - State.game.startTime) / 1000).toFixed(1) + "s"; \}, 100);\
        \} else if (mode === 'practice') \{\
            pTxt.innerText = "\uc0\u24050 \u31572 \u23565 : 0 \u38988 "; pTxt.style.color = "var(--secondary)"; tDisp.style.display = 'none';\
        \} else if (mode === 'alchemy') \{\
            pTxt.innerText = "\uc0\u29001 \u37329 \u36914 \u24230 : 0/3"; pTxt.style.color = "var(--rare)"; tDisp.style.display = 'none';\
        \}\
        document.getElementById('batteryLevel').style.width = '0%'; this.nextQuestion();\
    \},\
    quit() \{\
        AudioEngine.play('click'); clearInterval(State.game.timerInterval); document.body.className = 'bg-main'; document.body.classList.remove('screen-shake');\
        document.getElementById('activeGameArea').style.display = 'none'; document.querySelector('.game-modes').style.display = 'block';\
        if(State.pvp.active) \{ window.history.pushState(\{\}, '', window.location.pathname); State.pvp.active = false; document.getElementById('pvpBanner').style.display = 'none'; \}\
        UI.switchView('home');\
    \},\
    nextQuestion() \{\
        let m = State.game.mode; if ((m === 'speed' || m === 'pvp') && State.game.score >= 10) \{ this.finishSpeed(); return; \} if (m === 'alchemy' && State.game.score >= 3) \{ this.finishAlchemy(true); return; \}\
        State.game.isAnswered = false; let curC, curA, scenario;\
\
        if (m === 'pvp') \{\
            let qD = State.pvp.deck[State.game.score]; curC = Database.playableCations.find(c => c.id === qD.c); curA = Database.playableAnions.find(a => a.id === qD.a); scenario = qD.s;\
        \} else \{\
            // \uc0\u28961 \u25973 \u20986 \u38988 \u28436 \u31639 \u27861  (\u36991 \u20813 \u27515 \u36852 \u22280 )\
            const isValid = (c, a) => \{ const bl = ['NH4_OH','H_NO3','H_NO2','H_Cl','H_Br','H_I','H_SO4','H_SO3','H_OH','H_O','H_CO3','H_PO4','H_CN','H_MnO4','H_ClO3','H_ClO','H_CrO4','H_Cr2O7','H_H','H_HSO4','H_HCO3']; return !bl.includes(c.formula + '_' + a.formula); \};\
            if (m === 'alchemy') \{\
                let tc = State.game.targetCard; let isC = Database.playableCations.some(c => c.id === tc.id);\
                let pool = (isC ? Database.playableAnions : Database.playableCations).filter(p => isC ? isValid(tc, p) : isValid(p, tc));\
                if(isC) \{ curC = tc; curA = pool[Math.floor(Math.random() * pool.length)]; \} else \{ curA = tc; curC = pool[Math.floor(Math.random() * pool.length)]; \}\
            \} else \{\
                do \{ curC = Database.playableCations[Math.floor(Math.random() * Database.playableCations.length)]; curA = Database.playableAnions[Math.floor(Math.random() * Database.playableAnions.length)]; \} while (!isValid(curC, curA));\
            \}\
            scenario = Math.floor(Math.random() * 3);\
        \}\
        \
        if (m === 'speed') State.pvp.myRecord.push(\{ c: curC.id, a: curA.id, s: scenario \});\
        \
        const getGCD = (a, b) => b ? getGCD(b, a % b) : a; const fSub = t => t.replace(/([0-9]+)/g, '<sub>$1</sub>');\
        const bForm = (c, a, sc, sa) => \{ let cp = fSub(c.formula); if(sc>1) cp = c.poly?`($\{cp\})<sub>$\{sc\}</sub>`:`$\{cp\}<sub>$\{sc\}</sub>`; let ap = fSub(a.formula); if(sa>1) ap = a.poly?`($\{ap\})<sub>$\{sa\}</sub>`:`$\{ap\}<sub>$\{sa\}</sub>`; return cp+ap; \};\
        const bName = (c, a) => `<span style="font-size:22px;">$\{c.name.replace(/ion/i,'').trim()\} $\{a.name.replace(/ion/i,'').trim().toLowerCase()\}</span>`;\
        \
        let cSub = curA.charge, aSub = curC.charge; let com = getGCD(cSub, aSub); cSub /= com; aSub /= com;\
        let opts = [], oSet = new Set(), qEl = document.getElementById('question');\
        qEl.innerHTML = (scenario <= 1) ? `<span>$\{curC.html\} &nbsp;+&nbsp; $\{curA.html\}</span>` : `<span style="font-size:26px;">$\{curC.name.replace(/ion/i,'').trim()\} ion<br>+<br>$\{curA.name.replace(/ion/i,'').trim()\} ion</span>`;\
\
        if (scenario === 0 || scenario === 2) \{\
            let correct = bForm(curC, curA, cSub, aSub); opts.push(\{h: correct, c: true\}); oSet.add(correct);\
            while(opts.length < 4) \{ let fake = bForm(curC, curA, Math.floor(Math.random()*3)+1, Math.floor(Math.random()*3)+1); if(!oSet.has(fake)) \{ oSet.add(fake); opts.push(\{h: fake, c: false\}); \} \}\
        \} else \{\
            let correct = bName(curC, curA); opts.push(\{h: correct, c: true\}); oSet.add(correct);\
            while(opts.length < 4) \{ let fake = bName(curC, Database.playableAnions[Math.floor(Math.random() * Database.playableAnions.length)]); if(!oSet.has(fake)) \{ oSet.add(fake); opts.push(\{h: fake, c: false\}); \} \}\
        \}\
\
        opts.sort(() => 0.5 - Math.random()); let oArea = document.getElementById('optionsArea'); oArea.innerHTML = '';\
        opts.forEach(opt => \{ let b = document.createElement('button'); b.className = 'option-btn'; b.innerHTML = opt.h; b.onclick = () => this.handleAns(b, opt.c, curC, curA); oArea.appendChild(b); \});\
    \},\
    handleAns(btn, isCorrect, c, a) \{\
        if(State.game.isAnswered) return; State.game.isAnswered = true; let m = State.game.mode;\
        if(isCorrect) \{\
            AudioEngine.play('correct'); btn.classList.add('correct'); State.game.score++;\
            if (m === 'speed' || m === 'pvp') \{ document.getElementById('progressText').innerText = `\uc0\u36914 \u24230 : $\{State.game.score\}/10`; document.getElementById('batteryLevel').style.width = (State.game.score * 10) + "%"; \} \
            else if (m === 'alchemy') \{ document.getElementById('progressText').innerText = `\uc0\u29001 \u37329 : $\{State.game.score\}/3`; document.getElementById('batteryLevel').style.width = (State.game.score * 33.3) + "%"; \} \
            else \{ State.addExp(5); State.updateQuest('q_practice', 1); document.getElementById('progressText').innerText = `\uc0\u31572 \u23565 : $\{State.game.score\}`; State.game.combo++; if (State.game.combo >= 5) \{ State.data.coins++; State.game.combo = 0; State.save(); \} document.getElementById('batteryLevel').style.width = ((State.game.score % 10) * 10 || 100) + "%"; \}\
            setTimeout(()=>this.nextQuestion(), 400); \
        \} else \{\
            AudioEngine.play('wrong'); btn.classList.add('wrong'); State.logError(c, a); // \uc0\u23531 \u20837 \u37679 \u38988 \u20998 \u26512 \
            if (m === 'alchemy') \{ setTimeout(()=>this.finishAlchemy(false), 300); \} else \{ setTimeout(() => \{ btn.classList.remove('wrong'); State.game.isAnswered = false; \}, 1000); \}\
        \}\
    \},\
    finishSpeed() \{\
        clearInterval(State.game.timerInterval); let fTime = (Date.now() - State.game.startTime) / 1000; State.updateQuest('q_speed', 1);\
        let content = document.getElementById('resultContent');\
        let best = State.data.myHistory.length > 0 ? Math.min(...State.data.myHistory.map(x => x.time)) : Infinity; State.addExp(50);\
        \
        let html = `<h2 class="ios-title">$\{State.pvp.active ? "\uc0\u9876 \u65039  \u27770 \u39717 \u32080 \u26463 " : "\u55356 \u57263  \u25361 \u25136 \u23436 \u25104 "\}</h2>`;\
        html += `<p class="ios-desc">$\{State.pvp.active ? `\uc0\u30446 \u27161 \u26178 \u38291 \u65306 $\{State.pvp.targetTime\}s<br>\u20320 \u30340 \u26178 \u38291 \u65306 ` : "\u26412 \u27425 \u26178 \u38291 \u65306 "\}</p>`;\
        html += `<div style="font-size:36px; color:var(--legend); font-weight:bold; margin-bottom: 10px;">$\{fTime.toFixed(2)\}s</div>`;\
        \
        if(State.pvp.active) \{\
            if(fTime < State.pvp.targetTime) \{ html += `<div class="reward-badge" style="display:block;">\uc0\u55356 \u57225  \u36386 \u39208 \u25104 \u21151 \u65281 +5\u55358 \u56985  +150EXP</div>`; State.data.coins += 5; State.addExp(150); AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti(\{particleCount: 150, spread: 80\}); \} \
            else \{ html += `<div class="reward-badge" style="display:block; background:#8e8e93;">\uc0\u55357 \u56448  \u25361 \u25136 \u22833 \u25943 ...</div>`; \}\
            window.history.pushState(\{\}, '', window.location.pathname); State.pvp.active = false; document.getElementById('pvpBanner').style.display = 'none';\
        \} else \{\
            html += `<div class="glass-panel" style="padding:10px; margin:15px 0;"><div style="color:var(--apple-orange); font-weight:bold; font-size:12px;">\uc0\u55357 \u56401  \u27511 \u21490 \u26368 \u20339  (PB)</div><div style="font-size:24px; font-weight:bold;">$\{Math.min(best, fTime).toFixed(2)\}s</div></div>`;\
            if (State.data.myHistory.length > 0 && fTime < best) \{ html += `<div class="reward-badge" style="display:block;">\uc0\u55356 \u57225  \u30772 \u32000 \u37636 \u65281 +2\u55358 \u56985  +100EXP</div>`; State.data.coins += 2; State.addExp(100); AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti(\{particleCount: 100, spread: 70, origin: \{y: 0.6\}\}); \}\
            html += `<button class="ios-btn warning-btn mb-2" onclick="Game.sharePvP($\{fTime\})">\uc0\u9876 \u65039  \u36992 \u35531 \u21516 \u23416 \u25361 \u25136 \u27492 \u32000 \u37636 \u65281 </button>`;\
            State.data.myHistory.unshift(\{ time: fTime \}); localStorage.setItem('myIonHistory', JSON.stringify(State.data.myHistory.slice(0, 5)));\
        \}\
        html += `<button class="ios-btn cancel-btn mt-2" onclick="Game.quit()">\uc0\u36820 \u22238 \u39318 \u38913 </button>`;\
        content.innerHTML = html; UI.toggleModal('resultModal', true); State.save();\
    \},\
    finishAlchemy(success) \{\
        if(!success) \{ AudioEngine.play('explode'); document.body.classList.add('screen-shake'); UI.toggleModal('explosionModal', true); return; \}\
        let c = State.game.targetCard; let stars = State.data.inventory[c.uniqueId] || 0; let isNew = stars === 0;\
        State.data.inventory[c.uniqueId] = stars + 1; State.addExp(30); State.save();\
        \
        UI.setLock(true); document.body.className = 'bg-main'; document.getElementById('gachaAnimText').innerText = "\uc0\u29001 \u37329 \u22823 \u25104 \u21151 \u65281 "; UI.toggleModal('gachaAnimModal', true); AudioEngine.play('draw');\
        setTimeout(() => \{ document.getElementById('whiteFlash').classList.add('active'); setTimeout(() => \{ UI.toggleModal('gachaAnimModal', false); document.getElementById('gachaAnimText').innerText = "\uc0\u39640 \u33021 \u21453 \u25033 \u21512 \u25104 \u20013 ..."; this.showGachaResult(c, c.targetRarity, State.data.inventory[c.uniqueId], isNew, 0, true); this.quit(); setTimeout(() => \{ document.getElementById('whiteFlash').classList.remove('active'); UI.setLock(false);\}, 100); \}, 400); \}, 1500); \
    \},\
    drawCard(times) \{\
        if(State.game.isAnimating) return; AudioEngine.play('click'); let cost = times * 5; if (State.data.coins < cost) \{ alert(`\uc0\u55358 \u56985  \u20195 \u24163 \u19981 \u36275 \u65281 \u38656 \u35201  $\{cost\} \u26522 \u12290 `); return; \}\
        State.data.coins -= cost; State.updateQuest('q_gacha', times); State.save(); UI.setLock(true);\
        let res = []; let refund = 0;\
        for(let i=0; i<times; i++) \{\
            let r = 'N'; let rand = Math.random() * 100; if(rand<1.5) r='SSR'; else if(rand<10) r='SR'; else if(rand<30) r='R';\
            let pool = Database.expandedPool.filter(x => x.targetRarity === r); if(r==='SSR') pool = pool.filter(x => (Math.random()<0.1) ? x.isSpecial : !x.isSpecial); else pool = pool.filter(x => !x.isSpecial);\
            let c = pool[Math.floor(Math.random() * pool.length)]; let stars = State.data.inventory[c.uniqueId] || 0; let isNew = stars === 0; let ref = 0;\
            if(isNew) \{ State.data.inventory[c.uniqueId] = 1; State.addExp(10); \} else if(stars<3) \{ State.data.inventory[c.uniqueId]++; State.addExp(5); \} else \{ ref = Database.config.refunds[r]; refund += ref; \}\
            res.push(\{ c, isNew, stars: State.data.inventory[c.uniqueId] || 3, ref \});\
        \}\
        State.data.coins += refund; State.save();\
        UI.toggleModal('gachaAnimModal', true); AudioEngine.play('draw');\
        setTimeout(() => \{ document.getElementById('whiteFlash').classList.add('active'); setTimeout(() => \{ UI.toggleModal('gachaAnimModal', false); if(times===1) this.showGachaResult(res[0].c, res[0].c.targetRarity, res[0].stars, res[0].isNew, res[0].ref, false); else this.showTenDraw(res, refund); setTimeout(() => \{ document.getElementById('whiteFlash').classList.remove('active'); UI.setLock(false);\}, 100); \}, 400); \}, 2000); \
    \},\
    showGachaResult(card, rarity, stars, isNew, refundAmt, isAlchemy) \{\
        State.game.currentDrawnCard = \{ ...card, currentRarity: rarity, currentStars: stars \}; \
        let color = rarity==='SSR' ? 'var(--rare)' : (rarity==='SR' ? 'var(--apple-purple)' : 'var(--secondary)');\
        if(rarity==='SSR') \{ if(isNew||isAlchemy) AudioEngine.play('ssr'); else if(!refundAmt) AudioEngine.play('correct'); \}\
        \
        let title = "", sub = "";\
        if(isAlchemy || isNew || refundAmt !== undefined) \{\
            if(isAlchemy) \{ title = "\uc0\u29001 \u37329 \u25104 \u21151 "; sub = isNew ? "\u55356 \u57225  \u25104 \u21151 \u35299 \u37782 \u65281 " : `\u55356 \u57119  \u21319 \u32026 \u28858  $\{stars\} \u26143 \u65281 `; \}\
            else \{\
                if(isNew) \{ title = "\uc0\u30332 \u29694 \u26032 \u21345 \u29260 "; if(typeof confetti !== 'undefined') confetti(\{particleCount: 50, spread: 60\}); \}\
                else if(refundAmt === 0) \{ title = "\uc0\u21345 \u29255 \u21319 \u26143 "; sub = `\u55356 \u57119  \u21560 \u25910 \u30862 \u29255 \u65292 \u21319 \u32026 \u28858  $\{stars\} \u26143 \u65281 `; \}\
                else \{ title = "\uc0\u21345 \u29255 \u20998 \u35299 "; sub = `\u9851 \u65039  \u36681 \u25563 \u28858  $\{refundAmt\} \u55358 \u56985  \u36864 \u36996 \u12290 `; color = "var(--apple-gray)"; \}\
            \}\
        \} else \{ title = "\uc0\u20803 \u32032 \u21345 \u29255 "; \}\
\
        let html = `<div style="font-weight:bold; color:$\{color\}; margin-bottom:5px;">[$\{rarity\}]</div><h2 class="ios-title" style="margin-top:0;">$\{title\}</h2><p class="ios-desc">$\{sub\}</p>`;\
        let cardDiv = document.createElement('div'); cardDiv.className = `reveal-card show $\{rarity.toLowerCase()\}`; if(stars>=3) cardDiv.className += ' max-star';\
        cardDiv.innerHTML = UI.createCardNode(card, stars, true, null).innerHTML;\
        \
        let wrapper = document.createElement('div'); wrapper.innerHTML = html; wrapper.appendChild(cardDiv);\
        wrapper.innerHTML += `<button class="ios-btn primary-btn mt-3" onclick="Game.shareCard()">\uc0\u55357 \u56548  \u28843 \u32768 \u25910 \u34255 </button><button class="ios-btn cancel-btn mt-2" onclick="UI.toggleModal('gachaModal', false); UI.filterGallery('all');">\u38364 \u38281 </button>`;\
        document.getElementById('gachaContent').innerHTML = ''; document.getElementById('gachaContent').appendChild(wrapper); UI.toggleModal('gachaModal', true);\
    \},\
    showTenDraw(results, totalRefund) \{\
        let html = `<h2 class="ios-title">\uc0\u21313 \u36899 \u25277 \u32080 \u26524 </h2>`;\
        if(totalRefund > 0) html += `<p class="ios-desc" style="color:var(--apple-orange); font-weight:bold;">\uc0\u9851 \u65039  \u20998 \u35299 \u36864 \u27454 \u65306 \u20849  $\{totalRefund\} \u55358 \u56985 </p>`;\
        html += `<div class="gallery-grid" style="grid-template-columns: repeat(5, 1fr); max-height:none; padding:0;" id="tenGrid"></div>`;\
        html += `<button class="ios-btn primary-btn mt-3" onclick="UI.toggleModal('gachaModal', false); UI.filterGallery('all');">\uc0\u30906 \u35469 \u25910 \u31339 </button>`;\
        \
        document.getElementById('gachaContent').innerHTML = html; UI.toggleModal('gachaModal', true);\
        const grid = document.getElementById('tenGrid'); let hasSSR = false;\
        results.forEach((res, i) => \{\
            if(res.c.targetRarity === 'SSR') hasSSR = true;\
            let item = UI.createCardNode(res.c, res.stars, true, null); item.className += ` $\{res.c.targetRarity.toLowerCase()\}`; if(res.stars>=3) item.className += ' max-star';\
            item.style.opacity = '0'; item.style.transform = 'translateY(20px)'; item.style.transition = '0.4s';\
            let badge = `<div style="position:absolute; top:5px; right:5px; padding:2px 5px; border-radius:5px; font-size:10px; font-weight:bold; color:white; z-index:10; background:$\{res.isNew?'var(--apple-purple)':(res.ref>0?'var(--apple-gray)':'var(--rare)')\};">$\{res.isNew?'NEW!':(res.ref>0?'+'+res.ref+'\uc0\u55358 \u56985 ':'\u11088 UP')\}</div>`;\
            item.innerHTML += badge; grid.appendChild(item);\
            setTimeout(() => \{ item.style.opacity = '1'; item.style.transform = 'translateY(0)'; AudioEngine.play('click'); \}, i * 150);\
        \});\
        if(hasSSR) setTimeout(() => \{ AudioEngine.play('ssr'); if(typeof confetti !== 'undefined') confetti(\{particleCount: 200, spread: 100, origin: \{y: 0.5\}\}); \}, 1500);\
    \},\
    shareCard() \{\
        if (!State.game.currentDrawnCard) return; AudioEngine.play('click');\
        const s = State.game.currentDrawnCard; const starStr = "\uc0\u11088 ".repeat(s.currentStars || 1); const title = State.getLevel().title;\
        const text = `\uc0\u55358 \u56810 \u12300 $\{title\}\u12301 \u25910 \u38598 \u21040 \u20102  [$\{s.currentRarity\}] \u32026 \u21029 \u30340  $\{starStr\}\u12300 $\{s.name\}\u12301 \u65281 \\n\u20320 \u33021 \u36229 \u36234 \u25105 \u21966 \u65311 \u20358  3lite Education \u25361 \u25136 \u65306 \\nhttps://3liteeducation.github.io/IonMaster/`;\
        if (navigator.share) navigator.share(\{ title: 'Ion Master', text: text, url: 'https://3liteeducation.github.io/IonMaster/' \}).catch(e=>\{\}); \
        else navigator.clipboard.writeText(text).then(() => alert('\uc0\u55357 \u56541  \u24050 \u35079 \u35069 \u21040 \u21098 \u36028 \u31807 \u65281 '));\
    \},\
    sharePvP(time) \{\
        AudioEngine.play('click');\
        let encoded = btoa(JSON.stringify(\{ t: parseFloat(time), d: State.pvp.myRecord \}));\
        let url = window.location.origin + window.location.pathname + "?pvp=" + encoded;\
        const text = `\uc0\u9876 \u65039 \u12300 $\{State.getLevel().title\}\u12301 \u21521 \u20320 \u30332 \u36215 \u21512 \u25104 \u27770 \u39717 \u65281 \\n\u55356 \u57263  \u30446 \u27161 \u26178 \u38291 \u65306 $\{time\} \u31186 \\n\u40670 \u25802 \u25509 \u21463 \u25361 \u25136 \u65306 \\n$\{url\}`;\
        if (navigator.share) navigator.share(\{ title: 'PvP \uc0\u25361 \u25136 ', text: text, url: url \}).catch(e=>\{\}); \
        else navigator.clipboard.writeText(text).then(() => alert('\uc0\u55357 \u56541  \u25361 \u25136 \u36899 \u32080 \u24050 \u35079 \u35069 \u65281 '));\
    \}\
\};\
\
// ==========================================\
// Module 5: \uc0\u25976 \u25818 \u23384 \u27284 \u27169 \u32068 \
// ==========================================\
const StorageManager = \{\
    export() \{\
        AudioEngine.play('click');\
        try \{\
            const data = \{ aaCoins: localStorage.getItem('aaCoins'), aaExp: localStorage.getItem('aaExp'), aaInventorySep: localStorage.getItem('aaInventorySep'), myIonHistory: localStorage.getItem('myIonHistory'), aaQuests: localStorage.getItem('aaQuests'), aaErrorLog: localStorage.getItem('aaErrorLog') \};\
            document.getElementById('saveCodeInput').value = btoa(encodeURIComponent(JSON.stringify(data)));\
            document.getElementById('saveCodeInput').select(); document.execCommand('copy'); alert('\uc0\u9989  \u23384 \u27284 \u30908 \u24050 \u35079 \u35069 \u65281 ');\
        \} catch(e) \{ alert('\uc0\u10060  \u21295 \u20986 \u22833 \u25943 \u12290 '); \}\
    \},\
    import() \{\
        AudioEngine.play('click'); const input = document.getElementById('saveCodeInput').value.trim();\
        if(!input) return alert('\uc0\u10060  \u35531 \u36028 \u19978 \u23384 \u27284 \u30908 \u65281 '); if(!confirm('\u9888 \u65039  \u35686 \u21578 \u65306 \u36889 \u23559 \u35206 \u33995 \u29694 \u26377 \u36914 \u24230 \u65281 ')) return;\
        try \{\
            const data = JSON.parse(decodeURIComponent(atob(input)));\
            for(let key in data) \{ if(data[key] !== undefined) localStorage.setItem(key, data[key]); \}\
            State.init(); UI.toggleModal('saveModal', false); alert('\uc0\u9989  \u35712 \u21462 \u25104 \u21151 \u65281 ');\
        \} catch(e) \{ alert('\uc0\u10060  \u35712 \u21462 \u22833 \u25943 \u65281 \u23384 \u27284 \u30908 \u25613 \u27584 \u12290 '); \}\
    \}\
\};\
\
// ==========================================\
// \uc0\u21021 \u22987 \u21270 \u21855 \u21205 \
// ==========================================\
window.onload = () => \{\
    State.init(); UI.renderQuests();\
    const pvpData = new URLSearchParams(window.location.search).get('pvp');\
    if (pvpData) \{\
        try \{\
            const parsed = JSON.parse(atob(pvpData));\
            if(parsed.t && parsed.d && parsed.d.length === 10) \{\
                State.pvp.active = true; State.pvp.deck = parsed.d; State.pvp.targetTime = parsed.t;\
                document.getElementById('pvpBanner').style.display = 'block'; document.getElementById('pvpTargetTime').innerText = parsed.t;\
            \}\
        \} catch(e) \{\}\
    \}\
\};}