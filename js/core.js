// sturmglanz/js/core.js
// موتور مرکزی - کلاس‌های پایه، مدیریت بازی، State Machine
'use strict';

// ============ کلاس موقعیت ============
class Position {
    constructor(x = 0, y = 0) {
        this.x = Math.floor(x);
        this.y = Math.floor(y);
    }
    clone() { return new Position(this.x, this.y); }
    equals(other) { return this.x === other.x && this.y === other.y; }
    distanceTo(other) { return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2); }
    manhattanDistance(other) { return Math.abs(other.x - this.x) + Math.abs(other.y - this.y); }
    add(dx, dy) { return new Position(this.x + dx, this.y + dy); }
    toString() { return `${this.x},${this.y}`; }
    static fromString(str) { const [x, y] = str.split(',').map(Number); return new Position(x, y); }
    isValid() { return this.x >= 0 && this.x < CONFIG.MAP.WIDTH && this.y >= 0 && this.y < CONFIG.MAP.HEIGHT; }
}

// ============ کلاس کاشی ============
class Tile {
    constructor(x, y, terrain = TERRAIN_TYPE.PLAINS) {
        this.position = new Position(x, y);
        this.terrain = terrain;
        this.elevation = 0;
        this.control = FACTION.NEUTRAL;
        this.hasEntrenchment = false;
        this.entrenchmentLevel = 0;
        this.damage = 0;
        this.supplyLevel = 100;
        this.victoryPoint = 0;
        this.isFrozen = false;
        this.isBurning = false;
        this.burnTimer = 0;
        this.isDestroyed = false;
        this.specialLocation = null;
    }

    getMovementCost() {
        if (this.isDestroyed && this.terrain === TERRAIN_TYPE.BRIDGE) return 99;
        if (this.isFrozen && this.terrain === TERRAIN_TYPE.RIVER) return 2;
        if (this.isBurning) return 4;
        const costs = {
            [TERRAIN_TYPE.PLAINS]: 1, [TERRAIN_TYPE.FOREST]: 2, [TERRAIN_TYPE.HILL]: 3,
            [TERRAIN_TYPE.MOUNTAIN]: 99, [TERRAIN_TYPE.RIVER]: 4, [TERRAIN_TYPE.CITY]: 1,
            [TERRAIN_TYPE.RUINS]: 2, [TERRAIN_TYPE.BRIDGE]: 1, [TERRAIN_TYPE.MARSH]: 3,
            [TERRAIN_TYPE.ROAD]: 0.5, [TERRAIN_TYPE.BUNKER]: 1, [TERRAIN_TYPE.TRENCH]: 1,
            [TERRAIN_TYPE.MINEFIELD]: 3, [TERRAIN_TYPE.CEMETERY]: 1, [TERRAIN_TYPE.FACTORY]: 1
        };
        return costs[this.terrain] || 1;
    }

    getDefenseBonus() {
        const bonuses = {
            [TERRAIN_TYPE.PLAINS]: 0, [TERRAIN_TYPE.FOREST]: 2, [TERRAIN_TYPE.HILL]: 3,
            [TERRAIN_TYPE.MOUNTAIN]: 5, [TERRAIN_TYPE.RIVER]: 1, [TERRAIN_TYPE.CITY]: 4,
            [TERRAIN_TYPE.RUINS]: 3, [TERRAIN_TYPE.BRIDGE]: -1, [TERRAIN_TYPE.MARSH]: 1,
            [TERRAIN_TYPE.ROAD]: -2, [TERRAIN_TYPE.BUNKER]: 6, [TERRAIN_TYPE.TRENCH]: 4,
            [TERRAIN_TYPE.MINEFIELD]: 2, [TERRAIN_TYPE.CEMETERY]: -1, [TERRAIN_TYPE.FACTORY]: 2
        };
        return bonuses[this.terrain] || 0;
    }

    getLineOfSight() {
        const los = {
            [TERRAIN_TYPE.PLAINS]: 5, [TERRAIN_TYPE.FOREST]: 2, [TERRAIN_TYPE.HILL]: 6,
            [TERRAIN_TYPE.MOUNTAIN]: 8, [TERRAIN_TYPE.RIVER]: 4, [TERRAIN_TYPE.CITY]: 3,
            [TERRAIN_TYPE.RUINS]: 3, [TERRAIN_TYPE.BRIDGE]: 5, [TERRAIN_TYPE.MARSH]: 2,
            [TERRAIN_TYPE.ROAD]: 5, [TERRAIN_TYPE.BUNKER]: 4, [TERRAIN_TYPE.TRENCH]: 4,
            [TERRAIN_TYPE.MINEFIELD]: 3, [TERRAIN_TYPE.CEMETERY]: 5, [TERRAIN_TYPE.FACTORY]: 3
        };
        return los[this.terrain] || 3;
    }
}

// ============ کلاس یگان ============
class Unit {
    constructor(id, type, faction, position) {
        this.id = id;
        this.type = type;
        this.faction = faction;
        this.position = position.clone();
        this.name = '';
        this.health = 100;
        this.maxHealth = 100;
        this.attackPower = 10;
        this.defensePower = 10;
        this.movementPoints = 5;
        this.maxMovementPoints = 5;
        this.range = 1;
        this.ammo = 100;
        this.maxAmmo = 100;
        this.fuel = 100;
        this.maxFuel = 100;
        this.morale = 100;
        this.experience = 0;
        this.level = 1;
        this.order = ORDER_TYPE.HOLD;
        this.hasActed = false;
        this.hasMoved = false;
        this.hasAttacked = false;
        this.entrenched = false;
        this.entrenchmentTurns = 0;
        this.kills = 0;
        this.suppressionLevel = 0;
        this.isSuppressed = false;
        this.camoActive = false;
        this.overwatchActive = false;
        this.blitzAvailable = false;
        this.homeCity = '';
        this.dogTag = '';
        this.age = 18 + Math.floor(Math.random() * 30);
        this.isWounded = false;
        this.woundTurns = 0;
        this.isMIA = false;
        this.lastWords = '';
        this.heirloom = null;
        this.setupStats();
    }

    setupStats() {
        const stats = UNIT_STATS[this.type];
        if (!stats) return;
        this.name = stats.name;
        this.attackPower = stats.attack;
        this.defensePower = stats.defense;
        this.maxMovementPoints = stats.movement;
        this.movementPoints = stats.movement;
        this.range = stats.range || 1;
        this.maxHealth = stats.health || 100;
        this.health = this.maxHealth;
        this.maxAmmo = stats.ammo || 100;
        this.ammo = this.maxAmmo;
        this.maxFuel = stats.fuel || 100;
        this.fuel = this.maxFuel;
        this.blitzAvailable = stats.canBlitz || false;
        this.dogTag = `DG-${Math.floor(Math.random() * 90000) + 10000}`;
        this.homeCity = this.randomGermanCity();
    }

