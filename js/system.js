// sturmglanz/js/systems.js
// سیستم‌های جهان بازی - آب‌وهوا، روز/شب، اقتصاد، فصل‌ها، وعده‌ها، غنیمت‌ها، ذخیره خودکار
'use strict';

class SystemsManager {
    constructor(gameState) {
        this.gs = gameState;
        this.weatherTimer = 0;
        this.dayTimer = 0;
        this.seasonTimer = 0;
        this.currentSeason = 'winter'; // بازی از زمستان ۱۹۴۴ شروع می‌شود
        this.economyBoost = 1.0;
        this.activePromises = [];
        this.lootTable = this.initLootTable();
        this.lastAutosaveTurn = 0;
    }

    // ============ سیستم آب‌وهوا ============
    updateWeather() {
        this.weatherTimer++;

        if (this.weatherTimer >= CONFIG.WEATHER.CHANGE_INTERVAL) {
            this.weatherTimer = 0;
            const weatherTypes = CONFIG.WEATHER.TYPES;
            let newWeather;

            // در زمستان احتمال برف بیشتر است
            if (this.currentSeason === 'winter') {
                const winterWeights = { klar: 1, regen: 2, schnee: 6, nebel: 3, sturm: 2 };
                newWeather = this.weightedRandom(winterWeights);
            } else if (this.currentSeason === 'spring') {
                const springWeights = { klar: 4, regen: 5, schnee: 1, nebel: 2, sturm: 1 };
                newWeather = this.weightedRandom(springWeights);
            } else if (this.currentSeason === 'summer') {
                const summerWeights = { klar: 7, regen: 2, schnee: 0, nebel: 1, sturm: 1 };
                newWeather = this.weightedRandom(summerWeights);
            } else { // autumn
                const autumnWeights = { klar: 3, regen: 4, schnee: 1, nebel: 4, sturm: 2 };
                newWeather = this.weightedRandom(autumnWeights);
            }

            if (newWeather !== this.gs.weatherState) {
                const oldWeather = this.gs.weatherState;
                this.gs.weatherState = newWeather;

                // تأثیر روی رودخانه‌ها
                if (newWeather === 'schnee' && oldWeather !== 'schnee') {
                    if (this.gs.mapManager) this.gs.mapManager.freezeRivers();
                } else if (newWeather !== 'schnee' && oldWeather === 'schnee') {
                    if (this.gs.mapManager) this.gs.mapManager.unfreezeRivers();
                }

                const weatherNames = { klar: 'صاف', regen: 'بارانی', schnee: 'برفی', nebel: 'مه‌آلود', sturm: 'طوفانی' };
                this.gs.log(`🌤 آب‌وهوا: ${weatherNames[newWeather] || newWeather}`, 'system');

                eventBus.emit(GAME_EVENTS.WEATHER_CHANGED, { weather: newWeather, oldWeather });
            }
        }
    }

    getWeatherEffect() {
        const effects = CONFIG.WEATHER.EFFECTS[this.gs.weatherState];
        if (!effects) return { movement: 1.0, attack: 1.0, vision: 1.0 };

        // فصل هم تأثیر می‌گذارد
        const seasonMod = this.getSeasonEffect();
        return {
            movement: effects.movement * seasonMod.movement,
            attack: effects.attack * seasonMod.attack,
            vision: effects.vision * seasonMod.vision
        };
    }

