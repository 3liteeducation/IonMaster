// audio.js - 專門處理遊戲內的所有聲音
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

// 點擊畫面時初始化音效（瀏覽器安全性要求）
document.body.addEventListener('click', () => AudioEngine.init(), {once:true});
