// sturmglanz/js/config.js
// تنظیمات، ثابت‌ها، و سیستم سختی تطبیقی
'use strict';

const CONFIG = {
    VERSION: '3.0.0',
    BUILD: 'GÖTTERDÄMMERUNG',
    
    MAP: {
        WIDTH: 40,
        HEIGHT: 30,
        TILE_SIZE: 64,
        MINIMAP_SIZE: 130
    },
    
    GAME: {
        MAX_UNITS_PER_FACTION: 35,
        MAX_TURNS: 150,
        AUTOSAVE_INTERVAL: 5,
        LOG_MAX_ENTRIES: 80
    },
    
    DIFFICULTY: {
        DEFAULT: 'hauptmann',
        ADAPTIVE: true,
        MERCY_THRESHOLD: 3
    },
    
    RESOURCES: {
        INITIAL_RP: 600,
        INITIAL_FUEL: 350,
        INITIAL_AMMO: 250,
        RP_PER_TURN: 60,
        FUEL_PER_TURN: 35,
        AMMO_PER_TURN: 25
    },
    
    WEATHER: {
        CHANGE_INTERVAL: 6,
        TYPES: ['klar', 'regen', 'schnee', 'nebel', 'sturm'],
        EFFECTS: {
            klar:   { movement: 1.0, attack: 1.0, vision: 1.0, name: 'صاف' },
            regen:  { movement: 0.8, attack: 0.9, vision: 0.7, name: 'بارانی' },
            schnee: { movement: 0.6, attack: 0.8, vision: 0.6, name: 'برفی' },
            nebel:  { movement: 0.9, attack: 0.85, vision: 0.4, name: 'مه‌آلود' },
            sturm:  { movement: 0.5, attack: 0.7, vision: 0.3, name: 'طوفان' }
        }
    },
    
    DAYNIGHT: {
        CYCLE_TURNS: 8,
        EFFECTS: {
            dawn:  { vision: 0.7, attack: 0.9, name: 'سحر' },
            day:   { vision: 1.0, attack: 1.0, name: 'روز' },
            dusk:  { vision: 0.6, attack: 0.85, name: 'غروب' },
            night: { vision: 0.3, attack: 0.7, name: 'شب' }
        }
    },
    
    STORAGE: {
        DB_NAME: 'sturmglanz_db',
        DB_VERSION: 3,
        STORE_SAVES: 'saves',
        STORE_SETTINGS: 'settings',
        STORE_REPLAYS: 'replays'
    },
    
    ZARINPAL: {
        MERCHANT_ID: 'PLACEHOLDER',
        CALLBACK_URL: window.location.origin + '/payment/callback',
        TEST_MODE: true
    },
    
    FIREBASE: {
        ENABLED: false,
        CONFIG: {
            apiKey: 'PLACEHOLDER',
            authDomain: 'PLACEHOLDER.firebaseapp.com',
            databaseURL: 'https://PLACEHOLDER.firebaseio.com',
            projectId: 'PLACEHOLDER',
            storageBucket: 'PLACEHOLDER.appspot.com',
            messagingSenderId: '000000000000',
            appId: 'PLACEHOLDER'
        }
    }
};

// ============ سیستم سختی تطبیقی ============
class DifficultyManager {
    constructor() {
        this.currentLevel = CONFIG.DIFFICULTY.DEFAULT;
        this.adaptiveEnabled = CONFIG.DIFFICULTY.ADAPTIVE;
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        this.playerPerformance = [];
        this.mercyActivations = 0;
        this.hiddenModifiers = {
            enemyAccuracy: 1.0,
            enemyResources: 1.0,
            playerLuck: 1.0,
            enemyAggression: 0.5
        };
    }

    getLevelConfig(level) {
        const configs = {
            leutnant: {
                name: 'ستوان',
                description: 'مناسب آشنایی با بازی',
                enemyAccuracy: 0.6,
                enemyResources: 0.5,
                playerResources: 2.0,
                enemyAggression: 0.3,
                fogOfWar: false,
                mercyThreshold: 1
            },
            hauptmann: {
                name: 'سروان',
                description: 'چالش متعادل',
                enemyAccuracy: 0.85,
                enemyResources: 0.8,
                playerResources: 1.3,
                enemyAggression: 0.55,
                fogOfWar: true,
                mercyThreshold: 3
            },
            oberst: {
                name: 'سرهنگ',
                description: 'هر تصمیم مهم است',
                enemyAccuracy: 1.0,
                enemyResources: 1.1,
                playerResources: 0.9,
                enemyAggression: 0.75,
                fogOfWar: true,
                mercyThreshold: 5
            },
            general: {
                name: 'ژنرال',
                description: 'فقط برای کهنه‌سربازان',
                enemyAccuracy: 1.2,
                enemyResources: 1.4,
                playerResources: 0.6,
                enemyAggression: 0.95,
                fogOfWar: true,
                mercyThreshold: 999
            }
        };
        return configs[level] || configs.hauptmann;
    }

    setLevel(level) {
        if (this.getLevelConfig(level)) {
            this.currentLevel = level;
            this.applyConfig();
            return true;
        }
        return false;
    }

    applyConfig() {
        const config = this.getLevelConfig(this.currentLevel);
        this.hiddenModifiers.enemyAccuracy = config.enemyAccuracy;
        this.hiddenModifiers.enemyResources = config.enemyResources;
        this.hiddenModifiers.enemyAggression = config.enemyAggression;
    }

