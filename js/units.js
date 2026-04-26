// sturmglanz/js/units.js
// یگان‌ها - ۲۵ نوع، کارخانه، آمار، ارتقا، آرایش، تجربه، تدارکات،
// توانایی‌های ویژه، مدال، زخمی، بیمارستان، فرار، PTSD، رابطه، اعتماد، قول، نامه
'use strict';

// ============ آمار کامل ۲۵ یگان با تمام جزئیات ============
const UNIT_STATS = {
    [UNIT_TYPE.INFANTRY]: {
        name: 'پیاده‌نظام',
        attack: 12, defense: 10, movement: 4, range: 1,
        health: 100, ammo: 120, fuel: 999, canBlitz: false, cost: 50,
        description: 'ستون فقرات ارتش. سرباز وظیفه با تفنگ Mauser Kar98k.',
        abilities: ['fortify', 'overwatch', 'dig_trench'],
        upgrades: ['veteran_infantry', 'assault_infantry'],
        weaponName: 'Mauser Kar98k',
        armorName: 'Stahlhelm M35'
    },
    [UNIT_TYPE.PANZERGRENADIER]: {
        name: 'پانتسرگرنادیر',
        attack: 18, defense: 14, movement: 5, range: 1,
        health: 110, ammo: 100, fuel: 200, canBlitz: false, cost: 80,
        description: 'پیاده‌نظام مکانیزه با نفربر زرهی SdKfz 251.',
        abilities: ['fortify', 'overwatch', 'rapid_deploy', 'mg_support'],
        upgrades: ['elite_grenadier', 'mechanized_assault'],
        weaponName: 'StG 44 + MG42',
        armorName: 'SdKfz 251 Hanomag'
    },
    [UNIT_TYPE.PANZER_IV]: {
        name: 'پانتسر ۴',
        attack: 25, defense: 18, movement: 6, range: 2,
        health: 130, ammo: 60, fuel: 150, canBlitz: true, cost: 150,
        description: 'تانک متوسط اصلی ورماخت. تعادل قدرت و سرعت.',
        abilities: ['blitz', 'overwatch', 'smoke_launcher'],
        upgrades: ['armor_skirt', 'long_barrel'],
        weaponName: '7.5cm KwK 40 L/48',
        armorName: '80mm frontal'
    },
    [UNIT_TYPE.TIGER]: {
        name: 'تایگر',
        attack: 35, defense: 28, movement: 4, range: 3,
        health: 180, ammo: 40, fuel: 100, canBlitz: true, cost: 250,
        description: 'تانک سنگین افسانه‌ای. کابوس تانک‌های متفقین.',
        abilities: ['blitz', 'terror', 'overwatch', 'heavy_armor'],
        upgrades: ['ace_crew', 'reinforced_armor'],
        weaponName: '8.8cm KwK 36 L/56',
        armorName: '100mm frontal'
    },
    [UNIT_TYPE.KING_TIGER]: {
        name: 'کینگ تایگر',
        attack: 42, defense: 34, movement: 3, range: 3,
        health: 200, ammo: 35, fuel: 80, canBlitz: true, cost: 350,
        description: 'سلطان میدان نبرد. زره شیب‌دار و توپ ۸۸mm.',
        abilities: ['blitz', 'terror', 'overwatch', 'unstoppable', 'sniper_gun'],
        upgrades: ['royal_crew', 'improved_engine'],
        weaponName: '8.8cm KwK 43 L/71',
        armorName: '150mm sloped'
    },
    [UNIT_TYPE.ARTILLERY]: {
        name: 'توپخانه ۱۰۵mm',
        attack: 30, defense: 5, movement: 3, range: 6,
        health: 70, ammo: 30, fuel: 80, canBlitz: false, cost: 120,
        description: 'پشتیبانی آتش دوربرد. علیه استحکامات و تجمع دشمن.',
        abilities: ['barrage', 'smoke_shell', 'counter_battery'],
        upgrades: ['forward_observer', 'heavy_shells'],
        weaponName: '10.5cm leFH 18',
        armorName: 'Light shield'
    },
    [UNIT_TYPE.FLAK_88]: {
        name: 'فلاک ۸۸',
        attack: 28, defense: 12, movement: 2, range: 4,
        health: 90, ammo: 50, fuel: 60, canBlitz: false, cost: 100,
        description: 'توپ ضدهوایی مرگبار. در نقش ضدتانک هم عالی.',
        abilities: ['anti_air', 'anti_tank_mode', 'overwatch'],
        upgrades: ['rapid_fire', 'armor_piercing'],
        weaponName: '8.8cm Flak 37',
        armorName: 'Gun shield'
    },
    [UNIT_TYPE.RECON]: {
        name: 'شناسایی',
        attack: 8, defense: 6, movement: 8, range: 1,
        health: 60, ammo: 80, fuel: 250, canBlitz: false, cost: 40,
        description: 'چشم‌های ارتش. سرعت بالا و دید گسترده.',
        abilities: ['scout', 'evade', 'spot_mines', 'call_artillery'],
        upgrades: ['extended_range', 'camo_net'],
        weaponName: 'MP40 + Binoculars',
        armorName: 'Light vehicle'
    },
    [UNIT_TYPE.ENGINEER]: {
        name: 'مهندس رزمی',
        attack: 10, defense: 12, movement: 4, range: 1,
        health: 90, ammo: 90, fuel: 150, canBlitz: false, cost: 60,
        description: 'متخصص ساخت و تخریب. مین‌گذاری و تعمیر پل.',
        abilities: ['lay_mines', 'clear_mines', 'repair', 'demolish', 'build_bridge', 'build_bunker'],
        upgrades: ['combat_engineer', 'demolition_expert'],
        weaponName: 'Kar98k + Satchel charges',
        armorName: 'Combat gear'
    },
    [UNIT_TYPE.HQ]: {
        name: 'قرارگاه فرماندهی',
        attack: 5, defense: 25, movement: 0, range: 0,
        health: 200, ammo: 200, fuel: 999, canBlitz: false, cost: 500,
        description: 'قلب فرماندهی. محافظت از آن حیاتی است.',
        abilities: ['command_aura', 'call_reinforcements', 'radio_silence', 'supply_drop'],
        upgrades: ['fortified_hq', 'command_bunker'],
        weaponName: 'Command staff',
        armorName: 'Fortified position'
    },
    [UNIT_TYPE.SUPPLY]: {
        name: 'کامیون تدارکات',
        attack: 2, defense: 4, movement: 5, range: 0,
        health: 60, ammo: 999, fuel: 999, canBlitz: false, cost: 30,
        description: 'خون لجستیک ارتش. مهمات و سوخت می‌رساند.',
        abilities: ['resupply', 'repair_light', 'evacuate_wounded'],
        upgrades: ['armored_supply', 'extended_cargo'],
        weaponName: 'None',
        armorName: 'Light truck'
    },
    [UNIT_TYPE.SNIPER]: {
        name: 'تک‌تیرانداز',
        attack: 20, defense: 3, movement: 3, range: 5,
        health: 40, ammo: 30, fuel: 999, canBlitz: false, cost: 70,
        description: 'شکارچی خاموش. حذف اهداف با ارزش از دور.',
        abilities: ['headshot', 'camo', 'spot', 'counter_sniper'],
        upgrades: ['marksman', 'silent_killer'],
        weaponName: 'Scoped Kar98k',
        armorName: 'Ghillie suit'
    },
    [UNIT_TYPE.MORTAR]: {
        name: 'خمپاره‌انداز ۸۱mm',
        attack: 22, defense: 4, movement: 3, range: 4,
        health: 50, ammo: 25, fuel: 80, canBlitz: false, cost: 90,
        description: 'آتش غیرمستقیم. عالی علیه پیاده‌نظام در سنگر.',
        abilities: ['indirect_fire', 'smoke_round', 'illumination'],
        upgrades: ['heavy_mortar', 'rapid_deploy'],
        weaponName: '8cm Granatwerfer 34',
        armorName: 'Light position'
    },
    [UNIT_TYPE.NEBELWERFER]: {
        name: 'نبل‌ورفر ۴۱',
        attack: 32, defense: 3, movement: 2, range: 5,
        health: 55, ammo: 20, fuel: 60, canBlitz: false, cost: 130,
        description: 'راکت‌انداز چندلوله. آتش سنگین و ترسناک.',
        abilities: ['rocket_barrage', 'fear_effect', 'area_denial'],
        upgrades: ['incendiary_warhead', 'improved_accuracy'],
        weaponName: '15cm Nebelwerfer 41',
        armorName: 'Exposed position'
    },
    [UNIT_TYPE.PANZERFAUST]: {
        name: 'پانتسرفاوست',
        attack: 30, defense: 6, movement: 3, range: 1,
        health: 50, ammo: 10, fuel: 999, canBlitz: false, cost: 55,
        description: 'سلاح یکبار مصرف ضدتانک. ارزان و مرگبار.',
        abilities: ['tank_hunter', 'ambush_bonus', 'sacrifice_shot'],
        upgrades: ['panzerfaust_100', 'shaped_charge'],
        weaponName: 'Panzerfaust 60',
        armorName: 'None'
    },
    [UNIT_TYPE.STUG]: {
        name: 'اشتوگ ۳',
        attack: 28, defense: 22, movement: 5, range: 2,
        health: 120, ammo: 45, fuel: 120, canBlitz: false, cost: 180,
        description: 'توپ تهاجمی بی‌برجک. قاتل تانک کم‌نفوذ.',
        abilities: ['ambush', 'overwatch', 'low_profile'],
        upgrades: ['stug_ace', 'reinforced_front'],
        weaponName: '7.5cm StuK 40 L/48',
        armorName: '80mm frontal'
    },
    [UNIT_TYPE.JAGDPANTHER]: {
        name: 'یاگدپانتر',
        attack: 38, defense: 30, movement: 4, range: 3,
        health: 160, ammo: 35, fuel: 100, canBlitz: false, cost: 280,
        description: 'شکارچی تانک. توپ ۸۸mm روی شاسی پانتر.',
        abilities: ['tank_destroyer', 'camo', 'overwatch', 'long_range'],
        upgrades: ['ace_hunter', 'sloped_armor'],
        weaponName: '8.8cm Pak 43 L/71',
        armorName: '80mm sloped'
    },
    [UNIT_TYPE.WIRBELWIND]: {
        name: 'ویربلویند',
        attack: 20, defense: 14, movement: 5, range: 3,
        health: 100, ammo: 80, fuel: 130, canBlitz: false, cost: 160,
        description: 'ضدهوایی چهارلوله. مرگ پرنده‌ها و پیاده‌نظام.',
        abilities: ['anti_air_aura', 'suppression_fire', 'rapid_spray'],
        upgrades: ['improved_traverse', 'armored_turret'],
        weaponName: '2cm Flakvierling 38',
        armorName: 'Open turret'
    },
    [UNIT_TYPE.KUBELWAGEN]: {
        name: 'کوبل‌واگن',
        attack: 4, defense: 3, movement: 9, range: 1,
        health: 40, ammo: 40, fuel: 300, canBlitz: false, cost: 25,
        description: 'خودرو سبک شناسایی. فوق‌العاده سریع.',
        abilities: ['rapid_movement', 'evade', 'scout_deep'],
        upgrades: ['armed_kubel', 'extended_fuel'],
        weaponName: 'MG34 (optional)',
        armorName: 'None'
    },
    [UNIT_TYPE.SDKFZ_251]: {
        name: 'نفربر ۲۵۱',
        attack: 14, defense: 16, movement: 6, range: 1,
        health: 100, ammo: 70, fuel: 180, canBlitz: false, cost: 100,
        description: 'نفربر زرهی. حمل پیاده‌نظام به خط مقدم.',
        abilities: ['transport', 'mg_support', 'deploy_troops'],
        upgrades: ['armored_transport', 'assault_variant'],
        weaponName: 'MG42 mounted',
        armorName: '14.5mm frontal'
    },
    [UNIT_TYPE.VOLKSSTURM]: {
        name: 'فولکس‌اشتورم',
        attack: 6, defense: 5, movement: 3, range: 1,
        health: 50, ammo: 30, fuel: 999, canBlitz: false, cost: 10,
        description: 'پیرمردان و نوجوانان مسلح. دفاع ناامیدانه.',
        abilities: ['last_stand', 'expendable', 'desperate_charge'],
        upgrades: [],
        weaponName: 'Panzerfaust + random',
        armorName: 'Civilian clothes'
    },
    [UNIT_TYPE.HITLERJUGEND]: {
        name: 'جوانان هیتلری',
        attack: 8, defense: 4, movement: 4, range: 1,
        health: 40, ammo: 25, fuel: 999, canBlitz: false, cost: 5,
        description: 'کودکان سرباز. شجاع اما شکننده.',
        abilities: ['fanatic', 'expendable', 'child_courage'],
        upgrades: [],
        weaponName: 'Kar98k',
        armorName: 'Hitler Youth uniform'
    },
    [UNIT_TYPE.BRANDENBURGER]: {
        name: 'براندنبورگر',
        attack: 22, defense: 10, movement: 6, range: 1,
        health: 70, ammo: 40, fuel: 200, canBlitz: false, cost: 140,
        description: 'نیروی ویژه کماندویی. عملیات پشت خط دشمن.',
        abilities: ['infiltrate', 'sabotage', 'disguise', 'assassinate'],
        upgrades: ['elite_commando', 'explosive_expert'],
        weaponName: 'Silenced MP40',
        armorName: 'Disguise uniform'
    },
    [UNIT_TYPE.FELDGENDARMERIE]: {
        name: 'پلیس نظامی',
        attack: 10, defense: 8, movement: 5, range: 1,
        health: 60, ammo: 50, fuel: 150, canBlitz: false, cost: 35,
        description: 'نظم و انضباط. جلوگیری از فرار سربازان.',
        abilities: ['prevent_desertion', 'morale_boost', 'execute_coward', 'rally_troops'],
        upgrades: [],
        weaponName: 'MP40 + sidearm',
        armorName: 'Military police gorget'
    },
    [UNIT_TYPE.STURMTIGER]: {
        name: 'اشتورم‌تایگر',
        attack: 50, defense: 35, movement: 2, range: 2,
        health: 220, ammo: 15, fuel: 60, canBlitz: false, cost: 400,
        description: 'هیولای شهری. راکت ۳۸۰mm ساختمان‌ها را ویران می‌کند.',
        abilities: ['demolish_building', 'terror', 'shockwave', 'urban_destroyer'],
        upgrades: ['mega_rocket', 'urban_destroyer'],
        weaponName: '38cm RW 61 rocket launcher',
        armorName: '150mm frontal + 82mm side'
    }
};

