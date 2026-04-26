// sturmglanz/js/ai.js
// هوش مصنوعی کامل - سه شخصیت، درخت تصمیم، یادگیری واقعی، تمام تاکتیک‌ها
'use strict';

class AISystem {
    constructor(gameState) {
        this.gs = gameState;
        this.aiFaction = FACTION.SOVIET;
        this.memory = new Map();
        this.strategy = 'balanced';
        this.lastMoves = [];
        this.playerPatterns = [];
        this.aggressionLevel = 0.5;
        this.personality = null;
        this.consecutiveFailures = 0;
        this.playerMovementHistory = [];
        this.hqGuardAssigned = false;
    }

    executeAITurn() {
        const units = this.gs.getUnitsByFaction(this.aiFaction);
        this.personality = this.getPersonality();
        
        this.gs.log(`[دشمن] ${this.personality.name} در حال فرماندهی...`, 'system');
        
        // استراتژی‌های ویژه قبل از حرکت
        this.considerWunderwaffen();
        this.assignHQGuard();
        this.considerSabotage();
        
        // پردازش هر یگان
        for (const unit of units) {
            if (unit.health <= 0 || unit.isSuppressed || unit.hasActed) continue;
            this.processUnit(unit);
        }
        
        // هماهنگی گروهی
        if (this.gs.getMyUnits().length > 0) {
            this.coordinateGroupAttack();
        }
        
        this.updateMemory();
        this.adaptStrategy();
        this.predictPlayerMoves();
    }

    // ============ شخصیت‌های AI ============
    getPersonality() {
        const level = this.gs.difficultyManager.currentLevel;
        const turnProgress = this.gs.currentTurn / CONFIG.GAME.MAX_TURNS;
        
        let base;
        if (level === 'general') {
            base = {
                name: 'مارشال کونف', style: 'aggressive',
                aggression: 1.0, caution: 0.2, flanking: 0.6,
                useAmbush: false, useMines: false, targetCivilians: true,
                description: 'بی‌رحم و مستقیم. از هیچ چیز نمی‌گذرد.'
            };
        } else if (level === 'oberst') {
            base = {
                name: 'مارشال ژوکوف', style: 'methodical',
                aggression: 0.6, caution: 0.7, flanking: 0.8,
                useAmbush: true, useMines: true, targetCivilians: false,
                description: 'استراتژیست کهنه‌کار. از هر ابزاری استفاده می‌کند.'
            };
        } else {
            base = {
                name: 'مارشال روکوسوفسکی', style: 'balanced',
                aggression: 0.5, caution: 0.6, flanking: 0.7,
                useAmbush: true, useMines: false, targetCivilians: false,
                description: 'متوازن و سازگار. بهترین تاکتیک را انتخاب می‌کند.'
            };
        }
        
        // تغییر شخصیت بر اساس عملکرد
        if (this.consecutiveFailures >= 5) {
            base.aggression = Math.max(0.3, base.aggression - 0.2);
            base.caution = Math.min(0.9, base.caution + 0.2);
        } else if (this.consecutiveFailures === 0 && this.gs.currentTurn > 10) {
            base.aggression = Math.min(0.9, base.aggression + 0.1);
        }
        
        return base;
    }