    randomGermanCity() {
        const cities = ['برلین', 'هامبورگ', 'مونیخ', 'کلن', 'فرانکفورت', 'اشتوتگارت',
            'دوسلدورف', 'لایپزیگ', 'دورتموند', 'اسن', 'برمن', 'هانوفر', 'نورنبرگ', 'ماینتس'];
        return cities[Math.floor(Math.random() * cities.length)];
    }

    getEffectiveAttack() {
        let atk = this.attackPower;
        if (this.ammo <= 0) atk *= 0.3;
        if (this.morale < 50) atk *= 0.7;
        if (this.isSuppressed) atk *= 0.5;
        if (this.isWounded) atk *= 0.8;
        atk *= (1 + this.experience / 100);
        if (this.entrenched) atk *= 1.1;
        return Math.floor(atk);
    }

    getEffectiveDefense() {
        let def = this.defensePower;
        if (this.morale < 30) def *= 0.6;
        if (this.entrenched) def *= 1.4 + (this.entrenchmentTurns * 0.2);
        if (this.isWounded) def *= 0.8;
        def *= (1 + this.experience / 150);
        return Math.floor(def);
    }

    canMove() { return !this.hasMoved && this.movementPoints > 0 && !this.isSuppressed && !this.isMIA; }
    canAttack() { return !this.hasAttacked && this.ammo > 0 && !this.isSuppressed && !this.isMIA; }
    canAct() { return !this.hasActed && this.health > 0 && !this.isMIA; }

    resetTurn() {
        this.movementPoints = this.maxMovementPoints;
        this.hasMoved = false;
        this.hasAttacked = false;
        this.hasActed = false;
        this.isSuppressed = (this.suppressionLevel > 50);
        this.suppressionLevel = Math.max(0, this.suppressionLevel - 30);
        this.overwatchActive = false;
        this.camoActive = false;
        if (this.ammo < this.maxAmmo) this.ammo += 10;
        if (this.fuel < this.maxFuel) this.fuel += 15;
        if (this.morale < 100) this.morale += 5;
        if (this.health < this.maxHealth && this.order === ORDER_TYPE.REPAIR) {
            this.health = Math.min(this.maxHealth, this.health + 15);
        }
        if (this.isWounded) {
            this.woundTurns--;
            if (this.woundTurns <= 0) this.isWounded = false;
        }
    }

    takeDamage(amount) {
        const actualDamage = Math.max(0, amount - Math.floor(this.getEffectiveDefense() / 10));
        this.health -= actualDamage;
        this.morale -= Math.floor(actualDamage / 2);
        this.suppressionLevel += Math.floor(actualDamage * 1.5);
        if (this.suppressionLevel > 80) this.isSuppressed = true;
        if (this.health <= 0) {
            this.health = 0;
            this.setLastWords();
            return true;
        }
        return false;
    }

    setLastWords() {
        const wordsList = [
            'مادر...', 'تمام شد...', 'زنده باد آلمان...', 'خداحافظ...',
            'ببخشید...', 'سرده...', 'نمی‌خوام بمیرم...', 'بهشون بگو...',
            'هاینز...', 'تمومش کن...', 'فقط یه لحظه است...', 'خونه...'
        ];
        this.lastWords = wordsList[Math.floor(Math.random() * wordsList.length)];
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.suppressionLevel = Math.max(0, this.suppressionLevel - amount / 2);
        this.isSuppressed = this.suppressionLevel > 50;
    }

    promote() {
        this.experience += 25;
        if (this.experience >= this.level * 100) {
            this.level++;
            this.attackPower += 2;
            this.defensePower += 2;
            this.maxHealth += 5;
            this.health = Math.min(this.maxHealth, this.health + 5);
            return true;
        }
        return false;
    }

    toJSON() {
        return {
            id: this.id, type: this.type, faction: this.faction,
            position: { x: this.position.x, y: this.position.y },
            name: this.name, health: this.health, maxHealth: this.maxHealth,
            attackPower: this.attackPower, defensePower: this.defensePower,
            movementPoints: this.movementPoints, maxMovementPoints: this.maxMovementPoints,
            range: this.range, ammo: this.ammo, maxAmmo: this.maxAmmo,
            fuel: this.fuel, maxFuel: this.maxFuel, morale: this.morale,
            experience: this.experience, level: this.level, order: this.order,
            hasActed: this.hasActed, hasMoved: this.hasMoved, hasAttacked: this.hasAttacked,
            entrenched: this.entrenched, entrenchmentTurns: this.entrenchmentTurns,
            kills: this.kills, suppressionLevel: this.suppressionLevel,
            isSuppressed: this.isSuppressed, homeCity: this.homeCity,
            dogTag: this.dogTag, age: this.age, isWounded: this.isWounded,
            woundTurns: this.woundTurns, isMIA: this.isMIA, lastWords: this.lastWords,
            heirloom: this.heirloom
        };
    }

    static fromJSON(data) {
        const unit = new Unit(data.id, data.type, data.faction, new Position(data.position.x, data.position.y));
        Object.assign(unit, data);
        unit.position = new Position(data.position.x, data.position.y);
        return unit;
    }
}