// ============ کارخانه ساخت یگان ============
class UnitFactory {
    static createUnit(type, faction, position, gameState) {
        const stats = UNIT_STATS[type];
        if (!stats) return null;
        if (gameState.resources.rp < stats.cost) {
            gameState.log(`منابع کافی برای ساخت ${stats.name} نیست! (نیاز: ${stats.cost} RP)`, 'system');
            return null;
        }
        const unit = gameState.addUnit(type, faction, position.x, position.y);
        if (unit) {
            gameState.resources.rp -= stats.cost;
            gameState.log(`${stats.name} جدید در (${position.x},${position.y}) ساخته شد. (-${stats.cost} RP)`, 'system');
            if (type === UNIT_TYPE.HITLERJUGEND) unit.age = 14 + Math.floor(Math.random() * 4);
            if (type === UNIT_TYPE.VOLKSSTURM) unit.age = 45 + Math.floor(Math.random() * 25);
            unit.abilities = [...(stats.abilities || [])];
            unit.availableUpgrades = [...(stats.upgrades || [])];
            unit.appliedUpgrades = [];
        }
        return unit;
    }

    static getAvailableUnits(gameState) {
        const available = [];
        for (const [type, stats] of Object.entries(UNIT_STATS)) {
            available.push({
                type, name: stats.name, cost: stats.cost,
                attack: stats.attack, defense: stats.defense,
                movement: stats.movement, range: stats.range || 1,
                description: stats.description, abilities: stats.abilities || [],
                canAfford: gameState.resources.rp >= stats.cost
            });
        }
        return available;
    }

