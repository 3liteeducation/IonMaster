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
