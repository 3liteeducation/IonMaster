// censorship.js - 獨立的敏感詞彙守衛 (Plugin)
import { State } from './state.js';

// 從開源資料庫萃取的髒話、敏感詞與不良網站清單 (已全部轉大寫)
const badWords = [
    "1MAN1JAR", "2GIRLS1CUP", "BLUE WAFFLE", "GOATSE", "LEMON PARTY", "MEATSPIN", "MR HANDS", "TUBGIRL", "ZIPPOCAT",
    "BANGBROS", "BANGBUS", "ONLYFANS", "PLAYBOY", "PORNHUB", "XHAMSTER", "XNXX", "XTUBE", "XVIDEOS",
    "ANAL", "ARSE", "COCK", "DICK", "MASTURBATE", "PORN", "PORNOGRAPHY", "TITS", "TITTY", "WANK", "XXX",
    "ANUS", "ASS", "BOLLOCKS", "BOOB", "BREASTS", "GENITALS", "NIPPLES", "PENIS", "PUBES", "RECTUM", "SEMEN", "VAGINA",
    "FAGGOT", "DYKE", "TRANNY", "SHEMALE",
    "NIGGER", "NIGGA", "BEANER", "CHINK", "COON", "GOOK", "KIKE", "PAKI", "SPIC", "WETBACK",
    "CLUSTERFUCK", "CUNT", "FUCK", "FUCKHEAD", "FUCKTARD", "FUCKWAD", "FUCKWIT", "ARSEHOLE", "ASSHOLE", "BASTARD",
    "BELLEND", "BITCH", "PUSSY", "SHITHEAD", "TWAT", "WHORE", "APESHIT", "BULLSHIT", "DOGSHIT", "HORSESHIT",
    "PIECE OF SHIT", "PISS", "RETARD", "SHIT", "SHITTY", "SPASTIC", "TOSSER", "WANKER", "SLUT"
];

// 從 emoji.json 萃取的性暗示與不雅符號
const badEmojis = ["🍆", "💦", "🍑", "👅", "🌮", "✊", "🍌", "👉👌", "👌👈", "🖕", "🤬"];

// 🚀 核心魔法：Monkey Patching (攔截器)
// 我們先把 State.js 裡面原本的 login 函數「備份」起來
const originalLogin = State.login;

// 然後覆寫它，加入我們的「海關檢查」邏輯
State.login = async function() {
    const uInput = document.getElementById('loginUsername');
    if (!uInput) return originalLogin.apply(this); // 如果找不到輸入框，直接放行
    
    let user = uInput.value.trim().toUpperCase();
    
    // 檢查 1：是否有包含英文髒話
    const hasBadWord = badWords.some(word => user.includes(word));
    
    // 檢查 2：是否有包含不雅 Emoji
    const hasBadEmoji = badEmojis.some(emoji => user.includes(emoji));

    if (hasBadWord || hasBadEmoji) {
        // 🛑 發現違禁詞！彈出警告並「中斷」執行，不讓資料傳給伺服器
        alert("🛑 系統警告：您的名稱包含不適當的字眼或符號，為了維護實驗室環境，請重新輸入！");
        return; 
    }

    // ✅ 檢查通過！呼叫剛才備份的「原本登入流程」繼續執行
    return originalLogin.apply(this);
};

console.log("🛡️ Censorship Plugin 已啟動：敏感詞攔截器就緒。");