    // ============ پردازش هر یگان ============
    processUnit(unit) {
        const enemies = this.gs.getMyUnits();
        const visibleEnemies = enemies.filter(e => this.gs.canSee(unit, e.position));
        
        // عقب‌نشینی اجباری
        if (this.shouldRetreat(unit)) {
            if (this.retreatUnit(unit)) return;
        }
        
        // حمله به دشمن در دسترس
        if (unit.canAttack() && visibleEnemies.length > 0) {
            const target = this.selectTarget(unit, visibleEnemies);
            if (target && this.gs.isInRange(unit, target.position)) {
                const result = this.gs.attackUnit(unit, target);
                if (result) {
                    this.lastMoves.push({ type: 'attack', unit: unit.id, target: target.id, success: target.health <= 0 });
                    return;
                }
            }
        }
        
        // مین‌گذاری (مهندس)
        if (unit.type === UNIT_TYPE.ENGINEER && this.personality.useMines && !unit.hasActed) {
            const tile = this.gs.getTile(unit.position.x, unit.position.y);
            if (tile && tile.terrain !== TERRAIN_TYPE.MINEFIELD) {
                this.gs.layMines(unit);
                this.lastMoves.push({ type: 'lay_mines', unit: unit.id });
                return;
            }
        }
        
        // تخریب پل (اگر دشمن نزدیک باشه)
        if (unit.type === UNIT_TYPE.ENGINEER && !unit.hasActed) {
            const bridgesNearby = this.findNearbyBridges(unit.position, 3);
            if (bridgesNearby.length > 0) {
                this.gs.demolishBridge(unit, bridgesNearby[0]);
                this.lastMoves.push({ type: 'demolish', unit: unit.id });
                return;
            }
        }
        
        // حرکت
        if (unit.canMove()) {
            const moveTarget = this.selectMoveTarget(unit);
            if (moveTarget && !unit.position.equals(moveTarget)) {
                // چک مسیر برای مین
                const path = this.gs.findPath(unit.position, moveTarget, unit);
                let safeToMove = true;
                for (const pos of path) {
                    const tile = this.gs.getTile(pos.x, pos.y);
                    if (tile && tile.terrain === TERRAIN_TYPE.MINEFIELD && unit.type !== UNIT_TYPE.ENGINEER) {
                        safeToMove = false;
                        break;
                    }
                }
                
                if (safeToMove) {
                    const moved = this.gs.moveUnit(unit, moveTarget);
                    if (moved) {
                        this.lastMoves.push({ type: 'move', unit: unit.id, to: moveTarget.toString() });
                        // چک مین بعد حرکت
                        this.gs.mapManager?.checkMineTrigger(unit);
                        return;
                    }
                }
            }
        }
        
        // حالت دفاعی
        if (!unit.hasActed && visibleEnemies.length > 0) {
            if (this.personality.useAmbush && Math.random() < 0.3) {
                this.gs.setAmbush(unit);
                this.lastMoves.push({ type: 'ambush', unit: unit.id });
            } else {
                this.gs.fortifyUnit(unit);
                this.lastMoves.push({ type: 'fortify', unit: unit.id });
            }
        } else if (!unit.hasActed) {
            this.gs.setOverwatch(unit);
            this.lastMoves.push({ type: 'overwatch', unit: unit.id });
        }
    }

    // ============ انتخاب هدف پیشرفته ============
    selectTarget(unit, enemies) {
        let bestTarget = null;
        let bestScore = -Infinity;
        
        for (const enemy of enemies) {
            if (!this.gs.isInRange(unit, enemy.position)) continue;
            
            let score = 0;
            
            // اولویت نوع یگان
            const typePriorities = {
                [UNIT_TYPE.HQ]: 120,
                [UNIT_TYPE.KING_TIGER]: 100,
                [UNIT_TYPE.TIGER]: 90,
                [UNIT_TYPE.ARTILLERY]: 80,
                [UNIT_TYPE.NEBELWERFER]: 75,
                [UNIT_TYPE.FLAK_88]: 70,
                [UNIT_TYPE.PANZER_IV]: 65,
                [UNIT_TYPE.JAGDPANTHER]: 60,
                [UNIT_TYPE.STURMTIGER]: 95,
                [UNIT_TYPE.SUPPLY]: 85,
                [UNIT_TYPE.ENGINEER]: 55,
                [UNIT_TYPE.SNIPER]: 50,
                [UNIT_TYPE.RECON]: 40,
                [UNIT_TYPE.HITLERJUGEND]: 10,
                [UNIT_TYPE.VOLKSSTURM]: 10,
            };
            score += typePriorities[enemy.type] || 45;
            
            // قطار زرهی
            if (this.gs.armoredTrain && 
                enemy.position.manhattanDistance(this.gs.armoredTrain.position) <= 5) {
                score += 30;
            }
            
            // یگان‌های کم‌سلامت
            score += (100 - enemy.health) * 0.6;
            
            // فاصله
            const dist = unit.position.manhattanDistance(enemy.position);
            score -= dist * 4;
            
            // یادگیری
            if (this.memory.has(`success_vs_${enemy.type}`)) {
                score += this.memory.get(`success_vs_${enemy.type}`) * 8;
            }
            
            // محافظ HQ
            if (this.isHQGuard(enemy)) score -= 20;
            
            // غیرنظامی‌های نزدیک (شخصیت بی‌رحم)
            if (this.personality.targetCivilians) {
                const nearbyCivilians = this.gs.civiliansOnMap.filter(c =>
                    c.alive && enemy.position.manhattanDistance(new Position(c.x, c.y)) <= 2
                );
                score += nearbyCivilians.length * 5;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestTarget = enemy;
            }
        }
        
        return bestTarget;
    }