// ============ آمار یگان‌ها ============
const UNIT_STATS = {
    [UNIT_TYPE.INFANTRY]: { name: 'پیاده‌نظام', attack: 12, defense: 10, movement: 4, range: 1, health: 100, ammo: 120, fuel: 999, canBlitz: false, cost: 50 },
    [UNIT_TYPE.PANZERGRENADIER]: { name: 'پانتسرگرنادیر', attack: 18, defense: 14, movement: 5, range: 1, health: 110, ammo: 100, fuel: 200, canBlitz: false, cost: 80 },
    [UNIT_TYPE.PANZER_IV]: { name: 'پانتسر ۴', attack: 25, defense: 18, movement: 6, range: 2, health: 130, ammo: 60, fuel: 150, canBlitz: true, cost: 150 },
    [UNIT_TYPE.TIGER]: { name: 'تایگر', attack: 35, defense: 28, movement: 4, range: 3, health: 180, ammo: 40, fuel: 100, canBlitz: true, cost: 250 },
    [UNIT_TYPE.KING_TIGER]: { name: 'کینگ تایگر', attack: 42, defense: 34, movement: 3, range: 3, health: 200, ammo: 35, fuel: 80, canBlitz: true, cost: 350 },
    [UNIT_TYPE.ARTILLERY]: { name: 'توپخانه', attack: 30, defense: 5, movement: 3, range: 6, health: 70, ammo: 30, fuel: 80, canBlitz: false, cost: 120 },
    [UNIT_TYPE.FLAK_88]: { name: 'فلاک ۸۸', attack: 28, defense: 12, movement: 2, range: 4, health: 90, ammo: 50, fuel: 60, canBlitz: false, cost: 100 },
    [UNIT_TYPE.RECON]: { name: 'شناسایی', attack: 8, defense: 6, movement: 8, range: 1, health: 60, ammo: 80, fuel: 250, canBlitz: false, cost: 40 },
    [UNIT_TYPE.ENGINEER]: { name: 'مهندس رزمی', attack: 10, defense: 12, movement: 4, range: 1, health: 90, ammo: 90, fuel: 150, canBlitz: false, cost: 60 },
    [UNIT_TYPE.HQ]: { name: 'قرارگاه', attack: 5, defense: 25, movement: 0, range: 0, health: 200, ammo: 200, fuel: 999, canBlitz: false, cost: 500 },
    [UNIT_TYPE.SUPPLY]: { name: 'تدارکات', attack: 2, defense: 4, movement: 5, range: 0, health: 60, ammo: 999, fuel: 999, canBlitz: false, cost: 30 },
    [UNIT_TYPE.SNIPER]: { name: 'تک‌تیرانداز', attack: 20, defense: 3, movement: 3, range: 5, health: 40, ammo: 30, fuel: 999, canBlitz: false, cost: 70 },
    [UNIT_TYPE.MORTAR]: { name: 'خمپاره‌انداز', attack: 22, defense: 4, movement: 3, range: 4, health: 50, ammo: 25, fuel: 80, canBlitz: false, cost: 90 },
    [UNIT_TYPE.NEBELWERFER]: { name: 'نبل‌ورفر', attack: 32, defense: 3, movement: 2, range: 5, health: 55, ammo: 20, fuel: 60, canBlitz: false, cost: 130 },
    [UNIT_TYPE.PANZERFAUST]: { name: 'پانتسرفاوست', attack: 30, defense: 6, movement: 3, range: 1, health: 50, ammo: 10, fuel: 999, canBlitz: false, cost: 55 },
    [UNIT_TYPE.STUG]: { name: 'اشتوگ ۳', attack: 28, defense: 22, movement: 5, range: 2, health: 120, ammo: 45, fuel: 120, canBlitz: false, cost: 180 },
    [UNIT_TYPE.JAGDPANTHER]: { name: 'یاگدپانتر', attack: 38, defense: 30, movement: 4, range: 3, health: 160, ammo: 35, fuel: 100, canBlitz: false, cost: 280 },
    [UNIT_TYPE.WIRBELWIND]: { name: 'ویربلویند', attack: 20, defense: 14, movement: 5, range: 3, health: 100, ammo: 80, fuel: 130, canBlitz: false, cost: 160 },
    [UNIT_TYPE.KUBELWAGEN]: { name: 'کوبل‌واگن', attack: 4, defense: 3, movement: 9, range: 1, health: 40, ammo: 40, fuel: 300, canBlitz: false, cost: 25 },
    [UNIT_TYPE.SDKFZ_251]: { name: 'زره‌پوش ۲۵۱', attack: 14, defense: 16, movement: 6, range: 1, health: 100, ammo: 70, fuel: 180, canBlitz: false, cost: 100 },
    [UNIT_TYPE.VOLKSSTURM]: { name: 'فولکس‌اشتورم', attack: 6, defense: 5, movement: 3, range: 1, health: 50, ammo: 30, fuel: 999, canBlitz: false, cost: 10 },
    [UNIT_TYPE.HITLERJUGEND]: { name: 'جوانان هیتلری', attack: 8, defense: 4, movement: 4, range: 1, health: 40, ammo: 25, fuel: 999, canBlitz: false, cost: 5 },
    [UNIT_TYPE.BRANDENBURGER]: { name: 'براندنبورگر', attack: 22, defense: 10, movement: 6, range: 1, health: 70, ammo: 40, fuel: 200, canBlitz: false, cost: 140 },
    [UNIT_TYPE.FELDGENDARMERIE]: { name: 'پلیس نظامی', attack: 10, defense: 8, movement: 5, range: 1, health: 60, ammo: 50, fuel: 150, canBlitz: false, cost: 35 },
    [UNIT_TYPE.STURMTIGER]: { name: 'اشتورم‌تایگر', attack: 50, defense: 35, movement: 2, range: 2, health: 220, ammo: 15, fuel: 60, canBlitz: false, cost: 400 }
};

// ============ کلاس مدیریت بازی ============
class GameState {
    constructor() {
        this.units = [];
        this.tiles = [];
        this.currentTurn = 1;
        this.phase = TURN_PHASES.PLANNING;
        this.selectedUnit = null;
        this.hoveredTile = null;
        this.faction = FACTION.WEHRMACHT;
        this.resources = { rp: CONFIG.RESOURCES.INITIAL_RP, fuel: CONFIG.RESOURCES.INITIAL_FUEL, ammo: CONFIG.RESOURCES.INITIAL_AMMO };
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.victoryPoints = 0;
        this.maxVictoryPoints = 15;
        this.isGameOver = false;
        this.logs = [];
        this.availableMoves = [];
        this.availableAttacks = [];
        this.pathCache = new Map();
        this.weatherState = 'klar';
        this.weatherTimer = 0;
        this.dayPhase = 'day';
        this.dayTimer = 0;
        this.supplyLines = [];
        this.unitIdCounter = 1000;
        this.difficultyManager = new DifficultyManager();
        this.heroesGallery = [];
        this.civiliansOnMap = [];
        this.burningTiles = [];
        this.frozenRivers = [];
        this.armoredTrain = null;
        this.trainRoute = [];
    }

    initialize() {
        this.generateMap();
        this.generateUnits();
        this.placeCivilians();
        this.setupArmoredTrain();
        this.calculateSupplyLines();
        this.log('بازی آغاز شد. فرمانده، جبهه شرق در انتظار شماست.', 'system');
        eventBus.emit(GAME_EVENTS.GAME_INITIALIZED, { turn: this.currentTurn });
    }