    static getBuildablePositions(gameState) {
        const positions = [];
        const myHQ = gameState.getMyUnits().find(u => u.type === UNIT_TYPE.HQ);
        if (!myHQ) return positions;
        for (const neighbor of gameState.getNeighbors(myHQ.position.x, myHQ.position.y)) {
            const existingUnit = gameState.getUnitAt(neighbor.position.x, neighbor.position.y);
            if (!existingUnit) {
                const tile = gameState.getTile(neighbor.position.x, neighbor.position.y);
                if (tile && tile.terrain !== TERRAIN_TYPE.MOUNTAIN && tile.terrain !== TERRAIN_TYPE.RIVER) {
                    positions.push(neighbor.position);
                }
            }
        }
        return positions.slice(0, 12);
    }
}

// ============ سیستم تجربه و ارتقا ============
class ExperienceSystem {
    static XP_PER_KILL = 50;
    static XP_PER_DAMAGE = 10;
    static XP_PER_TURN_SURVIVED = 5;
    static XP_FOR_SPECIAL_ACTION = 25;
    static LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000];

    static getLevel(xp) {
        for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (xp >= this.LEVEL_THRESHOLDS[i]) return i + 1;
        }
        return 1;
    }

    static getLevelTitle(level) {
        const titles = { 1: 'سرباز وظیفه', 2: 'سرباز با تجربه', 3: 'گروهبان', 4: 'کهنه‌سرباز', 5: 'قهرمان', 6: 'اسطوره' };
        return titles[level] || 'سرباز';
    }

    static getXpToNextLevel(unit) {
        const nextLevel = unit.level + 1;
        if (nextLevel > this.LEVEL_THRESHOLDS.length) return Infinity;
        return this.LEVEL_THRESHOLDS[nextLevel - 1] - unit.experience;
    }

    static addXP(unit, amount) {
        unit.experience += amount;
        const newLevel = this.getLevel(unit.experience);
        if (newLevel > unit.level) {
            unit.level = newLevel;
            unit.attackPower += 2;
            unit.defensePower += 2;
            unit.maxHealth += 5;
            unit.health = Math.min(unit.maxHealth, unit.health + 5);
            return true;
        }
        return false;
    }

    static applyUpgrade(unit, upgradeName) {
        const stats = UNIT_STATS[unit.type];
        if (!stats || !stats.upgrades.includes(upgradeName)) return false;
        if (unit.appliedUpgrades.includes(upgradeName)) return false;
        if (unit.level < 3) return false;
        unit.appliedUpgrades.push(upgradeName);
        const upgradeEffects = {
            'veteran_infantry': { attack: 3, defense: 2 },
            'assault_infantry': { attack: 5, movement: 1 },
            'armor_skirt': { defense: 4 },
            'long_barrel': { attack: 4, range: 1 },
            'ace_crew': { attack: 3, defense: 3, movement: 1 },
            'reinforced_armor': { defense: 6 },
            'marksman': { attack: 5, range: 1 },
            'silent_killer': { attack: 3 },
            'combat_engineer': { attack: 4, defense: 3 },
            'demolition_expert': { attack: 3 }
        };
        const effects = upgradeEffects[upgradeName] || { attack: 2, defense: 2 };
        if (effects.attack) unit.attackPower += effects.attack;
        if (effects.defense) unit.defensePower += effects.defense;
        if (effects.movement) unit.maxMovementPoints += effects.movement;
        if (effects.range) unit.range += effects.range;
        return true;
    }
}