    // ============ سیستم روز و شب ============
    updateDayNight() {
        this.dayTimer++;
        const cycleLength = CONFIG.DAYNIGHT.CYCLE_TURNS;

        // هر cycleLength نوبت یک چرخه کامل
        const positionInCycle = this.dayTimer % cycleLength;
        let newPhase;

        if (positionInCycle < cycleLength * 0.25) {
            newPhase = 'dawn';
        } else if (positionInCycle < cycleLength * 0.7) {
            newPhase = 'day';
        } else if (positionInCycle < cycleLength * 0.85) {
            newPhase = 'dusk';
        } else {
            newPhase = 'night';
        }

        if (newPhase !== this.gs.dayPhase) {
            const oldPhase = this.gs.dayPhase;
            this.gs.dayPhase = newPhase;

            const phaseNames = { dawn: 'سحر 🌅', day: 'روز ☀️', dusk: 'غروب 🌇', night: 'شب 🌙' };
            this.gs.log(`${phaseNames[newPhase] || newPhase}`, 'system');

            // رویدادهای خاص بر اساس زمان روز
            if (newPhase === 'dawn') {
                const aliveChars = Object.values(this.gs.campaign?.characters || {})
                    .filter(c => c.alive && c.morale < 30);
                if (aliveChars.length > 0) {
                    this.gs.log('سحر امید می‌آورد. روحیه اندکی افزایش یافت.', 'system');
                    aliveChars.forEach(c => c.morale = Math.min(100, c.morale + 5));
                }
            }

            if (newPhase === 'night') {
                // شب‌ها احتمال PTSD بیشتر می‌شود
                for (const unit of this.gs.getMyUnits()) {
                    if (unit.hasPTSD && Math.random() < 0.2) {
                        this.gs.log(`${unit.name} کابوس می‌بیند...`, 'system');
                    }
                }
            }

            eventBus.emit(GAME_EVENTS.DAYNIGHT_CHANGED, { phase: newPhase, oldPhase });
        }
    }

    getDayNightEffect() {
        const effects = CONFIG.DAYNIGHT.EFFECTS[this.gs.dayPhase];
        if (!effects) return { vision: 1.0, attack: 1.0 };
        return effects;
    }

    // ============ سیستم فصل‌ها ============
    updateSeason() {
        this.seasonTimer++;

        // هر ۳۰ نوبت یک فصل (تقریباً)
        const SEASON_LENGTH = 30;
        if (this.seasonTimer >= SEASON_LENGTH) {
            this.seasonTimer = 0;
            this.advanceSeason();
        }
    }

    advanceSeason() {
        const seasons = ['winter', 'spring', 'summer', 'autumn'];
        const currentIndex = seasons.indexOf(this.currentSeason);
        const nextIndex = (currentIndex + 1) % seasons.length;
        this.currentSeason = seasons[nextIndex];

        const seasonNames = {
            winter: '❄️ زمستان',
            spring: '🌸 بهار',
            summer: '☀️ تابستان',
            autumn: '🍂 پاییز'
        };

        this.gs.log(`فصل تغییر کرد: ${seasonNames[this.currentSeason]}`, 'system');

        // تأثیر تغییر فصل
        if (this.currentSeason === 'spring') {
            // آب شدن یخ‌ها
            if (this.gs.mapManager) this.gs.mapManager.unfreezeRivers();
            // گل‌ها می‌رویند
            for (const char of Object.values(this.gs.campaign?.characters || {})) {
                if (char.alive) char.morale = Math.min(100, char.morale + 10);
            }
        }

        if (this.currentSeason === 'winter') {
            // یخ زدن رودخانه‌ها
            if (this.gs.mapManager) this.gs.mapManager.freezeRivers();
            // سرما
            for (const unit of this.gs.getMyUnits()) {
                if (unit.fuel < 50) unit.morale -= 5;
            }
        }

        if (this.currentSeason === 'autumn') {
            // برگ‌ریزان - دید در جنگل کمتر
            this.gs.log('برگ‌ها می‌ریزند. جنگل‌ها شفاف‌تر می‌شوند.', 'system');
        }
    }

    getSeasonEffect() {
        const effects = {
            winter: { movement: 0.8, attack: 0.9, vision: 0.7 },
            spring: { movement: 0.9, attack: 1.0, vision: 0.9 },
            summer: { movement: 1.0, attack: 1.0, vision: 1.0 },
            autumn: { movement: 0.9, attack: 0.95, vision: 0.85 }
        };
        return effects[this.currentSeason] || effects.summer;
    }