    onBattleResult(playerWon) {
        this.playerPerformance.push({
            won: playerWon,
            turn: window.gameState ? window.gameState.currentTurn : 0,
            timestamp: Date.now()
        });
        if (this.playerPerformance.length > 20) this.playerPerformance.shift();
        if (playerWon) {
            this.consecutiveWins++;
            this.consecutiveLosses = 0;
        } else {
            this.consecutiveLosses++;
            this.consecutiveWins = 0;
        }
        this.adapt();
    }

    adapt() {
        if (!this.adaptiveEnabled) return;
        if (this.consecutiveLosses >= 3) {
            this.hiddenModifiers.playerLuck += 0.15;
            this.hiddenModifiers.enemyAccuracy -= 0.1;
            this.mercyActivations++;
        }
        if (this.consecutiveWins >= 4) {
            this.hiddenModifiers.playerLuck = Math.max(0.7, this.hiddenModifiers.playerLuck - 0.1);
            this.hiddenModifiers.enemyAccuracy += 0.05;
        }
        this.hiddenModifiers.playerLuck = Math.min(1.5, Math.max(0.7, this.hiddenModifiers.playerLuck));
        this.hiddenModifiers.enemyAccuracy = Math.min(1.4, Math.max(0.5, this.hiddenModifiers.enemyAccuracy));
    }

    shouldTriggerMercy() {
        const config = this.getLevelConfig(this.currentLevel);
        return this.consecutiveLosses >= config.mercyThreshold;
    }

    getMercyEvent() {
        const events = [
            {
                name: 'داوطلبان جدید',
                description: 'گروهی از سربازان داوطلب به شما ملحق شدند.',
                effect: (gs) => { gs.resources.rp += 80; }
            },
            {
                name: 'خطای اطلاعاتی دشمن',
                description: 'اطلاعات غلط به دشمن مخابره شد.',
                effect: (gs) => { gs.log('دشمن یک نوبت گیج است.', 'system'); }
            },
            {
                name: 'قطار تدارکاتی',
                description: 'یک قطار تدارکاتی از محاصره عبور کرد.',
                effect: (gs) => { gs.resources.ammo += 60; gs.resources.fuel += 40; }
            },
            {
                name: 'باران شدید',
                description: 'باران سیل‌آسا حمله دشمن را به تأخیر انداخت.',
                effect: (gs) => { gs.weatherState = 'regen'; gs.weatherTimer = 3; }
            }
        ];
        return events[Math.floor(Math.random() * events.length)];
    }
}

// ============ enumهای بازی ============
const TERRAIN_TYPE = {
    PLAINS: 0, FOREST: 1, HILL: 2, MOUNTAIN: 3, RIVER: 4, CITY: 5,
    RUINS: 6, BRIDGE: 7, MARSH: 8, ROAD: 9, BUNKER: 10, TRENCH: 11,
    MINEFIELD: 12, CEMETERY: 13, FACTORY: 14
};

const TERRAIN_NAMES = {
    0: 'دشت', 1: 'جنگل', 2: 'تپه', 3: 'کوهستان', 4: 'رودخانه',
    5: 'شهر', 6: 'ویرانه', 7: 'پل', 8: 'مرداب', 9: 'جاده',
    10: 'پناهگاه', 11: 'سنگر', 12: 'میدان مین', 13: 'گورستان', 14: 'کارخانه'
};

const UNIT_TYPE = {
    INFANTRY: 'infantry', PANZERGRENADIER: 'panzergrenadier',
    PANZER_IV: 'panzer_iv', TIGER: 'tiger', KING_TIGER: 'king_tiger',
    ARTILLERY: 'artillery', FLAK_88: 'flak_88', RECON: 'recon',
    ENGINEER: 'engineer', HQ: 'hq', SUPPLY: 'supply',
    SNIPER: 'sniper', MORTAR: 'mortar', NEBELWERFER: 'nebelwerfer',
    PANZERFAUST: 'panzerfaust', STUG: 'stug', JAGDPANTHER: 'jagdpanther',
    WIRBELWIND: 'wirbelwind', KUBELWAGEN: 'kubelwagen',
    SDKFZ_251: 'sdkfz_251', VOLKSSTURM: 'volkssturm',
    HITLERJUGEND: 'hitlerjugend', BRANDENBURGER: 'brandenburger',
    FELDGENDARMERIE: 'feldgendarmerie', STURMTIGER: 'sturmtiger'
};

const FACTION = {
    WEHRMACHT: 'wehrmacht', SOVIET: 'soviet',
    ALLIED: 'allied', NEUTRAL: 'neutral', PARTISAN: 'partisan'
};

const ORDER_TYPE = {
    MOVE: 'move', ATTACK: 'attack', DEFEND: 'defend', HOLD: 'hold',
    FORTIFY: 'fortify', REPAIR: 'repair', RESUPPLY: 'resupply',
    RETREAT: 'retreat', OVERWATCH: 'overwatch', BLITZ: 'blitz',
    AMBUSH: 'ambush', SCOUT: 'scout', LAY_MINES: 'lay_mines',
    CLEAR_MINES: 'clear_mines', DEMOLISH: 'demolish', EVACUATE: 'evacuate'
};

const TURN_PHASES = {
    PLANNING: 'planning', EXECUTION: 'execution',
    ENEMY: 'enemy', RESOLUTION: 'resolution'
};
