// 3lite Ecosystem - Chemical Database: Ion Master 8.0
const Database = {
    cations: [
        { id: 1, name: "Sodium", formula: "Na", charge: 1, html: "Na<sup>+</sup>", fileKey: 'na' }, 
        { id: 2, name: "Potassium", formula: "K", charge: 1, html: "K<sup>+</sup>", fileKey: 'k' },
        { id: 3, name: "Copper(I)", formula: "Cu", charge: 1, html: "Cu<sup>+</sup>", fileKey: 'cu1' }, 
        { id: 4, name: "Silver", formula: "Ag", charge: 1, html: "Ag<sup>+</sup>", fileKey: 'ag' },
        { id: 5, name: "Mercury(I)", formula: "Hg", charge: 1, html: "Hg<sup>+</sup>", fileKey: 'hg1' }, 
        { id: 6, name: "Hydrogen", formula: "H", charge: 1, html: "H<sup>+</sup>", fileKey: 'h' },
        { id: 7, name: "Ammonium", formula: "NH4", charge: 1, html: "NH<sub>4</sub><sup>+</sup>", poly: true, fileKey: 'nh4' }, 
        { id: 8, name: "Magnesium", formula: "Mg", charge: 2, html: "Mg<sup>2+</sup>", fileKey: 'mg' },
        { id: 9, name: "Calcium", formula: "Ca", charge: 2, html: "Ca<sup>2+</sup>", fileKey: 'ca' }, 
        { id: 10, name: "Barium", formula: "Ba", charge: 2, html: "Ba<sup>2+</sup>", fileKey: 'ba' },
        { id: 11, name: "Lead(II)", formula: "Pb", charge: 2, html: "Pb<sup>2+</sup>", fileKey: 'pb' }, 
        { id: 12, name: "Iron(II)", formula: "Fe", charge: 2, html: "Fe<sup>2+</sup>", fileKey: 'fe2' },
        { id: 13, name: "Cobalt(II)", formula: "Co", charge: 2, html: "Co<sup>2+</sup>", fileKey: 'co' }, 
        { id: 14, name: "Nickel(II)", formula: "Ni", charge: 2, html: "Ni<sup>2+</sup>", fileKey: 'ni' },
        { id: 15, name: "Manganese(II)", formula: "Mn", charge: 2, html: "Mn<sup>2+</sup>", fileKey: 'mn' }, 
        { id: 16, name: "Copper(II)", formula: "Cu", charge: 2, html: "Cu<sup>2+</sup>", fileKey: 'cu2' },
        { id: 17, name: "Zinc", formula: "Zn", charge: 2, html: "Zn<sup>2+</sup>", fileKey: 'zn' }, 
        { id: 18, name: "Mercury(II)", formula: "Hg", charge: 2, html: "Hg<sup>2+</sup>", fileKey: 'hg2' },
        { id: 19, name: "Aluminium", formula: "Al", charge: 3, html: "Al<sup>3+</sup>", fileKey: 'al' }, 
        { id: 20, name: "Iron(III)", formula: "Fe", charge: 3, html: "Fe<sup>3+</sup>", fileKey: 'fe3' },
        { id: 21, name: "Chromium(III)", formula: "Cr", charge: 3, html: "Cr<sup>3+</sup>", fileKey: 'cr' }, 
        { id: 99, name: "A.A. Sir", formula: "AA", charge: 0, html: "🔋", fileKey: 'aa_sir', isSpecial: true } 
    ],
    anions: [
        { id: 22, name: "Hydride", formula: "H", charge: 1, html: "H<sup>-</sup>", fileKey: 'hydride' }, 
        { id: 23, name: "Chloride", formula: "Cl", charge: 1, html: "Cl<sup>-</sup>", fileKey: 'cl' }, 
        { id: 24, name: "Bromide", formula: "Br", charge: 1, html: "Br<sup>-</sup>", fileKey: 'br' }, 
        { id: 25, name: "Iodide", formula: "I", charge: 1, html: "I<sup>-</sup>", fileKey: 'i' },
        { id: 26, name: "Hydroxide", formula: "OH", charge: 1, html: "OH<sup>-</sup>", poly: true, fileKey: 'oh' }, 
        { id: 27, name: "Nitrate", formula: "NO3", charge: 1, html: "NO<sub>3</sub><sup>-</sup>", poly: true, fileKey: 'no3' },
        { id: 28, name: "Nitrite", formula: "NO2", charge: 1, html: "NO<sub>2</sub><sup>-</sup>", poly: true, fileKey: 'no2' }, 
        { id: 29, name: "Hydrogencarbonate", formula: "HCO3", charge: 1, html: "HCO<sub>3</sub><sup>-</sup>", poly: true, fileKey: 'hco3' },
        { id: 30, name: "Hydrogensulphate", formula: "HSO4", charge: 1, html: "HSO<sub>4</sub><sup>-</sup>", poly: true, fileKey: 'hso4' }, 
        { id: 31, name: "Cyanide", formula: "CN", charge: 1, html: "CN<sup>-</sup>", poly: true, fileKey: 'cn' },
        { id: 32, name: "Permanganate", formula: "MnO4", charge: 1, html: "MnO<sub>4</sub><sup>-</sup>", poly: true, fileKey: 'mno4' }, 
        { id: 33, name: "Chlorate", formula: "ClO3", charge: 1, html: "ClO<sub>3</sub><sup>-</sup>", poly: true, fileKey: 'clo3' },
        { id: 34, name: "Hypochlorite", formula: "ClO", charge: 1, html: "ClO<sup>-</sup>", poly: true, fileKey: 'clo' }, 
        { id: 35, name: "Oxide", formula: "O", charge: 2, html: "O<sup>2-</sup>", fileKey: 'o' },
        { id: 36, name: "Sulphide", formula: "S", charge: 2, html: "S<sup>2-</sup>", fileKey: 's' }, 
        { id: 37, name: "Sulphate", formula: "SO4", charge: 2, html: "SO<sub>4</sub><sup>2-</sup>", poly: true, fileKey: 'so4' },
        { id: 38, name: "Sulphite", formula: "SO3", charge: 2, html: "SO<sub>3</sub><sup>2-</sup>", poly: true, fileKey: 'so3' }, 
        { id: 39, name: "Silicate", formula: "SiO3", charge: 2, html: "SiO<sub>3</sub><sup>2-</sup>", poly: true, fileKey: 'sio3' },
        { id: 40, name: "Carbonate", formula: "CO3", charge: 2, html: "CO<sub>3</sub><sup>2-</sup>", poly: true, fileKey: 'co3' }, 
        { id: 41, name: "Chromate", formula: "CrO4", charge: 2, html: "CrO<sub>4</sub><sup>2-</sup>", poly: true, fileKey: 'cro4' },
        { id: 42, name: "Dichromate", formula: "Cr2O7", charge: 2, html: "Cr<sub>2</sub>O<sub>7</sub><sup>2-</sup>", poly: true, fileKey: 'cr2o7' }, 
        { id: 43, name: "Nitride", formula: "N", charge: 3, html: "N<sup>3-</sup>", fileKey: 'n' },
        { id: 44, name: "Phosphide", formula: "P", charge: 3, html: "P<sup>3-</sup>", fileKey: 'p' }, 
        { id: 45, name: "Phosphate", formula: "PO4", charge: 3, html: "PO<sub>4</sub><sup>3-</sup>", poly: true, fileKey: 'po4' }
    ],
    config: {
        rarities: ['N', 'R', 'SR', 'SSR'],
        refunds: { 'N': 2, 'R': 4, 'SR': 6, 'SSR': 10 },
        alchemyCosts: { 'N': 15, 'R': 30, 'SR': 80, 'SSR': 150 }, // 💰 通膨價格
        questTemplates: [
            { id: 'q_speed', title: "極速狂飆", desc: "完成 1 次速度模式", target: 1, reward: 15 },
            { id: 'q_practice', title: "勤能補拙", desc: "在練習模式答對 10 題", target: 10, reward: 10 },
            { id: 'q_gacha', title: "試煉手氣", desc: "進行 1 次抽卡", target: 1, reward: 5 },
            { id: 'q_login', title: "實驗室報到", desc: "每日登入", target: 1, reward: 5 }
        ]
    },
    // 🎨 獨立化學色彩學題庫
    colorQuestions: [
        { q: "Cu<sup>2+</sup> (aq)", a: "藍色 🔵" }, { q: "Fe<sup>2+</sup> (aq)", a: "淺綠色 🟢" },
        { q: "Fe<sup>3+</sup> (aq)", a: "黃/棕色 🟤" }, { q: "MnO<sub>4</sub><sup>-</sup> (aq)", a: "紫色 🟣" },
        { q: "Cr<sub>2</sub>O<sub>7</sub><sup>2-</sup> (aq)", a: "橙色 🟠" }, { q: "CrO<sub>4</sub><sup>2-</sup> (aq)", a: "黃色 🟡" },
        { q: "CuO (s)", a: "黑色 ⚫" }, { q: "CuCO<sub>3</sub> (s)", a: "綠色 🟩" },
        { q: "Cu(OH)<sub>2</sub> (s)", a: "淺藍色 💧" }, { q: "AgCl (s)", a: "白色 ⚪" },
        { q: "AgBr (s)", a: "淡黃色 🌕" }, { q: "AgI (s)", a: "黃色 🟡" },
        { q: "PbI<sub>2</sub> (s)", a: "黃色 🟡" }, { q: "Fe(OH)<sub>2</sub> (s)", a: "暗綠色 🌿" },
        { q: "Fe(OH)<sub>3</sub> (s)", a: "紅棕色 🟫" }, { q: "多數 Group 1/2 離子", a: "無色 🧊" }
    ],
    allColors: ["藍色 🔵", "淺綠色 🟢", "黃/棕色 🟤", "紫色 🟣", "橙色 🟠", "黃色 🟡", "黑色 ⚫", "綠色 🟩", "淺藍色 💧", "白色 ⚪", "淡黃色 🌕", "暗綠色 🌿", "紅棕色 🟫", "無色 🧊"]
};

Database.playableCations = Database.cations.filter(c => !c.isSpecial); 
Database.playableAnions = Database.anions.filter(a => !a.isSpecial);
Database.expandedPool = [];
[...Database.cations, ...Database.anions].forEach(card => { 
    Database.config.rarities.forEach(r => { Database.expandedPool.push({ ...card, uniqueId: card.id + '_' + r, targetRarity: r }); }); 
});
