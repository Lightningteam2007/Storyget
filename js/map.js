// sturmglanz/js/map.js
// نقشه کامل - تمام ویژگی‌ها: ۱۵ زمین، مه جنگ، مسیریابی، قطار زرهی، 
// رودخانه یخ‌زده، آتش، مین، شهرهای زنده، اماکن خاص، تغییر فصل، دست‌خط
'use strict';

class MapManager {
    constructor(gameState) {
        this.gs = gameState;
        this.fogMemory = new Map();
        this.season = 'winter';
        this.seasonTimer = 0;
        this.mapAnnotations = []; // دست‌خط‌های روی نقشه
        this.intelErrors = []; // اطلاعات غلط
    }

    generate(missionType = 'defense') {
        const tiles = [];
        const seed = missionType === 'historical' ? 1944 : Date.now() % 10000;
        this.fogMemory.clear();
        this.mapAnnotations = [];
        this.intelErrors = [];
        this.season = 'winter';
        this.seasonTimer = 0;

        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            tiles[y] = [];
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const terrain = this.calculateTerrain(x, y, seed, missionType);
                tiles[y][x] = new Tile(x, y, terrain);
            }
        }

        this.placeRivers(tiles, seed);
        this.placeRoads(tiles, seed);
        this.placeBridges(tiles);
        this.placeSpecialLocations(tiles);
        this.placeCities(tiles, seed);
        this.initializeCityStates(tiles);
        this.generateIntelErrors(tiles, seed);

        return tiles;
    }

    calculateTerrain(x, y, seed, missionType) {
        const hash = this.hash(x, y, seed);
        const cx = Math.floor(CONFIG.MAP.WIDTH / 2);
        const cy = Math.floor(CONFIG.MAP.HEIGHT / 2);
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

        if (x < 2 || x > CONFIG.MAP.WIDTH - 3 || y < 2 || y > CONFIG.MAP.HEIGHT - 3) {
            const r = hash % 100;
            if (r < 65) return TERRAIN_TYPE.MOUNTAIN;
            if (r < 85) return TERRAIN_TYPE.HILL;
            return TERRAIN_TYPE.FOREST;
        }

        if (dist < 2) return TERRAIN_TYPE.CITY;
        if (dist < 4 && hash % 100 < 35) return TERRAIN_TYPE.RUINS;
        if (dist < 5 && hash % 100 < 18) return TERRAIN_TYPE.FACTORY;
        if (dist < 6 && hash % 100 < 12) return TERRAIN_TYPE.BUNKER;

        if (missionType === 'defense') {
            if (y > 20 && x > 15 && x < 25 && hash % 100 < 30) return TERRAIN_TYPE.TRENCH;
            if (y < 10 && x > 10 && x < 30 && hash % 100 < 25) return TERRAIN_TYPE.BUNKER;
        }

        const r = hash % 100;
        if (r < 28) return TERRAIN_TYPE.PLAINS;
        if (r < 46) return TERRAIN_TYPE.FOREST;
        if (r < 55) return TERRAIN_TYPE.HILL;
        if (r < 59) return TERRAIN_TYPE.MARSH;
        if (r < 62) return TERRAIN_TYPE.ROAD;
        if (r < 64) return TERRAIN_TYPE.CEMETERY;
        if (r < 66) return TERRAIN_TYPE.RUINS;

        return TERRAIN_TYPE.PLAINS;
    }

    placeRivers(tiles, seed) {
        let x = 3, y = 0;
        const path1 = [];
        while (y < CONFIG.MAP.HEIGHT - 3 && x < CONFIG.MAP.WIDTH - 10) {
            path1.push({x, y});
            const r = this.hash(x, y, seed) % 100;
            if (r < 30) x++;
            else if (r < 60) y++;
            else if (r < 80) { x++; y++; }
            else y++;
        }
        for (const p of path1) {
            if (p.x < CONFIG.MAP.WIDTH && p.y < CONFIG.MAP.HEIGHT) {
                tiles[p.y][p.x].terrain = TERRAIN_TYPE.RIVER;
            }
        }

        x = CONFIG.MAP.WIDTH - 4;
        y = CONFIG.MAP.HEIGHT - 3;
        const path2 = [];
        while (y > 10 && x > CONFIG.MAP.WIDTH / 2) {
            path2.push({x, y});
            const r = this.hash(x, y, seed + 100) % 100;
            if (r < 40) x--;
            else if (r < 70) y--;
            else { x--; y--; }
        }
        for (const p of path2) {
            if (p.x >= 0 && p.y >= 0) {
                tiles[p.y][p.x].terrain = TERRAIN_TYPE.RIVER;
            }
        }
    }

    placeRoads(tiles, seed) {
        const roadY1 = Math.floor(CONFIG.MAP.HEIGHT / 2) + 5;
        for (let x = 2; x < CONFIG.MAP.WIDTH - 2; x++) {
            const tile = tiles[roadY1][x];
            if (tile.terrain === TERRAIN_TYPE.PLAINS || tile.terrain === TERRAIN_TYPE.FOREST) {
                tile.terrain = TERRAIN_TYPE.ROAD;
            }
        }

        const roadX1 = Math.floor(CONFIG.MAP.WIDTH / 2) - 6;
        for (let y = 2; y < CONFIG.MAP.HEIGHT - 2; y++) {
            const tile = tiles[y][roadX1];
            if (tile.terrain === TERRAIN_TYPE.PLAINS) {
                tile.terrain = TERRAIN_TYPE.ROAD;
            }
        }

        const roadY2 = 8;
        for (let x = 10; x < 35; x++) {
            if (tiles[roadY2][x].terrain === TERRAIN_TYPE.PLAINS) {
                tiles[roadY2][x].terrain = TERRAIN_TYPE.ROAD;
            }
        }
    }

    placeBridges(tiles) {
        for (let y = 1; y < CONFIG.MAP.HEIGHT - 1; y++) {
            for (let x = 1; x < CONFIG.MAP.WIDTH - 1; x++) {
                if (tiles[y][x].terrain === TERRAIN_TYPE.RIVER) {
                    const neighbors = [tiles[y][x-1], tiles[y][x+1], tiles[y-1][x], tiles[y+1][x]];
                    for (const n of neighbors) {
                        if (n && n.terrain === TERRAIN_TYPE.ROAD) {
                            tiles[y][x].terrain = TERRAIN_TYPE.BRIDGE;
                            tiles[y][x].victoryPoint = 1;
                            break;
                        }
                    }
                }
            }
        }

        const guaranteed = [{x:10,y:10}, {x:30,y:15}, {x:20,y:8}];
        for (const pos of guaranteed) {
            if (pos.x < CONFIG.MAP.WIDTH && pos.y < CONFIG.MAP.HEIGHT) {
                if (tiles[pos.y][pos.x].terrain === TERRAIN_TYPE.RIVER) {
                    tiles[pos.y][pos.x].terrain = TERRAIN_TYPE.BRIDGE;
                }
            }
        }
    }

    placeSpecialLocations(tiles) {
        const cx = Math.floor(CONFIG.MAP.WIDTH / 2);
        const cy = Math.floor(CONFIG.MAP.HEIGHT / 2);

        const bunkerPositions = [
            {x:cx-2,y:cy-2}, {x:cx+2,y:cy-2}, {x:cx-2,y:cy+2},
            {x:cx+2,y:cy+2}, {x:cx,y:cy-3}, {x:cx,y:cy+3}
        ];
        for (const pos of bunkerPositions) {
            if (pos.x>0 && pos.x<CONFIG.MAP.WIDTH && pos.y>0 && pos.y<CONFIG.MAP.HEIGHT) {
                tiles[pos.y][pos.x].terrain = TERRAIN_TYPE.BUNKER;
            }
        }

        for (let i = 0; i < 12; i++) {
            const x = 12 + Math.floor(Math.random()*16);
            const y = 8 + Math.floor(Math.random()*14);
            if (tiles[y] && tiles[y][x] && tiles[y][x].terrain === TERRAIN_TYPE.PLAINS) {
                tiles[y][x].terrain = TERRAIN_TYPE.TRENCH;
            }
        }

        tiles[cy-5][cx-8].specialLocation = 'church';
        tiles[cy+5][cx+8].specialLocation = 'factory';
        tiles[cy+3][cx-5].specialLocation = 'cemetery_large';
        tiles[cy-4][cx+7].specialLocation = 'hospital';
        tiles[cy][cx-3].specialLocation = 'bakery';
        tiles[cy][cx].specialLocation = 'bunker_hq';

        tiles[cy][cx].victoryPoint = 5;
        tiles[8][8].victoryPoint = 2;
        tiles[8][CONFIG.MAP.WIDTH-9].victoryPoint = 2;
        tiles[CONFIG.MAP.HEIGHT-9][8].victoryPoint = 2;
        tiles[CONFIG.MAP.HEIGHT-9][CONFIG.MAP.WIDTH-9].victoryPoint = 2;
        tiles[cy][cy].victoryPoint = 3;
    }

    placeCities(tiles, seed) {
        const cityPositions = [
            {x:8,y:8}, {x:32,y:8}, {x:8,y:22}, {x:32,y:22}, {x:20,y:5}, {x:20,y:25}
        ];
        for (const pos of cityPositions) {
            if (pos.x>1 && pos.x<CONFIG.MAP.WIDTH-1 && pos.y>1 && pos.y<CONFIG.MAP.HEIGHT-1) {
                tiles[pos.y][pos.x].terrain = TERRAIN_TYPE.CITY;
                tiles[pos.y][pos.x].victoryPoint = 1;
                for (let dy=-1; dy<=1; dy++) {
                    for (let dx=-1; dx<=1; dx++) {
                        if (dx===0 && dy===0) continue;
                        const nx = pos.x+dx, ny = pos.y+dy;
                        if (nx>0 && nx<CONFIG.MAP.WIDTH && ny>0 && ny<CONFIG.MAP.HEIGHT) {
                            if (tiles[ny][nx].terrain === TERRAIN_TYPE.PLAINS && Math.random()<0.5) {
                                tiles[ny][nx].terrain = TERRAIN_TYPE.CITY;
                            }
                        }
                    }
                }
            }
        }
    }

    initializeCityStates(tiles) {
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const tile = tiles[y][x];
                if (tile.terrain === TERRAIN_TYPE.CITY) {
                    tile.cityState = {
                        status: 'safe', // safe, worried, besieged, falling, fallen
                        population: 200 + Math.floor(Math.random()*600),
                        food: 50 + Math.floor(Math.random()*100),
                        morale: 70 + Math.floor(Math.random()*30),
                        hasBakery: tile.specialLocation === 'bakery',
                        hasChurch: tile.specialLocation === 'church',
                        hasHospital: tile.specialLocation === 'hospital'
                    };
                }
                if (tile.terrain === TERRAIN_TYPE.FACTORY) {
                    tile.factoryState = {
                        active: true,
                        production: 5 + Math.floor(Math.random()*10),
                        workers: 50 + Math.floor(Math.random()*100),
                        damage: 0
                    };
                }
            }
        }
    }

    generateIntelErrors(tiles, seed) {
        for (let i = 0; i < 3; i++) {
            const x = 5 + Math.floor(Math.random()*(CONFIG.MAP.WIDTH-10));
            const y = 5 + Math.floor(Math.random()*(CONFIG.MAP.HEIGHT-10));
            const tile = tiles[y][x];
            const fakeTerrain = Math.random()<0.5 ? TERRAIN_TYPE.PLAINS : TERRAIN_TYPE.CITY;
            this.intelErrors.push({
                position: new Position(x, y),
                reportedTerrain: fakeTerrain,
                actualTerrain: tile.terrain,
                discovered: false
            });
        }
    }

    hash(x, y, seed) {
        let h = seed;
        h = ((h << 5) + h) + x * 7;
        h = ((h << 5) + h) + y * 13;
        return Math.abs(h);
    }

    // ============ شهرهای زنده ============
    updateCityStates() {
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const tile = this.gs.getTile(x, y);
                if (!tile || !tile.cityState) continue;

                const cs = tile.cityState;
                const nearbyEnemies = this.countNearbyEnemies(x, y, 5);
                const nearbyAllies = this.countNearbyAllies(x, y, 5);

                // تعیین وضعیت شهر
                if (nearbyEnemies === 0 && nearbyAllies >= 2) {
                    cs.status = 'safe';
                    cs.morale = Math.min(100, cs.morale + 3);
                    if (cs.food < 100) cs.food += 2;
                } else if (nearbyEnemies <= 2 && nearbyAllies >= 1) {
                    cs.status = 'worried';
                    cs.morale = Math.min(100, cs.morale + 1);
                    cs.food = Math.max(0, cs.food - 1);
                } else if (nearbyEnemies >= 3 && nearbyAllies >= 2) {
                    cs.status = 'besieged';
                    cs.morale = Math.max(0, cs.morale - 2);
                    cs.food = Math.max(0, cs.food - 3);
                } else if (nearbyEnemies >= 5 && nearbyAllies < 2) {
                    cs.status = 'falling';
                    cs.morale = Math.max(0, cs.morale - 5);
                    cs.food = Math.max(0, cs.food - 5);
                    cs.population = Math.max(0, cs.population - Math.floor(Math.random()*10));
                } else if (nearbyAllies === 0 && nearbyEnemies >= 3) {
                    cs.status = 'fallen';
                    cs.morale = 0;
                    cs.population = Math.max(0, cs.population - Math.floor(Math.random()*20));
                }

                // نانوایی = غذای بیشتر
                if (cs.hasBakery && cs.status !== 'fallen') {
                    cs.food = Math.min(150, cs.food + 5);
                }

                // کلیسا = روحیه بیشتر
                if (cs.hasChurch && cs.status !== 'fallen') {
                    cs.morale = Math.min(100, cs.morale + 2);
                }

                // بیمارستان = جمعیت کمتر می‌میره
                if (cs.hasHospital && (cs.status === 'falling' || cs.status === 'besieged')) {
                    cs.population = Math.max(0, cs.population + 2);
                }

                // گورستان نزدیک = روحیه کمتر
                const nearCemetery = this.hasNearbyTerrain(x, y, 3, TERRAIN_TYPE.CEMETERY);
                if (nearCemetery) cs.morale = Math.max(0, cs.morale - 1);

                // شهر در آتش = سقوط سریع
                if (tile.isBurning) {
                    cs.status = 'falling';
                    cs.population = Math.max(0, cs.population - 15);
                    cs.morale = Math.max(0, cs.morale - 15);
                }
            }

            // کارخانه‌ها
            const factoryTile = this.gs.getTile(x, y);
            if (factoryTile && factoryTile.factoryState) {
                const fs = factoryTile.factoryState;
                if (factoryTile.isBurning) {
                    fs.damage = Math.min(100, fs.damage + 10);
                    fs.active = fs.damage < 70;
                    fs.workers = Math.max(0, fs.workers - 3);
                }
                if (fs.active && fs.damage < 50) {
                    this.gs.resources.rp += fs.production;
                }
            }
        }
    }

    countNearbyEnemies(x, y, range) {
        let count = 0;
        for (const unit of this.gs.getEnemyUnits()) {
            if (unit.health <= 0) continue;
            if (Math.abs(unit.position.x-x) <= range && Math.abs(unit.position.y-y) <= range) {
                count++;
            }
        }
        return count;
    }

    countNearbyAllies(x, y, range) {
        let count = 0;
        for (const unit of this.gs.getMyUnits()) {
            if (unit.health <= 0) continue;
            if (Math.abs(unit.position.x-x) <= range && Math.abs(unit.position.y-y) <= range) {
                count++;
            }
        }
        return count;
    }

    hasNearbyTerrain(x, y, range, terrainType) {
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const tile = this.gs.getTile(x+dx, y+dy);
                if (tile && tile.terrain === terrainType) return true;
            }
        }
        return false;
    }

    getCityStatusName(status) {
        const names = {
            'safe': 'امن',
            'worried': 'نگران',
            'besieged': 'در محاصره',
            'falling': 'در حال سقوط',
            'fallen': 'سقوط کرده'
        };
        return names[status] || 'نامشخص';
    }

    // ============ مه جنگ پیشرفته ============
    calculateVisibility(unit) {
        const visibleTiles = new Set();
        const maxRange = unit.type === UNIT_TYPE.RECON ? 8 : unit.type === UNIT_TYPE.SNIPER ? 7 : 5;

        let weatherMod = 1;
        const we = CONFIG.WEATHER.EFFECTS[this.gs.weatherState];
        if (we) weatherMod = we.vision;

        let dayMod = 1;
        const de = CONFIG.DAYNIGHT.EFFECTS[this.gs.dayPhase];
        if (de) dayMod = de.vision;

        const effectiveRange = Math.floor(maxRange * weatherMod * dayMod);
        const startTile = this.gs.getTile(unit.position.x, unit.position.y);
        const startLOS = startTile ? startTile.getLineOfSight() : 3;
        const finalRange = Math.min(effectiveRange, Math.floor(startLOS * weatherMod));

        this.castRay(unit.position.x, unit.position.y, finalRange, visibleTiles);

        for (const tileKey of visibleTiles) {
            this.fogMemory.set(tileKey, this.gs.currentTurn);
        }

        return visibleTiles;
    }

    castRay(originX, originY, range, visibleTiles) {
        for (let angle = 0; angle < 360; angle += 2) {
            const rad = (angle * Math.PI) / 180;
            for (let r = 0; r <= range; r += 0.5) {
                const nx = Math.round(originX + Math.cos(rad) * r);
                const ny = Math.round(originY + Math.sin(rad) * r);
                if (nx < 0 || nx >= CONFIG.MAP.WIDTH || ny < 0 || ny >= CONFIG.MAP.HEIGHT) break;
                const key = `${nx},${ny}`;
                visibleTiles.add(key);
                const tile = this.gs.getTile(nx, ny);
                if (tile && tile.terrain === TERRAIN_TYPE.MOUNTAIN && r > 1) break;
                if (tile && (tile.terrain === TERRAIN_TYPE.CITY || tile.terrain === TERRAIN_TYPE.BUNKER) && r > 2) break;
            }
        }
    }

    isTileVisible(x, y, faction) {
        if (faction === FACTION.WEHRMACHT) {
            for (const unit of this.gs.getMyUnits()) {
                if (unit.health <= 0 || unit.isMIA) continue;
                const dx = Math.abs(unit.position.x - x);
                const dy = Math.abs(unit.position.y - y);
                const tile = this.gs.getTile(unit.position.x, unit.position.y);
                const range = tile ? tile.getLineOfSight() : 3;
                if (dx <= range && dy <= range && this.fogMemory.has(`${x},${y}`)) return true;
            }
            return false;
        }
        return true;
    }

    isTileExplored(x, y) { return this.fogMemory.has(`${x},${y}`); }

    getLastSeenTurn(x, y) { return this.fogMemory.get(`${x},${y}`) || 0; }

    updateFogDecay() {
        const currentTurn = this.gs.currentTurn;
        const toRemove = [];
        for (const [key, turn] of this.fogMemory) {
            if (currentTurn - turn > 5) toRemove.push(key);
        }
        for (const key of toRemove) {
            this.fogMemory.delete(key);
        }
    }

    // ============ مسیریابی با موانع پویا ============
    findPathWithObstacles(start, end, unit) {
        const endTile = this.gs.getTile(end.x, end.y);
        if (!endTile) return [];
        if (endTile.isDestroyed && endTile.terrain === TERRAIN_TYPE.BRIDGE) return [];
        const enemyAtEnd = this.gs.getUnitAt(end.x, end.y);
        if (enemyAtEnd && enemyAtEnd.faction !== unit.faction && enemyAtEnd.health > 0) return [];
        return this.gs.findPath(start, end, unit);
    }

    calculateDynamicMoveCost(from, to, unit) {
        const tile = this.gs.getTile(to.x, to.y);
        if (!tile) return Infinity;
        if (tile.isBurning) return 6;
        if (tile.isDestroyed && tile.terrain === TERRAIN_TYPE.BRIDGE) {
            if (unit.type === UNIT_TYPE.INFANTRY || unit.type === UNIT_TYPE.ENGINEER) return 4;
            return Infinity;
        }
        if (tile.isFrozen && tile.terrain === TERRAIN_TYPE.RIVER) {
            const heavy = [UNIT_TYPE.PANZER_IV,UNIT_TYPE.TIGER,UNIT_TYPE.KING_TIGER,UNIT_TYPE.STURMTIGER];
            if (heavy.includes(unit.type)) return 4;
            return 2;
        }
        if (tile.terrain === TERRAIN_TYPE.MINEFIELD) {
            if (unit.type === UNIT_TYPE.ENGINEER) return 2;
            return 6;
        }
        if (tile.terrain === TERRAIN_TYPE.CEMETERY) return tile.getMovementCost() + 0.5;
        return tile.getMovementCost();
    }

    // ============ تغییر فصل ============
    updateSeason() {
        this.seasonTimer++;
        if (this.seasonTimer >= 30) {
            this.seasonTimer = 0;
            if (this.season === 'winter') {
                this.season = 'spring';
                this.unfreezeRivers();
                this.gs.log('بهار از راه رسید. یخ‌ها آب می‌شوند.', 'system');
            } else if (this.season === 'spring') {
                this.season = 'summer';
                this.gs.log('تابستان فرا رسید.', 'system');
            } else if (this.season === 'summer') {
                this.season = 'autumn';
                this.gs.log('برگ‌ها می‌ریزند. پاییز است.', 'system');
            } else if (this.season === 'autumn') {
                this.season = 'winter';
                this.freezeRivers();
                this.gs.log('زمستان بازگشت. رودخانه‌ها یخ می‌زنند.', 'system');
            }
        }
    }

    getSeasonEffect() {
        const effects = {
            'winter': { movement: 0.8, attack: 0.9, vision: 0.7 },
            'spring': { movement: 0.9, attack: 1.0, vision: 0.9 },
            'summer': { movement: 1.0, attack: 1.0, vision: 1.0 },
            'autumn': { movement: 0.9, attack: 0.95, vision: 0.85 }
        };
        return effects[this.season] || effects.summer;
    }

    // ============ آتش ============
    spreadFire() {
        const newFires = [];
        const remaining = [];
        for (const pos of this.gs.burningTiles) {
            const tile = this.gs.getTile(pos.x, pos.y);
            if (!tile || !tile.isBurning) continue;
            tile.burnTimer--;
            if (tile.burnTimer <= 0) {
                tile.isBurning = false;
                if (tile.terrain===TERRAIN_TYPE.FOREST||tile.terrain===TERRAIN_TYPE.CITY) tile.terrain=TERRAIN_TYPE.RUINS;
                if (tile.factoryState) { tile.factoryState.damage=100; tile.factoryState.active=false; }
                continue;
            }
            remaining.push(pos);
            if (Math.random() < 0.35) {
                const neighbors = this.gs.getNeighbors(pos.x, pos.y);
                for (const n of neighbors) {
                    if (n.isBurning) continue;
                    let chance = 0;
                    if (n.terrain===TERRAIN_TYPE.FOREST) chance=0.6;
                    else if (n.terrain===TERRAIN_TYPE.CITY) chance=0.4;
                    else if (n.terrain===TERRAIN_TYPE.FACTORY) chance=0.7;
                    else if (n.terrain===TERRAIN_TYPE.RUINS) chance=0.3;
                    if (Math.random()<chance) {
                        n.isBurning=true;
                        n.burnTimer=3+Math.floor(Math.random()*5);
                        newFires.push(n.position.clone());
                        this.gs.civiliansOnMap = this.gs.civiliansOnMap.filter(c=>{
                            if(c.x===n.position.x&&c.y===n.position.y){c.alive=false;return false;}
                            return true;
                        });
                    }
                }
            }
        }
        this.gs.burningTiles = [...remaining, ...newFires];
    }

    // ============ رودخانه یخ‌زده ============
    freezeRivers() {
        this.gs.frozenRivers = [];
        for (let y=0;y<CONFIG.MAP.HEIGHT;y++) {
            for (let x=0;x<CONFIG.MAP.WIDTH;x++) {
                if (this.gs.tiles[y][x].terrain===TERRAIN_TYPE.RIVER) {
                    this.gs.tiles[y][x].isFrozen=true;
                    this.gs.frozenRivers.push(new Position(x,y));
                }
            }
        }
    }

    unfreezeRivers() {
        const heavy=[UNIT_TYPE.PANZER_IV,UNIT_TYPE.TIGER,UNIT_TYPE.KING_TIGER,UNIT_TYPE.STUG,UNIT_TYPE.JAGDPANTHER,UNIT_TYPE.STURMTIGER];
        for (const pos of this.gs.frozenRivers) {
            const tile=this.gs.getTile(pos.x,pos.y);
            if(!tile)continue;
            tile.isFrozen=false;
            const unit=this.gs.getUnitAt(pos.x,pos.y);
            if(unit){
                if(heavy.includes(unit.type)&&Math.random()<0.35){
                    unit.takeDamage(60);
                    this.gs.log(`${unit.name} با یخ فرو رفت!`,'combat');
                    if(unit.health<=0){this.gs.heroesGallery.push(unit.toJSON());this.gs.removeUnit(unit.id);}
                }else{unit.morale-=5;}
            }
        }
        this.gs.frozenRivers=[];
    }

    // ============ قطار زرهی ============
    setupTrainRoute() {
        this.gs.trainRoute=[];
        const roadY=Math.floor(CONFIG.MAP.HEIGHT/2)+5;
        for(let x=3;x<CONFIG.MAP.WIDTH-3;x++){
            const tile=this.gs.getTile(x,roadY);
            if(tile&&(tile.terrain===TERRAIN_TYPE.ROAD||tile.terrain===TERRAIN_TYPE.PLAINS)){
                this.gs.trainRoute.push(new Position(x,roadY));
            }
        }
        if(this.gs.trainRoute.length>0){
            this.gs.armoredTrain={position:this.gs.trainRoute[0].clone(),hp:200,maxHp:200,active:true,routeIndex:0,direction:1,ammo:50,kills:0};
        }
    }

    updateArmoredTrain() {
        const t=this.gs.armoredTrain;
        if(!t||!t.active||this.gs.trainRoute.length<2)return;
        t.routeIndex+=t.direction;
        if(t.routeIndex>=this.gs.trainRoute.length){t.routeIndex=this.gs.trainRoute.length-2;t.direction=-1;}
        else if(t.routeIndex<0){t.routeIndex=1;t.direction=1;}
        t.position=this.gs.trainRoute[t.routeIndex].clone();
        if(t.ammo>0&&Math.random()<0.5){
            const enemies=this.gs.getEnemyUnits().filter(e=>t.position.manhattanDistance(e.position)<=5);
            if(enemies.length>0){
                const target=enemies[Math.floor(Math.random()*enemies.length)];
                const dmg=30+Math.floor(Math.random()*25);
                target.takeDamage(dmg);t.ammo--;t.kills++;
                this.gs.log(`🚂 قطار زرهی به ${target.name} شلیک کرد!`,'combat');
                if(target.health<=0){this.gs.heroesGallery.push(target.toJSON());this.gs.removeUnit(target.id);}
            }
        }
    }

    // ============ مین ============
    checkMineTrigger(unit) {
        const tile=this.gs.getTile(unit.position.x,unit.position.y);
        if(!tile||tile.terrain!==TERRAIN_TYPE.MINEFIELD)return false;
        if(unit.type===UNIT_TYPE.ENGINEER)return false;
        if(unit.type===UNIT_TYPE.RECON&&Math.random()<0.5)return false;
        const dmg=25+Math.floor(Math.random()*40);
        const destroyed=unit.takeDamage(dmg);
        this.gs.log(`💥 ${unit.name} روی مین رفت!`,'combat');
        if(Math.random()<0.2){
            for(const n of this.gs.getNeighbors(unit.position.x,unit.position.y)){
                if(n.terrain===TERRAIN_TYPE.MINEFIELD&&Math.random()<0.3){n.terrain=TERRAIN_TYPE.PLAINS;}
            }
        }
        if(destroyed){this.gs.heroesGallery.push(unit.toJSON());this.gs.removeUnit(unit.id);}
        return true;
    }

    // ============ پل ============
    demolishBridge(engineer,targetPos){
        if(engineer.type!==UNIT_TYPE.ENGINEER||engineer.hasActed)return false;
        const tile=this.gs.getTile(targetPos.x,targetPos.y);
        if(!tile||tile.terrain!==TERRAIN_TYPE.BRIDGE||tile.isDestroyed)return false;
        if(engineer.position.manhattanDistance(targetPos)>1)return false;
        tile.isDestroyed=true;engineer.hasActed=true;
        this.gs.log(`${engineer.name} پل را تخریب کرد!`,'system');return true;
    }

    repairBridge(engineer,targetPos){
        if(engineer.type!==UNIT_TYPE.ENGINEER||engineer.hasActed)return false;
        const tile=this.gs.getTile(targetPos.x,targetPos.y);
        if(!tile||tile.terrain!==TERRAIN_TYPE.BRIDGE||!tile.isDestroyed)return false;
        if(engineer.position.manhattanDistance(targetPos)>1)return false;
        tile.isDestroyed=false;engineer.hasActed=true;
        this.gs.log(`${engineer.name} پل را بازسازی کرد!`,'system');return true;
    }

    // ============ غیرنظامیان ============
    updateCivilians(){
        this.gs.civiliansOnMap=this.gs.civiliansOnMap.filter(c=>{
            if(!c.alive)return false;
            if(Math.random()<0.3){const dx=Math.floor(Math.random()*3)-1,dy=Math.floor(Math.random()*3)-1;
                const nx=c.x+dx,ny=c.y+dy;
                if(nx>=0&&nx<CONFIG.MAP.WIDTH&&ny>=0&&ny<CONFIG.MAP.HEIGHT){
                    const tile=this.gs.getTile(nx,ny);
                    if(tile&&tile.getMovementCost()<99){c.x=nx;c.y=ny;}
                }
            }
            const tile=this.gs.getTile(c.x,c.y);
            if(tile&&tile.isBurning){c.alive=false;return false;}
            return true;
        });
    }

    getCivilianCount(){return this.gs.civiliansOnMap.filter(c=>c.alive).length;}

    // ============ دست‌خط روی نقشه ============
    addAnnotation(x,y,text){this.mapAnnotations.push({x,y,text,turn:this.gs.currentTurn});}
    removeAnnotation(index){if(index>=0&&index<this.mapAnnotations.length)this.mapAnnotations.splice(index,1);}
    getAnnotations(){return this.mapAnnotations;}

    // ============ اطلاعات غلط ============
    getIntelError(x,y){
        return this.intelErrors.find(e=>e.position.x===x&&e.position.y===y&&!e.discovered);
    }
    discoverIntelError(x,y){
        const err=this.getIntelError(x,y);
        if(err){err.discovered=true;return err.actualTerrain;}
        return null;
    }
}