// ============ مدیریت آرایش نظامی ============
class Formation {
    constructor(name, units = []) {
        this.name = name;
        this.units = units;
        this.formationType = 'line';
        this.center = new Position(0, 0);
    }
    addUnit(unit) { if (!this.units.find(u => u.id === unit.id)) this.units.push(unit); }
    removeUnit(unitId) { this.units = this.units.filter(u => u.id !== unitId); }
    getCenter() {
        if (this.units.length === 0) return this.center;
        let sumX = 0, sumY = 0;
        for (const unit of this.units) { sumX += unit.position.x; sumY += unit.position.y; }
        this.center = new Position(Math.floor(sumX / this.units.length), Math.floor(sumY / this.units.length));
        return this.center;
    }
    getAverageHealth() {
        if (this.units.length === 0) return 0;
        return this.units.reduce((sum, u) => sum + u.health, 0) / this.units.length;
    }
    getTotalAttackPower() { return this.units.reduce((sum, u) => sum + u.getEffectiveAttack(), 0); }
    isCombatEffective() { return this.getAverageHealth() > 40 && this.units.length >= 2; }
    moveFormation(targetPos, gameState) {
        const center = this.getCenter();
        let successCount = 0;
        for (const unit of this.units) {
            const unitTarget = new Position(unit.position.x + targetPos.x - center.x, unit.position.y + targetPos.y - center.y);
            if (gameState.moveUnit(unit, unitTarget)) successCount++;
        }
        return successCount;
    }
}