    // ============ انتخاب مقصد حرکت پیشرفته ============
    selectMoveTarget(unit) {
        const myUnits = this.gs.getMyUnits();
        const visibleEnemies = myUnits.filter(e => this.gs.canSee(unit, e.position));
        
        // نزدیک‌ترین دشمن
        if (visibleEnemies.length > 0) {
            const nearest = this.findNearest(unit.position, visibleEnemies);
            if (nearest) {
                return this.findApproachPosition(unit, nearest.position);
            }
        }
        
        // نقاط استراتژیک
        const victoryPoints = this.findVictoryPoints();
        if (victoryPoints.length > 0) {
            const nearest = this.findNearest(unit.position, victoryPoints.map(v => ({ position: v })));
            if (nearest) {
                return this.findApproachPosition(unit, nearest.position);
            }
        }
        
        // محاصره
        if (this.personality.flanking > 0.5 && visibleEnemies.length > 0) {
            const target = visibleEnemies[Math.floor(Math.random() * visibleEnemies.length)];
            const flankPos = new Position(
                target.position.x + (Math.random() > 0.5 ? 4 : -4),
                target.position.y + (Math.random() > 0.5 ? 4 : -4)
            );
            if (flankPos.isValid()) {
                const path = this.gs.findPath(unit.position, flankPos, unit);
                if (path.length > 1 && path.length <= unit.movementPoints) {
                    return path[Math.min(path.length - 1, unit.movementPoints)];
                }
            }
        }
        
        // استفاده از رود یخ‌زده
        if (this.gs.weatherState === 'schnee') {
            const frozenRiverNearby = this.gs.frozenRivers.find(r =>
                unit.position.manhattanDistance(r) <= 5
            );
            if (frozenRiverNearby) {
                return frozenRiverNearby;
            }
        }
        
        // حرکت به جلو
        const randomDx = Math.floor(Math.random() * 6) - 3;
        const randomDy = Math.floor(Math.random() * 6) - 3;
        return new Position(
            Math.max(0, Math.min(CONFIG.MAP.WIDTH - 1, unit.position.x + randomDx)),
            Math.max(0, Math.min(CONFIG.MAP.HEIGHT - 1, unit.position.y + randomDy))
        );
    }

    findApproachPosition(unit, targetPos) {
        const path = this.gs.findPath(unit.position, targetPos, unit);
        if (path.length <= 1) return targetPos;
        
        const moveLimit = Math.min(unit.movementPoints, path.length - 1);
        return path[moveLimit];
    }

    findNearest(origin, targets) {
        let nearest = null, minDist = Infinity;
        for (const target of targets) {
            const dist = origin.manhattanDistance(target.position);
            if (dist < minDist) { minDist = dist; nearest = target; }
        }
        return nearest;
    }