    generateMap() {
        this.tiles = [];
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const terrain = this.generateTerrain(x, y);
                this.tiles[y][x] = new Tile(x, y, terrain);
            }
        }
        this.placeSpecialFeatures();
    }

    generateTerrain(x, y) {
        const seed = (x * 7 + y * 13 + 5) % 100;
        if (x === 20 && y === 15) return TERRAIN_TYPE.CITY;
        if (Math.abs(x - 20) < 3 && Math.abs(y - 15) < 3) {
            if (seed < 30) return TERRAIN_TYPE.CITY;
            if (seed < 60) return TERRAIN_TYPE.ROAD;
            return TERRAIN_TYPE.PLAINS;
        }
        if ((x === 10 || x === 30) && y % 3 === 0) return TERRAIN_TYPE.RIVER;
        if (y === 10 && x > 5 && x < 35) return TERRAIN_TYPE.RIVER;
        if (x < 3 || x > 36 || y < 3 || y > 26) {
            if (seed < 50) return TERRAIN_TYPE.MOUNTAIN;
            return TERRAIN_TYPE.HILL;
        }
        if (seed < 20) return TERRAIN_TYPE.PLAINS;
        if (seed < 40) return TERRAIN_TYPE.FOREST;
        if (seed < 50) return TERRAIN_TYPE.HILL;
        if (seed < 55) return TERRAIN_TYPE.MARSH;
        if (seed < 65) return TERRAIN_TYPE.ROAD;
        if (seed < 70) return TERRAIN_TYPE.RUINS;
        return TERRAIN_TYPE.PLAINS;
    }

    placeSpecialFeatures() {
        this.setTileIfRiver(10, 10, TERRAIN_TYPE.BRIDGE);
        this.setTileIfRiver(11, 10, TERRAIN_TYPE.BRIDGE);
        this.setTileIfRiver(30, 15, TERRAIN_TYPE.BRIDGE);
        this.setTileIfRiver(31, 15, TERRAIN_TYPE.BRIDGE);
        this.getTile(10, 8).victoryPoint = 2;
        this.getTile(30, 12).victoryPoint = 2;
        this.getTile(20, 22).victoryPoint = 2;
        this.getTile(20, 15).victoryPoint = 4;
        this.getTile(15, 5).specialLocation = 'church';
        this.getTile(25, 25).specialLocation = 'factory';
        this.getTile(12, 18).specialLocation = 'cemetery_large';
        this.getTile(28, 8).specialLocation = 'hospital';
        this.getTile(8, 22).specialLocation = 'bakery';
        this.getTile(20, 15).specialLocation = 'bunker_hq';
    }

    setTileIfRiver(x, y, terrain) {
        if (x >= 0 && x < CONFIG.MAP.WIDTH && y >= 0 && y < CONFIG.MAP.HEIGHT) {
            if (this.tiles[y][x].terrain === TERRAIN_TYPE.RIVER) {
                this.tiles[y][x].terrain = terrain;
            }
        }
    }

    placeCivilians() {
        this.civiliansOnMap = [];
        for (let i = 0; i < 8; i++) {
            const x = 2 + Math.floor(Math.random() * 36);
            const y = 2 + Math.floor(Math.random() * 26);
            const tile = this.getTile(x, y);
            if (tile && (tile.terrain === TERRAIN_TYPE.CITY || tile.terrain === TERRAIN_TYPE.RUINS)) {
                this.civiliansOnMap.push({ x, y, alive: true });
            }
        }
    }

    setupArmoredTrain() {
        this.trainRoute = [];
        for (let x = 5; x < 35; x++) {
            const tile = this.getTile(x, 10);
            if (tile && tile.terrain === TERRAIN_TYPE.ROAD) {
                this.trainRoute.push(new Position(x, 10));
            }
        }
        if (this.trainRoute.length > 0) {
            this.armoredTrain = {
                position: this.trainRoute[0].clone(),
                hp: 150,
                active: true,
                routeIndex: 0
            };
        }
    }

    generateUnits() {
        this.units = [];
        this.unitIdCounter = 1000;
        const wehrmachtUnits = [
            { type: UNIT_TYPE.HQ, x: 20, y: 15 },
            { type: UNIT_TYPE.INFANTRY, x: 18, y: 14 }, { type: UNIT_TYPE.INFANTRY, x: 22, y: 14 },
            { type: UNIT_TYPE.INFANTRY, x: 20, y: 16 }, { type: UNIT_TYPE.PANZERGRENADIER, x: 17, y: 15 },
            { type: UNIT_TYPE.PANZERGRENADIER, x: 23, y: 15 }, { type: UNIT_TYPE.PANZER_IV, x: 15, y: 13 },
            { type: UNIT_TYPE.PANZER_IV, x: 25, y: 13 }, { type: UNIT_TYPE.TIGER, x: 20, y: 12 },
            { type: UNIT_TYPE.ARTILLERY, x: 24, y: 16 }, { type: UNIT_TYPE.ARTILLERY, x: 16, y: 16 },
            { type: UNIT_TYPE.FLAK_88, x: 21, y: 17 }, { type: UNIT_TYPE.RECON, x: 14, y: 14 },
            { type: UNIT_TYPE.ENGINEER, x: 19, y: 13 }, { type: UNIT_TYPE.SUPPLY, x: 20, y: 18 },
            { type: UNIT_TYPE.SNIPER, x: 13, y: 16 }, { type: UNIT_TYPE.STUG, x: 26, y: 14 }
        ];
        wehrmachtUnits.forEach(u => this.addUnit(u.type, FACTION.WEHRMACHT, u.x, u.y));
        const sovietUnits = [
            { type: UNIT_TYPE.INFANTRY, x: 5, y: 5 }, { type: UNIT_TYPE.INFANTRY, x: 6, y: 5 },
            { type: UNIT_TYPE.INFANTRY, x: 35, y: 25 }, { type: UNIT_TYPE.INFANTRY, x: 36, y: 25 },
            { type: UNIT_TYPE.PANZER_IV, x: 3, y: 3 }, { type: UNIT_TYPE.PANZER_IV, x: 37, y: 27 },
            { type: UNIT_TYPE.TIGER, x: 2, y: 4 }, { type: UNIT_TYPE.TIGER, x: 38, y: 26 },
            { type: UNIT_TYPE.ARTILLERY, x: 7, y: 3 }, { type: UNIT_TYPE.ARTILLERY, x: 33, y: 27 },
            { type: UNIT_TYPE.RECON, x: 8, y: 8 }, { type: UNIT_TYPE.HQ, x: 4, y: 4 },
            { type: UNIT_TYPE.HQ, x: 36, y: 26 }, { type: UNIT_TYPE.MORTAR, x: 9, y: 6 },
            { type: UNIT_TYPE.SNIPER, x: 34, y: 24 }
        ];
        sovietUnits.forEach(u => {
            const unit = this.addUnit(u.type, FACTION.SOVIET, u.x, u.y);
            unit.experience = 30 + Math.floor(Math.random() * 40);
            unit.level = 2;
        });
    }

    addUnit(type, faction, x, y) {
        const id = `unit_${this.unitIdCounter++}`;
        const unit = new Unit(id, type, faction, new Position(x, y));
        unit.name = `${UNIT_STATS[type].name} ${id.split('_')[1]}`;
        if (type === UNIT_TYPE.HITLERJUGEND) unit.age = 14 + Math.floor(Math.random() * 3);
        if (type === UNIT_TYPE.VOLKSSTURM) unit.age = 45 + Math.floor(Math.random() * 25);
        this.units.push(unit);
        return unit;
    }

    getUnit(id) { return this.units.find(u => u.id === id); }
    getUnitAt(x, y) { return this.units.find(u => u.position.x === x && u.position.y === y && u.health > 0); }
    getUnitsByFaction(faction) { return this.units.filter(u => u.faction === faction && u.health > 0); }
    getMyUnits() { return this.getUnitsByFaction(this.faction); }
    getEnemyUnits() { return this.getUnitsByFaction(FACTION.SOVIET); }

    getTile(x, y) {
        if (x < 0 || x >= CONFIG.MAP.WIDTH || y < 0 || y >= CONFIG.MAP.HEIGHT) return null;
        return this.tiles[y][x];
    }

    getNeighbors(x, y) {
        const neighbors = [];
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
        for (const [dx, dy] of dirs) {
            const tile = this.getTile(x + dx, y + dy);
            if (tile) neighbors.push(tile);
        }
        return neighbors;
    }

    getDistance(pos1, pos2) { return Math.abs(pos2.x - pos1.x) + Math.abs(pos2.y - pos1.y); }

    findPath(start, end, unit) {
        const cacheKey = `${start.x},${start.y}-${end.x},${end.y}-${unit.movementPoints}`;
        if (this.pathCache.has(cacheKey)) return this.pathCache.get(cacheKey);
        const openSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        const startKey = start.toString();
        openSet.add(startKey);
        gScore.set(startKey, 0);
        fScore.set(startKey, this.getDistance(start, end));
        let iterations = 0;
        const MAX_ITERATIONS = 10000;
        while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            let current = null;
            let lowestF = Infinity;
            for (const key of openSet) {
                const f = fScore.get(key) || Infinity;
                if (f < lowestF) { lowestF = f; current = key; }
            }
            if (current === end.toString()) {
                const path = this.reconstructPath(cameFrom, current);
                this.pathCache.set(cacheKey, path);
                return path;
            }
            openSet.delete(current);
            const currentPos = Position.fromString(current);
            for (const neighbor of this.getNeighbors(currentPos.x, currentPos.y)) {
                const nKey = neighbor.position.toString();
                const enemyUnit = this.getUnitAt(neighbor.position.x, neighbor.position.y);
                if (enemyUnit && enemyUnit.faction !== unit.faction) continue;
                const moveCost = this.calculateMoveCost(currentPos, neighbor.position, unit);
                if (moveCost === Infinity) continue;
                const tentativeG = (gScore.get(current) || 0) + moveCost;
                if (tentativeG < (gScore.get(nKey) || Infinity)) {
                    cameFrom.set(nKey, current);
                    gScore.set(nKey, tentativeG);
                    fScore.set(nKey, tentativeG + this.getDistance(neighbor.position, end));
                    openSet.add(nKey);
                }
            }
        }
        const path = [];
        this.pathCache.set(cacheKey, path);
        return path;
    }

    reconstructPath(cameFrom, current) {
        const path = [];
        while (current) {
            path.unshift(Position.fromString(current));
            current = cameFrom.get(current);
        }
        return path;
    }

    calculateMoveCost(from, to, unit) {
        const tile = this.getTile(to.x, to.y);
        if (!tile) return Infinity;
        let cost = tile.getMovementCost();
        if ([UNIT_TYPE.PANZER_IV, UNIT_TYPE.TIGER, UNIT_TYPE.KING_TIGER, UNIT_TYPE.STUG,
             UNIT_TYPE.JAGDPANTHER, UNIT_TYPE.STURMTIGER].includes(unit.type)) {
            if (tile.terrain === TERRAIN_TYPE.FOREST) cost *= 1.5;
            if (tile.terrain === TERRAIN_TYPE.MARSH) cost *= 2;
        }
        if (tile.terrain === TERRAIN_TYPE.MOUNTAIN) return Infinity;
        return cost;
    }

    isInRange(unit, targetPos) {
        return unit.position.manhattanDistance(targetPos) <= unit.range;
    }

    canSee(unit, targetPos) {
        const dist = unit.position.distanceTo(targetPos);
        const tile = this.getTile(unit.position.x, unit.position.y);
        let los = tile ? tile.getLineOfSight() : 3;
        if (unit.type === UNIT_TYPE.RECON) los *= 1.5;
        const weatherEffect = CONFIG.WEATHER.EFFECTS[this.weatherState] || CONFIG.WEATHER.EFFECTS.klar;
        los *= weatherEffect.vision;
        const dayEffect = CONFIG.DAYNIGHT.EFFECTS[this.dayPhase] || CONFIG.DAYNIGHT.EFFECTS.day;
        los *= dayEffect.vision;
        return dist <= los;
    }

    moveUnit(unit, targetPos, path = null) {
        if (!unit.canMove()) return false;
        if (unit.position.equals(targetPos)) return false;
        if (!path) path = this.findPath(unit.position, targetPos, unit);
        if (path.length < 2) return false;
        let totalCost = 0;
        for (let i = 1; i < path.length; i++) {
            totalCost += this.calculateMoveCost(path[i-1], path[i], unit);
        }
        if (totalCost > unit.movementPoints) return false;
        const oldPos = unit.position.clone();
        unit.position = path[path.length - 1];
        unit.movementPoints -= totalCost;
        unit.hasMoved = true;
        unit.hasActed = true;
        unit.fuel -= Math.floor(totalCost * 5);
        unit.camoActive = false;
        unit.overwatchActive = false;
        if (unit.entrenched && totalCost > 0) {
            unit.entrenched = false;
            unit.entrenchmentTurns = 0;
        }
        this.pathCache.clear();
        this.calculateSupplyLines();
        this.log(`${unit.name} به موقعیت (${unit.position.x},${unit.position.y}) حرکت کرد.`, 'move');
        eventBus.emit(GAME_EVENTS.UNIT_MOVED, { unit, from: oldPos, to: unit.position });
        return true;
    }

    attackUnit(attacker, defender) {
        if (!attacker.canAttack()) return null;
        if (!this.isInRange(attacker, defender.position)) return null;
        const result = this.calculateCombat(attacker, defender);
        attacker.hasAttacked = true;
        attacker.hasActed = true;
        attacker.ammo -= 20;
        const destroyed = defender.takeDamage(result.damageToDefender);
        if (result.counterDamage > 0) attacker.takeDamage(result.counterDamage);
        this.log(`${attacker.name} به ${defender.name} حمله کرد! خسارت: ${result.damageToDefender}`, 'combat');
        if (destroyed) {
            attacker.kills++;
            attacker.promote();
            this.heroesGallery.push(defender.toJSON());
            this.log(`${defender.name} نابود شد. آخرین کلمات: "${defender.lastWords}"`, 'combat');
            this.removeUnit(defender.id);
        }
        if (attacker.health <= 0) {
            this.heroesGallery.push(attacker.toJSON());
            this.log(`${attacker.name} کشته شد. "${attacker.lastWords}"`, 'combat');
            this.removeUnit(attacker.id);
        }
        eventBus.emit(GAME_EVENTS.COMBAT_OCCURRED, { attacker, defender, result });
        return result;
    }

    calculateCombat(attacker, defender) {
        const atkPower = attacker.getEffectiveAttack();
        const defPower = defender.getEffectiveDefense();
        const tile = this.getTile(defender.position.x, defender.position.y);
        const terrainBonus = tile ? tile.getDefenseBonus() : 0;
        const diffMod = this.difficultyManager.hiddenModifiers;
        let randomFactor = 0.85 + Math.random() * 0.3;
        randomFactor *= diffMod.playerLuck;
        let damageToDefender = Math.floor((atkPower - defPower * 0.5 - terrainBonus) * randomFactor * diffMod.enemyAccuracy);
        damageToDefender = Math.max(1, damageToDefender);
        let counterDamage = 0;
        if (defender.range >= defender.position.manhattanDistance(attacker.position)) {
            const counterRandom = 0.8 + Math.random() * 0.4;
            counterDamage = Math.floor((defPower - atkPower * 0.3) * counterRandom);
            counterDamage = Math.max(0, counterDamage);
        }
        return { damageToDefender, counterDamage, terrainBonus, randomFactor };
    }

    removeUnit(id) {
        const index = this.units.findIndex(u => u.id === id);
        if (index !== -1) this.units.splice(index, 1);
    }

    fortifyUnit(unit) {
        if (unit.hasActed) return false;
        unit.order = ORDER_TYPE.FORTIFY;
        unit.entrenched = true;
        unit.entrenchmentTurns++;
        unit.hasActed = true;
        this.log(`${unit.name} شروع به سنگربندی کرد.`, 'move');
        return true;
    }

    setOverwatch(unit) {
        if (unit.hasActed) return false;
        unit.overwatchActive = true;
        unit.hasActed = true;
        unit.order = ORDER_TYPE.OVERWATCH;
        this.log(`${unit.name} در حالت دیدبانی قرار گرفت.`, 'system');
        return true;
    }

    setAmbush(unit) {
        if (unit.hasActed) return false;
        unit.camoActive = true;
        unit.order = ORDER_TYPE.AMBUSH;
        unit.hasActed = true;
        this.log(`${unit.name} در کمین نشست.`, 'system');
        return true;
    }

    repairUnit(unit, engineerUnit) {
        if (!engineerUnit || engineerUnit.type !== UNIT_TYPE.ENGINEER) return false;
        if (engineerUnit.hasActed) return false;
        if (unit.health >= unit.maxHealth) return false;
        const healAmount = 25 + engineerUnit.level * 5;
        unit.heal(healAmount);
        engineerUnit.hasActed = true;
        this.log(`${engineerUnit.name} ${unit.name} را تعمیر کرد (+${healAmount} سلامتی).`, 'system');
        return true;
    }

    resupplyUnit(unit, supplyUnit) {
        if (!supplyUnit || supplyUnit.type !== UNIT_TYPE.SUPPLY) return false;
        if (supplyUnit.hasActed) return false;
        unit.ammo = unit.maxAmmo;
        unit.fuel = unit.maxFuel;
        supplyUnit.hasActed = true;
        this.log(`${supplyUnit.name} ${unit.name} را بازتأمین کرد.`, 'system');
        return true;
    }

    layMines(engineerUnit) {
        if (!engineerUnit || engineerUnit.type !== UNIT_TYPE.ENGINEER) return false;
        if (engineerUnit.hasActed) return false;
        const tile = this.getTile(engineerUnit.position.x, engineerUnit.position.y);
        if (!tile) return false;
        tile.terrain = TERRAIN_TYPE.MINEFIELD;
        engineerUnit.hasActed = true;
        this.log(`${engineerUnit.name} میدان مین کار گذاشت.`, 'system');
        return true;
    }

    clearMines(engineerUnit, targetPos) {
        if (!engineerUnit || engineerUnit.type !== UNIT_TYPE.ENGINEER) return false;
        if (engineerUnit.hasActed) return false;
        const tile = this.getTile(targetPos.x, targetPos.y);
        if (!tile || tile.terrain !== TERRAIN_TYPE.MINEFIELD) return false;
        tile.terrain = TERRAIN_TYPE.PLAINS;
        engineerUnit.hasActed = true;
        this.log(`${engineerUnit.name} میدان مین را پاکسازی کرد.`, 'system');
        return true;
    }

    demolishBridge(engineerUnit, bridgePos) {
        if (!engineerUnit || engineerUnit.type !== UNIT_TYPE.ENGINEER) return false;
        if (engineerUnit.hasActed) return false;
        const tile = this.getTile(bridgePos.x, bridgePos.y);
        if (!tile || tile.terrain !== TERRAIN_TYPE.BRIDGE) return false;
        if (!this.isInRange(engineerUnit, bridgePos) && !engineerUnit.position.equals(bridgePos)) return false;
        tile.isDestroyed = true;
        engineerUnit.hasActed = true;
        this.log(`${engineerUnit.name} پل را تخریب کرد!`, 'system');
        return true;
    }

    checkMinefield(unit) {
        const tile = this.getTile(unit.position.x, unit.position.y);
        if (!tile || tile.terrain !== TERRAIN_TYPE.MINEFIELD) return false;
        if (unit.type === UNIT_TYPE.ENGINEER) return false;
        const damage = 30 + Math.floor(Math.random() * 40);
        unit.takeDamage(damage);
        this.log(`${unit.name} وارد میدان مین شد و ${damage} خسارت دید!`, 'combat');
        if (unit.health <= 0) {
            this.heroesGallery.push(unit.toJSON());
            this.removeUnit(unit.id);
        }
        return true;
    }

    triggerOverwatch(defender, movingUnit) {
        if (!defender.overwatchActive) return false;
        if (!this.isInRange(defender, movingUnit.position)) return false;
        if (!this.canSee(defender, movingUnit.position)) return false;
        const result = this.calculateCombat(defender, movingUnit);
        const destroyed = movingUnit.takeDamage(result.damageToDefender);
        defender.overwatchActive = false;
        this.log(`${defender.name} در حالت دیدبانی به ${movingUnit.name} شلیک کرد!`, 'combat');
        if (destroyed) {
            defender.kills++;
            this.heroesGallery.push(movingUnit.toJSON());
            this.removeUnit(movingUnit.id);
        }
        return true;
    }

    checkEncirclement(unit) {
        if (unit.faction !== FACTION.SOVIET) return false;
        const neighbors = this.getNeighbors(unit.position.x, unit.position.y);
        let blockedCount = 0;
        for (const neighbor of neighbors) {
            const tileUnit = this.getUnitAt(neighbor.position.x, neighbor.position.y);
            if (tileUnit && tileUnit.faction === FACTION.WEHRMACHT) blockedCount++;
            if (neighbor.terrain === TERRAIN_TYPE.MOUNTAIN) blockedCount++;
            if (neighbor.terrain === TERRAIN_TYPE.RIVER && !neighbor.isFrozen) blockedCount++;
        }
        if (blockedCount >= 6) {
            unit.morale -= 30;
            unit.isSuppressed = true;
            this.log(`${unit.name} محاصره شد و روحیه‌اش فرو ریخت!`, 'combat');
            eventBus.emit(GAME_EVENTS.ENCIRCLEMENT, { unit });
            return true;
        }
        return false;
    }

    callAirstrike(targetPos) {
        if (this.resources.rp < 100) return false;
        this.resources.rp -= 100;
        let totalDamage = 0;
        const targets = this.getNeighbors(targetPos.x, targetPos.y).map(t => t.position);
        targets.push(targetPos);
        for (const pos of targets) {
            const unit = this.getUnitAt(pos.x, pos.y);
            if (unit && unit.faction === FACTION.SOVIET) {
                const damage = 40 + Math.floor(Math.random() * 30);
                if (unit.takeDamage(damage)) {
                    this.heroesGallery.push(unit.toJSON());
                    this.removeUnit(unit.id);
                }
                totalDamage += damage;
            }
            const tile = this.getTile(pos.x, pos.y);
            if (tile && (tile.terrain === TERRAIN_TYPE.FOREST || tile.terrain === TERRAIN_TYPE.CITY || tile.terrain === TERRAIN_TYPE.FACTORY)) {
                tile.isBurning = true;
                tile.burnTimer = 4;
                this.burningTiles.push(pos.clone());
            }
        }
        this.log(`بمب‌افکن اشتوکا (${targetPos.x},${targetPos.y}) را بمباران کرد!`, 'combat');
        return true;
    }

    launchV2Rocket(targetPos) {
        if (this.resources.rp < 500) return false;
        this.resources.rp -= 500;
        const radius = 3;
        let totalDamage = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = targetPos.x + dx;
                const ny = targetPos.y + dy;
                if (nx < 0 || nx >= CONFIG.MAP.WIDTH || ny < 0 || ny >= CONFIG.MAP.HEIGHT) continue;
                const unit = this.getUnitAt(nx, ny);
                const dist = Math.sqrt(dx * dx + dy * dy);
                const damage = Math.floor(60 * (1 - dist / (radius + 1)));
                if (unit && unit.faction === FACTION.SOVIET && damage > 0) {
                    if (unit.takeDamage(damage)) {
                        this.heroesGallery.push(unit.toJSON());
                        this.removeUnit(unit.id);
                    }
                    totalDamage += damage;
                }
                const tile = this.getTile(nx, ny);
                if (tile) {
                    tile.isBurning = true;
                    tile.burnTimer = 6;
                    tile.damage += Math.floor(damage);
                    this.burningTiles.push(new Position(nx, ny));
                }
            }
        }
        this.log(`🚀 موشک V2 پرتاب شد! انفجار عظیم!`, 'combat');
        return true;
    }

    endTurn() {
        switch (this.phase) {
            case TURN_PHASES.PLANNING:
                this.phase = TURN_PHASES.EXECUTION;
                break;
            case TURN_PHASES.EXECUTION:
                this.phase = TURN_PHASES.ENEMY;
                this.startEnemyTurn();
                break;
            case TURN_PHASES.ENEMY:
                this.phase = TURN_PHASES.RESOLUTION;
                this.resolveTurn();
                break;
            case TURN_PHASES.RESOLUTION:
                this.phase = TURN_PHASES.PLANNING;
                this.currentTurn++;
                this.startNewTurn();
                break;
        }
        eventBus.emit(GAME_EVENTS.PHASE_CHANGED, { phase: this.phase });
    }

    startEnemyTurn() {
        this.log('نوبت دشمن...', 'system');
        eventBus.emit(GAME_EVENTS.PHASE_CHANGED, { phase: TURN_PHASES.ENEMY });
    }

    resolveTurn() {
        this.resources.rp += CONFIG.RESOURCES.RP_PER_TURN;
        this.resources.fuel += CONFIG.RESOURCES.FUEL_PER_TURN;
        this.resources.ammo += CONFIG.RESOURCES.AMMO_PER_TURN;
        this.calculateSupplyLines();
        this.updateBurningTiles();
        this.updateArmoredTrain();
        this.calculateVictoryPoints();
        this.updateWeather();
        this.updateDayNight();
        this.updateCivilians();
        const myHQ = this.getMyUnits().find(u => u.type === UNIT_TYPE.HQ);
        const enemyHQ = this.getEnemyUnits().find(u => u.type === UNIT_TYPE.HQ);
        if (!myHQ || myHQ.health <= 0) { this.gameOver(false, 'قرارگاه فرماندهی نابود شد!'); return; }
        if (!enemyHQ || enemyHQ.health <= 0) { this.gameOver(true, 'قرارگاه دشمن نابود شد!'); return; }
        if (this.victoryPoints >= this.maxVictoryPoints) { this.gameOver(true, 'پیروزی قاطع!'); return; }
        if (this.currentTurn >= CONFIG.GAME.MAX_TURNS) { this.gameOver(false, 'زمان به پایان رسید...'); return; }
        if (this.difficultyManager.shouldTriggerMercy()) {
            const mercy = this.difficultyManager.getMercyEvent();
            this.log(`[رحمت] ${mercy.description}`, 'system');
            mercy.effect(this);
        }
        eventBus.emit(GAME_EVENTS.PHASE_CHANGED, { phase: TURN_PHASES.RESOLUTION });
    }

    startNewTurn() {
        for (const unit of this.units) {
            if (unit.health > 0) unit.resetTurn();
        }
        this.log(`--- نوبت ${this.currentTurn} آغاز شد ---`, 'system');
        eventBus.emit(GAME_EVENTS.NEW_TURN, { turn: this.currentTurn });
    }

    updateBurningTiles() {
        this.burningTiles = this.burningTiles.filter(pos => {
            const tile = this.getTile(pos.x, pos.y);
            if (!tile) return false;
            tile.burnTimer--;
            if (tile.burnTimer <= 0) { tile.isBurning = false; return false; }
            if (Math.random() < 0.3) {
                for (const n of this.getNeighbors(pos.x, pos.y)) {
                    if ((n.terrain === TERRAIN_TYPE.FOREST || n.terrain === TERRAIN_TYPE.CITY || n.terrain === TERRAIN_TYPE.FACTORY) && !n.isBurning) {
                        n.isBurning = true;
                        n.burnTimer = 3 + Math.floor(Math.random() * 4);
                        this.burningTiles.push(n.position.clone());
                    }
                }
            }
            return true;
        });
    }

    updateArmoredTrain() {
        if (!this.armoredTrain || !this.armoredTrain.active) return;
        if (this.trainRoute.length < 2) return;
        this.armoredTrain.routeIndex = (this.armoredTrain.routeIndex + 1) % this.trainRoute.length;
        this.armoredTrain.position = this.trainRoute[this.armoredTrain.routeIndex].clone();
    }

    updateWeather() {
        this.weatherTimer++;
        if (this.weatherTimer >= CONFIG.WEATHER.CHANGE_INTERVAL) {
            this.weatherTimer = 0;
            const types = CONFIG.WEATHER.TYPES;
            const newWeather = types[Math.floor(Math.random() * types.length)];
            if (newWeather !== this.weatherState) {
                this.weatherState = newWeather;
                if (newWeather === 'schnee') this.freezeRivers();
                else this.unfreezeRivers();
                this.log(`آب‌وهوا: ${CONFIG.WEATHER.EFFECTS[newWeather].name}`, 'system');
                eventBus.emit(GAME_EVENTS.WEATHER_CHANGED, { weather: newWeather });
            }
        }
    }

    freezeRivers() {
        this.frozenRivers = [];
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                if (this.tiles[y][x].terrain === TERRAIN_TYPE.RIVER) {
                    this.tiles[y][x].isFrozen = true;
                    this.frozenRivers.push(new Position(x, y));
                }
            }
        }
    }

    unfreezeRivers() {
        for (const pos of this.frozenRivers) {
            const tile = this.getTile(pos.x, pos.y);
            if (tile) tile.isFrozen = false;
        }
        this.frozenRivers = [];
    }

    updateDayNight() {
        this.dayTimer++;
        const phases = ['dawn', 'day', 'dusk', 'night'];
        const idx = Math.floor((this.dayTimer % 8) / 2);
        const newPhase = phases[idx];
        if (newPhase !== this.dayPhase) {
            this.dayPhase = newPhase;
            eventBus.emit(GAME_EVENTS.DAYNIGHT_CHANGED, { phase: newPhase });
        }
    }

    updateCivilians() {
        this.civiliansOnMap = this.civiliansOnMap.filter(c => {
            if (!c.alive) return false;
            const tile = this.getTile(c.x, c.y);
            if (tile && tile.isBurning) c.alive = false;
            return c.alive;
        });
    }

    gameOver(isVictory, message) {
        this.isGameOver = true;
        this.log(message, 'system');
        eventBus.emit(GAME_EVENTS.GAME_OVER, { victory: isVictory, message, turn: this.currentTurn });
    }

    calculateSupplyLines() {
        this.supplyLines = [];
        const hq = this.getMyUnits().find(u => u.type === UNIT_TYPE.HQ);
        if (!hq) return;
        for (const unit of this.getMyUnits()) {
            const dist = unit.position.distanceTo(hq.position);
            const supply = Math.max(0, 100 - dist * 2);
            this.supplyLines.push({ unit, supply });
            const tile = this.getTile(unit.position.x, unit.position.y);
            if (tile) tile.supplyLevel = supply;
        }
    }

    calculateVictoryPoints() {
        let vp = 0;
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const tile = this.tiles[y][x];
                const unit = this.getUnitAt(x, y);
                if (unit && unit.faction === this.faction && tile.victoryPoint > 0) {
                    vp += tile.victoryPoint;
                }
            }
        }
        this.victoryPoints = vp;
        return vp;
    }

    log(message, type = 'system') {
        this.logs.push({ message, type, turn: this.currentTurn, timestamp: Date.now() });
        if (this.logs.length > CONFIG.GAME.LOG_MAX_ENTRIES) this.logs.shift();
        eventBus.emit(GAME_EVENTS.LOG_ADDED, { message, type });
    }

    toSaveData() {
        return {
            version: CONFIG.VERSION,
            currentTurn: this.currentTurn,
            phase: this.phase,
            resources: { ...this.resources },
            victoryPoints: this.victoryPoints,
            weatherState: this.weatherState,
            dayPhase: this.dayPhase,
            isGameOver: this.isGameOver,
            units: this.units.map(u => u.toJSON()),
            tiles: this.tiles.map(row => row.map(t => ({
                terrain: t.terrain, control: t.control, damage: t.damage,
                victoryPoint: t.victoryPoint, isFrozen: t.isFrozen,
                isBurning: t.isBurning, isDestroyed: t.isDestroyed
            }))),
            heroesGallery: this.heroesGallery,
            logs: this.logs.slice(-40)
        };
    }

    loadSaveData(data) {
        this.currentTurn = data.currentTurn || 1;
        this.phase = data.phase || TURN_PHASES.PLANNING;
        this.resources = data.resources || { rp: 500, fuel: 300, ammo: 200 };
        this.victoryPoints = data.victoryPoints || 0;
        this.weatherState = data.weatherState || 'klar';
        this.dayPhase = data.dayPhase || 'day';
        this.isGameOver = data.isGameOver || false;
        this.logs = data.logs || [];
        this.heroesGallery = data.heroesGallery || [];
        this.units = data.units.map(u => Unit.fromJSON(u));
        this.unitIdCounter = Math.max(...this.units.map(u => parseInt(u.id.split('_')[1]) || 0)) + 1;
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                if (data.tiles[y] && data.tiles[y][x]) {
                    Object.assign(this.tiles[y][x], data.tiles[y][x]);
                }
            }
        }
        this.calculateSupplyLines();
        eventBus.emit(GAME_EVENTS.GAME_LOADED, data);
    }
}