// ============ سیستم تدارکات ============
class SupplySystem {
    static resupplyUnit(supplyUnit, targetUnit) {
        if (supplyUnit.type !== UNIT_TYPE.SUPPLY || supplyUnit.hasActed) return false;
        if (supplyUnit.position.manhattanDistance(targetUnit.position) > 1) return false;
        targetUnit.ammo = targetUnit.maxAmmo;
        targetUnit.fuel = targetUnit.maxFuel;
        supplyUnit.hasActed = true;
        supplyUnit.ammo -= 50;
        return true;
    }
    static checkAmmoShortage(unit) {
        if (unit.ammo <= 0) return { status: 'empty', penalty: 0.7 };
        if (unit.ammo < unit.maxAmmo * 0.25) return { status: 'low', penalty: 0.3 };
        return { status: 'ok', penalty: 0 };
    }
    static checkFuelShortage(unit) {
        if (unit.fuel <= 0) return { status: 'empty', canMove: false };
        if (unit.fuel < unit.maxFuel * 0.2) return { status: 'low', canMove: true, movementPenalty: 0.5 };
        return { status: 'ok', canMove: true, movementPenalty: 0 };
    }
}

// ============ سیستم توانایی‌های ویژه کامل ============
class AbilitySystem {
    static useAbility(unit, abilityName, gameState, target = null) {
        if (unit.hasActed && abilityName !== 'last_stand') return false;
        const abilities = {
            'fortify': () => { unit.entrenched = true; unit.entrenchmentTurns++; unit.hasActed = true; return true; },
            'overwatch': () => { unit.overwatchActive = true; unit.hasActed = true; return true; },
            'ambush': () => { unit.camoActive = true; unit.hasActed = true; return true; },
            'blitz': () => { if (unit.canMove() && unit.canAttack()) { unit.hasActed = false; return true; } return false; },
            'last_stand': () => { unit.defensePower *= 1.5; unit.morale = 100; return true; },
            'rally_troops': () => {
                const nearby = gameState.getMyUnits().filter(u => u.position.manhattanDistance(unit.position) <= 3);
                nearby.forEach(u => u.morale = Math.min(100, u.morale + 15));
                unit.hasActed = true;
                return true;
            },
            'evacuate_wounded': () => {
                const nearby = gameState.getMyUnits().filter(u => u.isWounded && u.position.manhattanDistance(unit.position) <= 1);
                nearby.forEach(u => { u.woundTurns = 0; u.isWounded = false; u.health = Math.min(u.maxHealth, u.health + 20); });
                unit.hasActed = true;
                return nearby.length > 0;
            }
        };
        if (abilities[abilityName]) return abilities[abilityName]();
        return false;
    }
    static getAbilitiesForUnit(unitType) { const s = UNIT_STATS[unitType]; return s ? s.abilities || [] : []; }
    static getUpgradesForUnit(unitType) { const s = UNIT_STATS[unitType]; return s ? s.upgrades || [] : []; }
}