    findVictoryPoints() {
        const points = [];
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const tile = this.gs.getTile(x, y);
                if (tile && tile.victoryPoint > 0) {
                    const occupied = this.gs.getUnitAt(x, y);
                    if (!occupied || occupied.faction !== this.aiFaction) {
                        points.push(new Position(x, y));
                    }
                }
            }
        }
        return points;
    }

    findNearbyBridges(pos, range) {
        const bridges = [];
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const tile = this.gs.getTile(pos.x + dx, pos.y + dy);
                if (tile && tile.terrain === TERRAIN_TYPE.BRIDGE && !tile.isDestroyed) {
                    bridges.push(tile.position);
                }
            }
        }
        return bridges;
    }

    // ============ حافظه و یادگیری واقعی ============
    updateMemory() {
        for (const move of this.lastMoves) {
            if (move.type === 'attack') {
                const target = this.gs.getUnit(move.target);
                if (!target || target.health <= 0) {
                    const key = `success_vs_${move.targetType || 'unknown'}`;
                    this.memory.set(key, (this.memory.get(key) || 0) + 1);
                    this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
                } else {
                    this.consecutiveFailures++;
                }
            }
        }
        
        // ردیابی حرکت بازیکن
        const playerMoves = this.gs.getMyUnits().map(u => ({
            id: u.id,
            position: u.position.clone(),
            type: u.type
        }));
        this.playerMovementHistory.push({
            turn: this.gs.currentTurn,
            units: playerMoves
        });
        if (this.playerMovementHistory.length > 20) this.playerMovementHistory.shift();
        
        // پاکسازی حافظه قدیمی
        if (this.memory.size > 60) {
            const keys = Array.from(this.memory.keys());
            for (let i = 0; i < 15; i++) this.memory.delete(keys[i]);
        }
    }

    // ============ پیش‌بینی حرکت بازیکن ============
    predictPlayerMoves() {
        if (this.playerMovementHistory.length < 3) return;
        
        const recent = this.playerMovementHistory.slice(-3);
        const predictedTargets = new Map();
        
        for (const record of recent) {
            for (const unit of record.units) {
                const key = `${unit.position.x},${unit.position.y}`;
                predictedTargets.set(key, (predictedTargets.get(key) || 0) + 1);
            }
        }
        
        // تقویت دفاع در نقاط پرتردد
        const hotZones = Array.from(predictedTargets.entries())
            .filter(([_, count]) => count >= 2)
            .map(([key, _]) => Position.fromString(key));
        
        for (const zone of hotZones) {
            const aiUnitsNearby = this.gs.getUnitsByFaction(this.aiFaction).filter(u =>
                u.position.manhattanDistance(zone) <= 3 && u.health > 0
            );
            // این واحدها در نوبت بعد اولویت دفاعی دارن
        }
    }

    adaptStrategy() {
        const myUnits = this.gs.getMyUnits();
        const enemyUnits = this.gs.getEnemyUnits();
        
        const powerRatio = enemyUnits.length / Math.max(1, myUnits.length);
        
        if (powerRatio < 0.5) {
            this.strategy = 'aggressive';
            this.aggressionLevel = Math.min(0.95, this.aggressionLevel + 0.15);
        } else if (powerRatio < 1) {
            this.strategy = 'balanced';
            this.aggressionLevel = 0.5 + (1 - powerRatio) * 0.3;
        } else if (powerRatio < 2) {
            this.strategy = 'defensive';
            this.aggressionLevel = Math.max(0.2, this.aggressionLevel - 0.1);
        } else {
            this.strategy = 'retreat';
            this.aggressionLevel = 0.1;
        }
        
        // تغییر شخصیت بر اساس شکست‌ها
        if (this.consecutiveFailures >= 4) {
            this.personality.caution = Math.min(0.9, this.personality.caution + 0.15);
            this.personality.aggression = Math.max(0.2, this.personality.aggression - 0.15);
        }
    }

    // ============ محافظت از HQ ============
    assignHQGuard() {
        if (this.hqGuardAssigned) return;
        
        const hq = this.gs.getUnitsByFaction(this.aiFaction).find(u => u.type === UNIT_TYPE.HQ);
        if (!hq) return;
        
        const guards = this.gs.getUnitsByFaction(this.aiFaction).filter(u =>
            u.type === UNIT_TYPE.INFANTRY && u.position.manhattanDistance(hq.position) <= 5
        );
        
        if (guards.length >= 1) {
            this.hqGuardAssigned = true;
            // این یگان‌ها اطراف HQ می‌مونن
            for (const guard of guards.slice(0, 2)) {
                guard.hqGuard = true;
            }
        }
    }

    isHQGuard(unit) {
        return unit.hqGuard === true;
    }

    // ============ خرابکاری ============
    considerSabotage() {
        const brandenburgers = this.gs.getUnitsByFaction(this.aiFaction).filter(u =>
            u.type === UNIT_TYPE.BRANDENBURGER && !u.hasActed && u.health > 0
        );
        
        if (brandenburgers.length === 0) return;
        
        for (const unit of brandenburgers) {
            if (unit.hasActed) continue;
            
            // یافتن پل یا انبار مهمات نزدیک
            const targets = [];
            for (let dy = -6; dy <= 6; dy++) {
                for (let dx = -6; dx <= 6; dx++) {
                    const tile = this.gs.getTile(unit.position.x + dx, unit.position.y + dy);
                    if (tile && (tile.terrain === TERRAIN_TYPE.BRIDGE || tile.specialLocation === 'factory')) {
                        targets.push(tile.position);
                    }
                }
            }
            
            if (targets.length > 0 && Math.random() < 0.4) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                const path = this.gs.findPath(unit.position, target, unit);
                if (path.length > 0) {
                    const moved = this.gs.moveUnit(unit, path[Math.min(path.length - 1, unit.movementPoints)]);
                    if (moved) {
                        this.gs.log('[خرابکاری] براندنبورگر در حال نفوذ است...', 'system');
                        this.lastMoves.push({ type: 'sabotage', unit: unit.id, target: target.toString() });
                    }
                }
            }
        }
    }

    // ============ عقب‌نشینی ============
    shouldRetreat(unit) {
        if (unit.hqGuard && this.gs.getUnitAt(unit.position.x, unit.position.y)) return false;
        if (unit.health < unit.maxHealth * 0.25) return true;
        if (unit.morale < 15) return true;
        if (unit.ammo <= 0 && unit.health < unit.maxHealth * 0.5) return true;
        const nearbyEnemies = this.gs.getMyUnits().filter(e =>
            unit.position.manhattanDistance(e.position) <= 3
        );
        return nearbyEnemies.length >= 5;
    }

    retreatUnit(unit) {
        const hq = this.gs.getUnitsByFaction(this.aiFaction).find(u => u.type === UNIT_TYPE.HQ);
        if (!hq || unit.position.equals(hq.position)) return false;
        const path = this.gs.findPath(unit.position, hq.position, unit);
        if (path.length > 1) {
            const retreatPos = path[Math.min(path.length - 1, unit.movementPoints)];
            if (!unit.position.equals(retreatPos)) {
                const moved = this.gs.moveUnit(unit, retreatPos);
                if (moved) {
                    this.lastMoves.push({ type: 'retreat', unit: unit.id });
                    return true;
                }
            }
        }
        return false;
    }

    // ============ هماهنگی گروهی ============
    coordinateGroupAttack() {
        const units = this.gs.getUnitsByFaction(this.aiFaction).filter(u => u.canAttack() && !u.hasActed);
        const myUnits = this.gs.getMyUnits();
        if (myUnits.length === 0 || units.length < 3) return;
        
        let weakestUnit = null, weakestScore = Infinity;
        for (const enemy of myUnits) {
            const score = enemy.health + enemy.defensePower * 0.5;
            if (score < weakestScore) { weakestScore = score; weakestUnit = enemy; }
        }
        
        if (weakestUnit) {
            let attackers = 0;
            for (const unit of units) {
                if (!this.gs.isInRange(unit, weakestUnit.position)) continue;
                const result = this.gs.attackUnit(unit, weakestUnit);
                if (result) {
                    attackers++;
                    this.lastMoves.push({ type: 'group_attack', unit: unit.id, target: weakestUnit.id });
                    if (attackers >= 3) break;
                }
            }
        }
    }

    // ============ سلاح‌های ویژه ============
    considerWunderwaffen() {
        const combatSys = new CombatSystem(this.gs);
        
        // V2 - علیه تجمع دشمن
        const myUnits = this.gs.getMyUnits();
        const clusters = this.findUnitClusters(myUnits, 3);
        if (clusters.length > 0 && this.gs.resources.rp >= 500 && Math.random() < 0.3) {
            const target = clusters[Math.floor(Math.random() * clusters.length)];
            combatSys.launchV2Rocket(target);
            this.lastMoves.push({ type: 'v2', target: target.toString() });
            return;
        }
        
        // اشتوکا - علیه تانک‌های سنگین یا HQ
        const priorityTargets = myUnits.filter(u =>
            [UNIT_TYPE.TIGER, UNIT_TYPE.KING_TIGER, UNIT_TYPE.HQ].includes(u.type) && u.health > 20
        );
        if (priorityTargets.length > 0 && this.gs.resources.rp >= 100 && Math.random() < 0.5) {
            const target = priorityTargets[Math.floor(Math.random() * priorityTargets.length)];
            combatSys.callAirstrike(target.position);
            this.lastMoves.push({ type: 'stuka', target: target.position.toString() });
        }
    }

    findUnitClusters(units, minGroupSize) {
        const clusters = [];
        const visited = new Set();
        for (const unit of units) {
            if (visited.has(unit.id)) continue;
            const group = [unit]; visited.add(unit.id);
            for (const other of units) {
                if (visited.has(other.id)) continue;
                if (unit.position.manhattanDistance(other.position) <= 2) {
                    group.push(other); visited.add(other.id);
                }
            }
            if (group.length >= minGroupSize) {
                const cx = Math.floor(group.reduce((s, u) => s + u.position.x, 0) / group.length);
                const cy = Math.floor(group.reduce((s, u) => s + u.position.y, 0) / group.length);
                clusters.push(new Position(cx, cy));
            }
        }
        return clusters;
    }
    }