    getCurrentSeasonName() {
        const names = { winter: 'زمستان', spring: 'بهار', summer: 'تابستان', autumn: 'پاییز' };
        return names[this.currentSeason] || 'نامشخص';
    }

    // ============ سیستم اقتصاد ============
    updateEconomy() {
        const baseIncome = {
            rp: CONFIG.RESOURCES.RP_PER_TURN * this.economyBoost,
            fuel: CONFIG.RESOURCES.FUEL_PER_TURN * this.economyBoost,
            ammo: CONFIG.RESOURCES.AMMO_PER_TURN * this.economyBoost
        };

        // کارخانه‌ها تولید اضافی می‌دهند
        const factoryBonus = this.calculateFactoryBonus();
        baseIncome.rp += factoryBonus;

        // شهرهای تحت کنترل
        const cityBonus = this.calculateCityBonus();
        baseIncome.rp += cityBonus;
        baseIncome.fuel += Math.floor(cityBonus / 2);

        // بازار سیاه (اگر دسترسی باشد)
        if (this.storyFlags?.blackMarketAccess) {
            baseIncome.rp += 30;
            baseIncome.ammo += 10;
        }

        // اعمال درآمد
        this.gs.resources.rp += baseIncome.rp;
        this.gs.resources.fuel += baseIncome.fuel;
        this.gs.resources.ammo += baseIncome.ammo;

        // مصرف خودکار
        this.applyResourceConsumption();

        // محدود کردن منابع
        this.gs.resources.rp = Math.max(0, this.gs.resources.rp);
        this.gs.resources.fuel = Math.max(0, Math.min(999, this.gs.resources.fuel));
        this.gs.resources.ammo = Math.max(0, Math.min(999, this.gs.resources.ammo));

        eventBus.emit(GAME_EVENTS.RESOURCES_CHANGED, { resources: this.gs.resources });
    }