// ============ سیستم مدال‌ها ============
class MedalSystem {
    static MEDALS = {
        iron_cross_2nd: { name: 'صلیب آهنین درجه ۲', requirement: (u) => u.kills >= 3, bonus: { morale: 5 } },
        iron_cross_1st: { name: 'صلیب آهنین درجه ۱', requirement: (u) => u.kills >= 8, bonus: { attack: 2, defense: 2 } },
        knights_cross: { name: 'صلیب شوالیه', requirement: (u) => u.kills >= 15 && u.level >= 4, bonus: { attack: 4, defense: 3, morale: 10 } },
        wound_badge: { name: 'نشان مجروحیت', requirement: (u) => u.isWounded, bonus: { morale: 3 } },
        eastern_front: { name: 'مدال جبهه شرق', requirement: (u) => u.experience >= 500, bonus: { defense: 3 } }
    };

    static checkAndAward(unit) {
        if (!unit.medals) unit.medals = [];
        for (const [key, medal] of Object.entries(this.MEDALS)) {
            if (!unit.medals.includes(key) && medal.requirement(unit)) {
                unit.medals.push(key);
                if (medal.bonus.attack) unit.attackPower += medal.bonus.attack;
                if (medal.bonus.defense) unit.defensePower += medal.bonus.defense;
                if (medal.bonus.morale) unit.morale = Math.min(100, unit.morale + medal.bonus.morale);
                return { awarded: true, medalName: medal.name, key };
            }
        }
        return { awarded: false };
    }
}

