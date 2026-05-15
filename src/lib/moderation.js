// src/lib/moderation.js
// Username content moderation — keep this list server-side only.

const BANISHED_WORDS = [
    'SKIBIDI','RIZZ','DEMURE','COOKED','GOAT','GASLIGHTING','CIRCLE BACK','GYATT',
    'FUCK','SHIT','BITCH','ASS','CUNT','DICK','COCK','PORN','XXX','ANUS','VAGINA','PENIS',
    'NIGGER','NIGGA','RETARD','BASTARD','SLUT','WHORE','WANK','PISS',
];
const BANISHED_EMOJIS = ['🍆','💦','🍑','👅','🖕','🤬','👉👌'];

/**
 * Returns true if the username contains forbidden words or emojis.
 * Short words (≤4 chars) are matched as whole tokens to avoid false positives
 * (e.g. "BASS" containing "ASS").
 */
export function isNameForbidden(name) {
    const upper = name.toUpperCase();
    if (BANISHED_EMOJIS.some(e => upper.includes(e))) return true;
    return BANISHED_WORDS.some(word =>
        word.length <= 4
            ? upper === word || upper.split(/\s+/).includes(word)
            : upper.includes(word)
    );
}