    calculateFactoryBonus() {
        if (!this.gs.mapManager) return 0;
        let bonus = 0;
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const tile = this.gs.getTile(x, y);
                if (tile && tile.factoryState && tile.factoryState.active) {
                    bonus += tile.factoryState.production || 5;
                    if (tile.isBurning) bonus = Math.floor(bonus * 0.3);
                }
            }
        }
        return bonus;
    }

    calculateCityBonus() {
        if (!this.gs.mapManager) return 0;
        let bonus = 0;
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const tile = this.gs.getTile(x, y);
                if (tile && tile.cityState && tile.cityState.status === 'safe') {
                    bonus += 5;
                }
            }
        }
        return bonus;
    }

    applyResourceConsumption() {
        const myUnits = this.gs.getMyUnits();

        // مصرف سوخت برای واحدهای مکانیزه
        for (const unit of myUnits) {
            if (unit.maxFuel < 999) { // واحدهای مکانیزه
                unit.fuel = Math.max(0, unit.fuel - 2);
                if (unit.fuel <= 0 && unit.canMove()) {
                    this.gs.log(`${unit.name} سوخت تمام کرده و زمین‌گیر شده است.`, 'system');
                }
            }
        }

        // مصرف غذا برای غیرنظامیان
        const civilians = this.gs.civiliansOnMap?.filter(c => c.alive) || [];
        const foodConsumption = civilians.length * 1;
        this.gs.resources.rp = Math.max(0, this.gs.resources.rp - foodConsumption);

        if (foodConsumption > 50) {
            this.gs.log(`⚡ مصرف منابع: ${foodConsumption} RP صرف غیرنظامیان شد.`, 'system');
        }
    }

    // ============ سیستم وعده‌ها ============
    makePromise(unitId, promiseType, deadline) {
        const unit = this.gs.getUnit(unitId);
        if (!unit) return false;

        const promise = {
            id: `promise_${Date.now()}`,
            unitId,
            unitName: unit.name,
            type: promiseType, // 'leave', 'save', 'promote', 'letter'
            deadline,
            fulfilled: false,
            broken: false,
            createdAt: this.gs.currentTurn
        };

        this.activePromises.push(promise);
        this.gs.log(`🤝 به ${unit.name} قول دادی: ${this.getPromiseText(promiseType)}`, 'system');

        // افزایش اعتماد
        if (unit.trust !== undefined) {
            unit.trust = Math.min(100, (unit.trust || 50) + 10);
        }

        return true;
    }

    getPromiseText(type) {
        const texts = {
            'leave': 'مرخصی خواهی گرفت',
            'save': 'نجاتت می‌دهم',
            'promote': 'ترفیع می‌گیری',
            'letter': 'نامه‌ات را می‌رسانم',
            'protect': 'از خانواده‌ات محافظت می‌کنم',
            'return': 'با هم برمی‌گردیم خونه'
        };
        return texts[type] || '...';
    }

    checkPromises() {
        for (const promise of [...this.activePromises]) {
            // قول شکسته شده
            if (!promise.fulfilled && !promise.broken && this.gs.currentTurn > promise.deadline) {
                promise.broken = true;
                const unit = this.gs.getUnit(promise.unitId);
                if (unit) {
                    unit.morale = Math.max(0, unit.morale - 20);
                    if (unit.trust !== undefined) {
                        unit.trust = Math.max(0, unit.trust - 25);
                    }
                    this.gs.log(`💔 ${unit.name}: "قول داده بودی..."`, 'system');
                }
            }

            // قول انجام شده (از خارج تنظیم می‌شود)
            if (promise.fulfilled) {
                const unit = this.gs.getUnit(promise.unitId);
                if (unit) {
                    unit.morale = Math.min(100, unit.morale + 15);
                    if (unit.trust !== undefined) {
                        unit.trust = Math.min(100, unit.trust + 20);
                    }
                    this.gs.log(`✅ ${unit.name}: "ممنون که به قولت عمل کردی."`, 'system');
                }
            }
        }

        // پاکسازی قول‌های قدیمی
        this.activePromises = this.activePromises.filter(p => 
            !p.fulfilled && !p.broken || 
            (p.fulfilled && this.gs.currentTurn - p.createdAt < 20)
        );
    }

    fulfillPromise(unitId) {
        const promise = this.activePromises.find(p => p.unitId === unitId && !p.fulfilled && !p.broken);
        if (promise) {
            promise.fulfilled = true;
            return true;
        }
        return false;
    }

    // ============ سیستم غنیمت ============
    initLootTable() {
        return {
            common: [
                { name: 'مهمات اضافی', type: 'ammo', amount: 20, weight: 10 },
                { name: 'جیره غذایی', type: 'rp', amount: 30, weight: 10 },
                { name: 'قطعات یدکی', type: 'repair', amount: 1, weight: 8 },
            ],
            uncommon: [
                { name: 'نقشه دشمن', type: 'intel', amount: 1, weight: 5 },
                { name: 'انبار سوخت', type: 'fuel', amount: 40, weight: 5 },
                { name: 'بسته پزشکی', type: 'heal_all', amount: 1, weight: 4 },
            ],
            rare: [
                { name: 'تانک متروکه', type: 'unit', unitType: UNIT_TYPE.PANZER_IV, weight: 2 },
                { name: 'سلاح پیشرفته', type: 'upgrade', amount: 1, weight: 2 },
                { name: 'اسناد محرمانه', type: 'story', amount: 1, weight: 1 },
            ],
            legendary: [
                { name: 'کینگ تایگر آسیب‌دیده', type: 'unit', unitType: UNIT_TYPE.KING_TIGER, weight: 1 },
                { name: 'منابع عظیم', type: 'all_resources', amount: 200, weight: 1 },
            ]
        };
    }

    rollLoot(rarity = null) {
        if (!rarity) {
            // شانس بر اساس نوبت بازی
            const roll = Math.random() * 100;
            if (roll < 2) rarity = 'legendary';
            else if (roll < 10) rarity = 'rare';
            else if (roll < 35) rarity = 'uncommon';
            else rarity = 'common';
        }

        const table = this.lootTable[rarity] || this.lootTable.common;
        const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const item of table) {
            roll -= item.weight;
            if (roll <= 0) return item;
        }

        return table[0];
    }

    awardLoot(rarity) {
        const loot = this.rollLoot(rarity);
        if (!loot) return null;

        switch (loot.type) {
            case 'ammo':
                this.gs.resources.ammo += loot.amount;
                break;
            case 'rp':
                this.gs.resources.rp += loot.amount;
                break;
            case 'fuel':
                this.gs.resources.fuel += loot.amount;
                break;
            case 'repair':
                // تعمیر همه واحدها
                for (const unit of this.gs.getMyUnits()) {
                    if (unit.health < unit.maxHealth) {
                        unit.health = Math.min(unit.maxHealth, unit.health + 20);
                    }
                }
                break;
            case 'unit':
                // ساخت یگان رایگان
                if (this.gs.getMyUnits().length < CONFIG.GAME.MAX_UNITS_PER_FACTION) {
                    const pos = this.gs.getMyUnits()[0]?.position || new Position(20, 15);
                    this.gs.addUnit(loot.unitType, FACTION.WEHRMACHT, pos.x + Math.floor(Math.random()*3), pos.y + Math.floor(Math.random()*3));
                }
                break;
            case 'all_resources':
                this.gs.resources.rp += loot.amount;
                this.gs.resources.fuel += loot.amount;
                this.gs.resources.ammo += loot.amount;
                break;
        }

        this.gs.log(`🎁 غنیمت: ${loot.name}!`, 'system');
        eventBus.emit(GAME_EVENTS.RESOURCES_CHANGED, { resources: this.gs.resources });
        return loot;
    }

    // ============ ذخیره خودکار ============
    autoSave() {
        if (this.gs.currentTurn - this.lastAutosaveTurn >= CONFIG.GAME.AUTOSAVE_INTERVAL) {
            this.lastAutosaveTurn = this.gs.currentTurn;
            
            if (typeof StorageManager !== 'undefined') {
                const saveData = this.gs.toSaveData();
                // اضافه کردن داده‌های narrative
                if (this.gs.narrative) {
                    saveData.narrativeState = this.gs.narrative.autoSave().narrativeState;
                }
                saveData.systemsState = this.toSaveData();
                
                StorageManager.saveGame('autosave', saveData);
                this.gs.log('💾 ذخیره خودکار انجام شد.', 'system');
            }
        }
    }

    // ============ ذخیره و بازیابی ============
    toSaveData() {
        return {
            weatherTimer: this.weatherTimer,
            dayTimer: this.dayTimer,
            seasonTimer: this.seasonTimer,
            currentSeason: this.currentSeason,
            economyBoost: this.economyBoost,
            activePromises: this.activePromises.filter(p => !p.broken),
            lastAutosaveTurn: this.lastAutosaveTurn
        };
    }

    loadSaveData(data) {
        if (!data) return;
        this.weatherTimer = data.weatherTimer || 0;
        this.dayTimer = data.dayTimer || 0;
        this.seasonTimer = data.seasonTimer || 0;
        this.currentSeason = data.currentSeason || 'winter';
        this.economyBoost = data.economyBoost || 1.0;
        this.activePromises = data.activePromises || [];
        this.lastAutosaveTurn = data.lastAutosaveTurn || 0;
    }

    // ============ ابزار ============
    weightedRandom(weights) {
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        for (const [key, weight] of Object.entries(weights)) {
            roll -= weight;
            if (roll <= 0) return key;
        }
        return Object.keys(weights)[0];
    }

    // ============ به‌روزرسانی کلی ============
    updateAll() {
        this.updateWeather();
        this.updateDayNight();
        this.updateSeason();
        this.updateEconomy();
        this.checkPromises();
        this.autoSave();

        // غنیمت تصادفی (شانس کم)
        if (Math.random() < 0.05) {
            this.awardLoot();
        }
    }
}