// ============ سیستم زخمی و بیمارستان ============
class WoundSystem {
    static woundUnit(unit) {
        if (unit.isWounded) return;
        unit.isWounded = true;
        unit.woundTurns = 3 + Math.floor(Math.random() * 3);
        unit.morale -= 10;
        unit.movementPoints = Math.floor(unit.movementPoints / 2);
    }

    static healInHospital(unit, hospitalTile) {
        if (!hospitalTile || hospitalTile.specialLocation !== 'hospital') return false;
        unit.woundTurns = 0;
        unit.isWounded = false;
        unit.health = Math.min(unit.maxHealth, unit.health + 30);
        unit.morale = Math.min(100, unit.morale + 20);
        return true;
    }
}

// ============ سیستم فرار از خدمت و PTSD ============
class MoraleAndDesertionSystem {
    static checkDesertion(unit, gameState) {
        if (unit.morale < 20 && !unit.isSuppressed && unit.type !== UNIT_TYPE.HQ && unit.type !== UNIT_TYPE.FELDGENDARMERIE) {
            if (Math.random() < 0.25) {
                gameState.log(`${unit.name} از میدان نبرد گریخت!`, 'system');
                gameState.removeUnit(unit.id);
                return true;
            }
        }
        return false;
    }

    static applyPTSD(unit) {
        if (unit.kills >= 10 && Math.random() < 0.1) {
            unit.hasPTSD = true;
            unit.morale -= 5;
            return true;
        }
        return false;
    }

    static checkPTSDEffect(unit) {
        if (!unit.hasPTSD) return false;
        if (Math.random() < 0.15) {
            unit.isSuppressed = true;
            unit.movementPoints = Math.floor(unit.movementPoints / 2);
            return true;
        }
        return false;
    }

    static preventDesertion(fgUnit, gameState) {
        if (fgUnit.type !== UNIT_TYPE.FELDGENDARMERIE) return false;
        const nearby = gameState.getMyUnits().filter(u => u.morale < 25 && u.position.manhattanDistance(fgUnit.position) <= 3);
        nearby.forEach(u => u.morale = Math.min(100, u.morale + 20));
        fgUnit.hasActed = true;
        return nearby.length > 0;
    }
}

// ============ سیستم رابطه بین سربازا ============
class RelationshipSystem {
    static bonds = [];

    static formBond(unit1, unit2, type) {
        if (this.getBond(unit1.id, unit2.id)) return false;
        this.bonds.push({ unit1: unit1.id, unit2: unit2.id, type, formedTurn: unit1.gameState?.currentTurn || 0 });
        return true;
    }

    static getBond(id1, id2) {
        return this.bonds.find(b => (b.unit1 === id1 && b.unit2 === id2) || (b.unit1 === id2 && b.unit2 === id1));
    }

    static applyBondEffect(unit, gameState) {
        const bonds = this.bonds.filter(b => b.unit1 === unit.id || b.unit2 === unit.id);
        for (const bond of bonds) {
            const otherId = bond.unit1 === unit.id ? bond.unit2 : bond.unit1;
            const other = gameState.getUnit(otherId);
            if (!other || other.health <= 0) {
                unit.morale -= 15;
                return 'grief';
            }
            if (unit.position.manhattanDistance(other.position) <= 2) {
                if (bond.type === 'friendship') unit.morale = Math.min(100, unit.morale + 3);
                if (bond.type === 'brotherhood') { unit.attackPower += 2; unit.defensePower += 2; }
            }
        }
        return 'ok';
    }
}

// ============ سیستم اعتماد و قول‌ها ============
class TrustSystem {
    static promises = [];

    static makePromise(commander, unit, promise, deadline) {
        this.promises.push({ unitId: unit.id, promise, deadline, fulfilled: false, broken: false });
        unit.trust = Math.min(100, (unit.trust || 50) + 10);
    }

    static fulfillPromise(unitId, gameState) {
        const promise = this.promises.find(p => p.unitId === unitId && !p.fulfilled && !p.broken);
        if (!promise) return;
        promise.fulfilled = true;
        const unit = gameState.getUnit(unitId);
        if (unit) {
            unit.trust = Math.min(100, unit.trust + 25);
            unit.morale = Math.min(100, unit.morale + 20);
            gameState.log(`${unit.name}: "فرمانده به قولش عمل کرد..."`, 'system');
        }
    }

    static breakPromise(unitId, gameState) {
        const promise = this.promises.find(p => p.unitId === unitId && !p.fulfilled && !p.broken);
        if (!promise) return;
        promise.broken = true;
        const unit = gameState.getUnit(unitId);
        if (unit) {
            unit.trust = Math.max(0, unit.trust - 30);
            unit.morale = Math.max(0, unit.morale - 25);
            gameState.log(`${unit.name}: "به من قول داده بود..."`, 'system');
            if (unit.trust <= 10) MoraleAndDesertionSystem.checkDesertion(unit, gameState);
        }
    }

    static checkPromises(gameState) {
        for (const promise of this.promises) {
            if (!promise.fulfilled && !promise.broken && gameState.currentTurn > promise.deadline) {
                this.breakPromise(promise.unitId, gameState);
            }
        }
    }
}

// ============ سیستم نامه‌های سربازا ============
class LetterSystem {
    static generateLetter(unit, gameState) {
        const templates = [
            `سلام مادر،\nامروز هوا سرده. دیشب برف اومد. دلم برات تنگ شده.\nامیدوارم حالت خوب باشه.\nپسرت، ${unit.name}`,
            `عزیزم،\nبازم یه روز دیگه تموم شد. نمیدونم فردا چی میشه.\nفقط میخوام بدونم تو و بچه‌ها خوبین.\nدوستت دارم. ${unit.name}`,
        ];
        const letter = templates[Math.floor(Math.random() * templates.length)];
        gameState.log(`نامه‌ای از ${unit.name} نوشته شد.`, 'system');
        return letter;
    }

    static writeToCommander(unit, gameState) {
        const messages = [
            `${unit.name}: "فرمانده، ممنون که امروز ما رو زنده نگه داشتی."`,
            `${unit.name}: "امیدوارم فردا هم زنده بمونم. میخوام برگردم خونه."`,
            `${unit.name}: "پسرم ۸ سالشه. عکسش تو جیبمه. میخوای ببینیش؟"`,
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        gameState.log(msg, 'system');
    }
}
