// sturmglanz/js/renderer.js
// موتور رندر Canvas - نقشه، کاشی‌ها، یگان‌ها، مه جنگ، HUD، مینی‌مپ، جلوه‌های بصری
'use strict';

class Renderer {
    constructor(gameState) {
        this.gs = gameState;
        this.canvas = null;
        this.ctx = null;
        this.minimapCanvas = null;
        this.minimapCtx = null;
        this.width = 0;
        this.height = 0;
        this.tileSize = CONFIG.MAP.TILE_SIZE;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.targetCamera = { x: 0, y: 0 };
        this.animations = [];
        this.particles = [];
        this.shakeAmount = 0;
        this.shakeDuration = 0;

        // رنگ‌ها
        this.colors = {
            plains: '#4a5a3a',
            forest: '#2a3a1a',
            hill: '#5a4a3a',
            mountain: '#6a6a6a',
            river: '#3a5a8a',
            city: '#5a5a4a',
            ruins: '#4a4a4a',
            bridge: '#6a5a3a',
            marsh: '#3a4a2a',
            road: '#5a5a3a',
            bunker: '#4a4a5a',
            trench: '#3a3a2a',
            minefield: '#5a3a3a',
            cemetery: '#4a4a4a',
            factory: '#5a4a3a',

            fog: 'rgba(0,0,0,0.8)',
            fogExplored: 'rgba(0,0,0,0.4)',
            grid: 'rgba(255,255,255,0.05)',
            selection: 'rgba(200,168,78,0.6)',
            moveHighlight: 'rgba(100,200,100,0.3)',
            attackHighlight: 'rgba(200,50,50,0.3)',
            hoverHighlight: 'rgba(255,255,255,0.1)',
            unitWehrmacht: '#4a6a4a',
            unitSoviet: '#6a3a3a',
            healthBar: '#3a8a3a',
            healthBarLow: '#8a3a3a',
            moraleBar: '#6a6a3a',
            ammoBar: '#8a8a3a',
            frozen: 'rgba(150,200,255,0.4)',
            burning: 'rgba(255,100,0,0.5)',
            destroyed: 'rgba(100,0,0,0.6)'
        };
    }

    // ============ راه‌اندازی ============
    init() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Canvas #game-canvas پیدا نشد!');
            return false;
        }
        this.ctx = this.canvas.getContext('2d');

        this.minimapCanvas = document.getElementById('minimap-canvas');
        if (this.minimapCanvas) {
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // مرکز دوربین روی HQ
        const hq = this.gs.getMyUnits().find(u => u.type === UNIT_TYPE.HQ);
        if (hq) {
            this.camera.x = hq.position.x * this.tileSize - this.width / 2 + this.tileSize / 2;
            this.camera.y = hq.position.y * this.tileSize - this.height / 2 + this.tileSize / 2;
        }

        return true;
    }

    resize() {
        const container = this.canvas.parentElement;
        if (container) {
            this.width = container.clientWidth;
            this.height = container.clientHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }

        if (this.minimapCanvas && this.minimapCanvas.parentElement) {
            const mmContainer = this.minimapCanvas.parentElement;
            this.minimapCanvas.width = mmContainer.clientWidth;
            this.minimapCanvas.height = mmContainer.clientHeight;
        }
    }

    // ============ حلقه اصلی رندر ============
    render() {
        if (!this.ctx) return;

        // حرکت نرم دوربین
        this.smoothCamera();

        // پاکسازی صفحه
        this.ctx.clearRect(0, 0, this.width, this.height);

        // زمینه
        this.ctx.fillStyle = '#0a100a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // اعمال لرزش صفحه
        let shakeX = 0, shakeY = 0;
        if (this.shakeDuration > 0) {
            shakeX = (Math.random() - 0.5) * this.shakeAmount * 2;
            shakeY = (Math.random() - 0.5) * this.shakeAmount * 2;
            this.shakeDuration--;
        }

        // ذخیره وضعیت
        this.ctx.save();
        this.ctx.translate(-this.camera.x + shakeX + this.width / 2, -this.camera.y + shakeY + this.height / 2);

        // رندر کاشی‌ها
        this.renderTiles();

        // رندر یگان‌ها
        this.renderUnits();

        // رندر غیرنظامیان
        this.renderCivilians();

        // رندر قطار زرهی
        this.renderArmoredTrain();

        // رندر مه جنگ
        this.renderFogOfWar();

        // رندر highlights (حرکت، حمله)
        this.renderHighlights();

        // رندر افکت‌ها
        this.renderEffects();

        // بازگردانی
        this.ctx.restore();

        // رندر HUD
        this.renderHUD();

        // رندر مینی‌مپ
        this.renderMinimap();
    }

    // ============ حرکت نرم دوربین ============
    smoothCamera() {
        this.camera.x += (this.targetCamera.x - this.camera.x) * 0.1;
        this.camera.y += (this.targetCamera.y - this.camera.y) * 0.1;

        // محدود کردن دوربین به نقشه
        const maxX = CONFIG.MAP.WIDTH * this.tileSize - this.width;
        const maxY = CONFIG.MAP.HEIGHT * this.tileSize - this.height;
        this.targetCamera.x = Math.max(0, Math.min(maxX, this.targetCamera.x));
        this.targetCamera.y = Math.max(0, Math.min(maxY, this.targetCamera.y));
    }

    moveCameraTo(x, y) {
        this.targetCamera.x = x * this.tileSize;
        this.targetCamera.y = y * this.tileSize;
    }

    centerOnUnit(unit) {
        if (!unit) return;
        this.moveCameraTo(unit.position.x, unit.position.y);
    }

    zoomIn() { this.camera.zoom = Math.min(2, this.camera.zoom + 0.1); }
    zoomOut() { this.camera.zoom = Math.max(0.5, this.camera.zoom - 0.1); }

    // ============ رندر کاشی‌ها ============
    renderTiles() {
        const startX = Math.max(0, Math.floor(this.camera.x / this.tileSize) - 1);
        const startY = Math.max(0, Math.floor(this.camera.y / this.tileSize) - 1);
        const endX = Math.min(CONFIG.MAP.WIDTH, Math.ceil((this.camera.x + this.width) / this.tileSize) + 1);
        const endY = Math.min(CONFIG.MAP.HEIGHT, Math.ceil((this.camera.y + this.height) / this.tileSize) + 1);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.gs.getTile(x, y);
                if (!tile) continue;

                const px = x * this.tileSize;
                const py = y * this.tileSize;

                // کاشی اصلی
                this.renderTile(tile, px, py);

                // خطوط شبکه
                this.ctx.strokeStyle = this.colors.grid;
                this.ctx.lineWidth = 0.5;
                this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);

                // نقاط پیروزی
                if (tile.victoryPoint > 0) {
                    this.ctx.fillStyle = 'rgba(200,168,78,0.3)';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = '#c8a84e';
                    this.ctx.font = 'bold 12px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('⭐', px + this.tileSize / 2, py + this.tileSize / 2 + 4);
                }
            }
        }
    }

    renderTile(tile, px, py) {
        // رنگ زمین
        const terrainColors = {
            [TERRAIN_TYPE.PLAINS]: this.colors.plains,
            [TERRAIN_TYPE.FOREST]: this.colors.forest,
            [TERRAIN_TYPE.HILL]: this.colors.hill,
            [TERRAIN_TYPE.MOUNTAIN]: this.colors.mountain,
            [TERRAIN_TYPE.RIVER]: this.colors.river,
            [TERRAIN_TYPE.CITY]: this.colors.city,
            [TERRAIN_TYPE.RUINS]: this.colors.ruins,
            [TERRAIN_TYPE.BRIDGE]: this.colors.bridge,
            [TERRAIN_TYPE.MARSH]: this.colors.marsh,
            [TERRAIN_TYPE.ROAD]: this.colors.road,
            [TERRAIN_TYPE.BUNKER]: this.colors.bunker,
            [TERRAIN_TYPE.TRENCH]: this.colors.trench,
            [TERRAIN_TYPE.MINEFIELD]: this.colors.minefield,
            [TERRAIN_TYPE.CEMETERY]: this.colors.cemetery,
            [TERRAIN_TYPE.FACTORY]: this.colors.factory
        };

        let tileColor = terrainColors[tile.terrain] || this.colors.plains;

        // افکت سوختگی
        if (tile.isBurning) {
            tileColor = this.blendColors(tileColor, '#ff4400', 0.5);
        }

        // افکت یخ‌زدگی
        if (tile.isFrozen) {
            tileColor = this.blendColors(tileColor, '#aaccff', 0.3);
        }

        // پل تخریب‌شده
        if (tile.isDestroyed && tile.terrain === TERRAIN_TYPE.BRIDGE) {
            tileColor = this.colors.destroyed;
        }

        this.ctx.fillStyle = tileColor;
        this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

        // نمادهای خاص
        this.renderTileIcon(tile, px, py);

        // پناهگاه و سنگر - بافت خاص
        if (tile.terrain === TERRAIN_TYPE.BUNKER) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(px + 8, py + 8, this.tileSize - 16, this.tileSize - 16);
            this.ctx.strokeStyle = '#888';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(px + 8, py + 8, this.tileSize - 16, this.tileSize - 16);
        }

        if (tile.terrain === TERRAIN_TYPE.TRENCH) {
            this.ctx.strokeStyle = '#555';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                this.ctx.moveTo(px + 10, py + 10 + i * 15);
                this.ctx.lineTo(px + this.tileSize - 10, py + 10 + i * 15);
            }
            this.ctx.stroke();
        }
    }

    renderTileIcon(tile, px, py) {
        const cx = px + this.tileSize / 2;
        const cy = py + this.tileSize / 2;

        // کلیسا
        if (tile.specialLocation === 'church') {
            this.ctx.fillStyle = '#ddd';
            this.ctx.fillRect(cx - 3, cy - 12, 6, 20);
            this.ctx.fillRect(cx - 8, cy - 15, 16, 5);
            this.ctx.fillText('✝', cx - 6, cy - 16);
        }

        // کارخانه
        if (tile.specialLocation === 'factory') {
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(cx - 10, cy - 5, 20, 15);
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(cx - 2, cy - 12, 4, 7);
            // دود
            if (tile.factoryState?.active && !tile.isBurning) {
                this.ctx.fillStyle = 'rgba(200,200,200,0.5)';
                this.ctx.beginPath();
                this.ctx.arc(cx, cy - 15, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // بیمارستان
        if (tile.specialLocation === 'hospital') {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(cx - 6, cy - 6, 12, 12);
            this.ctx.fillStyle = '#d44';
            this.ctx.fillRect(cx - 1, cy - 5, 2, 10);
            this.ctx.fillRect(cx - 5, cy - 1, 10, 2);
        }

        // نانوایی
        if (tile.specialLocation === 'bakery') {
            this.ctx.fillStyle = '#da5';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy - 2, 8, Math.PI, 0);
            this.ctx.fill();
            this.ctx.fillStyle = '#c94';
            this.ctx.fillRect(cx - 6, cy, 12, 5);
        }

        // گورستان بزرگ
        if (tile.specialLocation === 'cemetery_large') {
            for (let i = 0; i < 3; i++) {
                this.ctx.fillStyle = '#999';
                this.ctx.fillRect(cx - 8 + i * 8, cy - 6, 3, 8);
                this.ctx.beginPath();
                this.ctx.arc(cx - 6 + i * 8, cy - 7, 3, Math.PI, 0);
                this.ctx.fill();
            }
        }

        // میدان مین - علامت خطر
        if (tile.terrain === TERRAIN_TYPE.MINEFIELD) {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⚠', cx, cy + 4);
        }
    }

    // ============ رندر یگان‌ها ============
    renderUnits() {
        const allUnits = [...this.gs.getMyUnits(), ...this.gs.getEnemyUnits()];

        for (const unit of allUnits) {
            if (unit.health <= 0 || unit.isMIA) continue;

            // چک visibility
            if (unit.faction === FACTION.SOVIET) {
                if (!this.gs.mapManager?.isTileVisible(unit.position.x, unit.position.y, FACTION.WEHRMACHT)) {
                    continue; // دشمن دیده نمی‌شود
                }
            }

            const px = unit.position.x * this.tileSize;
            const py = unit.position.y * this.tileSize;

            this.renderUnit(unit, px, py);

            // انتخاب
            if (this.gs.selectedUnit && this.gs.selectedUnit.id === unit.id) {
                this.ctx.strokeStyle = this.colors.selection;
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 3]);
                this.ctx.strokeRect(px - 2, py - 2, this.tileSize + 4, this.tileSize + 4);
                this.ctx.setLineDash([]);
            }
        }
    }

    renderUnit(unit, px, py) {
        const cx = px + this.tileSize / 2;
        const cy = py + this.tileSize / 2;
        const r = this.tileSize / 2 - 4;

        // رنگ بر اساس جناح
        const factionColor = unit.faction === FACTION.WEHRMACHT ? '#4a6a4a' : '#6a3a3a';

        // سایه
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.beginPath();
        this.ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
        this.ctx.fill();

        // دایره اصلی
        this.ctx.fillStyle = factionColor;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fill();

        // حاشیه
        this.ctx.strokeStyle = unit.isSuppressed ? '#888' : '#000';
        this.ctx.lineWidth = unit.entrenched ? 3 : 1.5;
        this.ctx.stroke();

        // نماد یگان
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const icons = {
            [UNIT_TYPE.INFANTRY]: '👤',
            [UNIT_TYPE.PANZERGRENADIER]: '🛡️',
            [UNIT_TYPE.PANZER_IV]: '🔲',
            [UNIT_TYPE.TIGER]: '🔳',
            [UNIT_TYPE.KING_TIGER]: '⬛',
            [UNIT_TYPE.ARTILLERY]: '◎',
            [UNIT_TYPE.FLAK_88]: '⬡',
            [UNIT_TYPE.RECON]: '👁',
            [UNIT_TYPE.ENGINEER]: '🔧',
            [UNIT_TYPE.HQ]: '🏰',
            [UNIT_TYPE.SUPPLY]: '📦',
            [UNIT_TYPE.SNIPER]: '⊕',
            [UNIT_TYPE.MORTAR]: '⌾',
            [UNIT_TYPE.NEBELWERFER]: '⊛',
            [UNIT_TYPE.PANZERFAUST]: '●',
            [UNIT_TYPE.STUG]: '▣',
            [UNIT_TYPE.JAGDPANTHER]: '◈',
            [UNIT_TYPE.WIRBELWIND]: '◉',
            [UNIT_TYPE.STURMTIGER]: '⬟',
            [UNIT_TYPE.HITLERJUGEND]: '👶',
            [UNIT_TYPE.VOLKSSTURM]: '👴',
            [UNIT_TYPE.BRANDENBURGER]: '🗡',
            [UNIT_TYPE.FELDGENDARMERIE]: '⚖'
        };

        const icon = icons[unit.type] || '●';
        this.ctx.fillText(icon, cx, cy - 6);

        // حالت‌های خاص
        if (unit.camoActive) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('👻', cx, cy + 10);
        }

        if (unit.overwatchActive) {
            this.ctx.strokeStyle = '#ff0';
            this.ctx.lineWidth = 2;
            const eyeR = r + 6;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, eyeR, -0.3, 0.3);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, eyeR, Math.PI - 0.3, Math.PI + 0.3);
            this.ctx.stroke();
        }

        // نوار سلامتی
        const barWidth = this.tileSize - 10;
        const barHeight = 5;
        const barX = px + 5;
        const barY = py + this.tileSize - 8;

        // زمینه نوار
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // نوار سلامتی
        const healthPercent = unit.health / unit.maxHealth;
        const healthColor = healthPercent > 0.5 ? this.colors.healthBar : this.colors.healthBarLow;
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // نوار روحیه (زیر نوار سلامتی)
        if (unit.morale < 50) {
            const moraleBarY = barY + barHeight + 2;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(barX, moraleBarY, barWidth, 3);
            this.ctx.fillStyle = this.colors.moraleBar;
            this.ctx.fillRect(barX, moraleBarY, barWidth * (unit.morale / 100), 3);
        }

        // نوار مهمات (اگر کم باشد)
        if (unit.ammo < unit.maxAmmo * 0.25) {
            const ammoBarY = barY + barHeight + (unit.morale < 50 ? 5 : 0) + 2;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(barX, ammoBarY, barWidth, 2);
            this.ctx.fillStyle = '#f80';
            this.ctx.fillRect(barX, ammoBarY, barWidth * (unit.ammo / unit.maxAmmo), 2);
        }
    }

    // ============ رندر غیرنظامیان ============
    renderCivilians() {
        if (!this.gs.civiliansOnMap) return;

        for (const civ of this.gs.civiliansOnMap) {
            if (!civ.alive) continue;

            const px = civ.x * this.tileSize + this.tileSize / 2;
            const py = civ.y * this.tileSize + this.tileSize / 2;

            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = '#000';
            this.ctx.font = '8px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🚶', px, py - 8);
        }
    }

    // ============ رندر قطار زرهی ============
    renderArmoredTrain() {
        const train = this.gs.armoredTrain;
        if (!train || !train.active) return;

        const px = train.position.x * this.tileSize;
        const py = train.position.y * this.tileSize;

        this.ctx.fillStyle = '#3a3a3a';
        this.ctx.fillRect(px + 5, py + 20, this.tileSize - 10, 20);
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(px + 15, py + 12, this.tileSize - 30, 10);
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.arc(px + 12, py + 40, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(px + this.tileSize - 12, py + 40, 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🚂', px + this.tileSize / 2, py + 25);
    }

    // ============ رندر مه جنگ ============
    renderFogOfWar() {
        if (!this.gs.mapManager) return;

        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const visible = this.gs.mapManager.isTileVisible(x, y, FACTION.WEHRMACHT);
                const explored = this.gs.mapManager.isTileExplored(x, y);

                if (!visible) {
                    const px = x * this.tileSize;
                    const py = y * this.tileSize;

                    if (explored) {
                        // دیده شده قبلی - نیمه شفاف
                        this.ctx.fillStyle = this.colors.fogExplored;
                    } else {
                        // کاملاً پنهان
                        this.ctx.fillStyle = this.colors.fog;
                    }
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                }
            }
        }
    }

    // ============ رندر highlights ============
    renderHighlights() {
        // خانه‌های قابل حرکت
        if (this.gs.availableMoves) {
            for (const move of this.gs.availableMoves) {
                const px = move.pos.x * this.tileSize;
                const py = move.pos.y * this.tileSize;
                this.ctx.fillStyle = this.colors.moveHighlight;
                this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
            }
        }

        // خانه‌های قابل حمله
        if (this.gs.availableAttacks) {
            for (const target of this.gs.availableAttacks) {
                const px = target.position.x * this.tileSize;
                const py = target.position.y * this.tileSize;
                this.ctx.fillStyle = this.colors.attackHighlight;
                this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
            }
        }

        // هاور
        if (this.gs.hoveredTile) {
            const px = this.gs.hoveredTile.x * this.tileSize;
            const py = this.gs.hoveredTile.y * this.tileSize;
            this.ctx.strokeStyle = this.colors.hoverHighlight;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
        }
    }

    // ============ رندر افکت‌ها ============
    renderEffects() {
        // آتش روی کاشی‌ها
        for (const pos of this.gs.burningTiles || []) {
            const tile = this.gs.getTile(pos.x, pos.y);
            if (!tile || !tile.isBurning) continue;

            const px = pos.x * this.tileSize;
            const py = pos.y * this.tileSize;
            const alpha = 0.3 + Math.sin(Date.now() / 200 + pos.x + pos.y) * 0.2;

            this.ctx.fillStyle = `rgba(255,${100 + Math.floor(Math.random() * 100)},0,${alpha})`;
            this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

            // ذرات آتش
            if (Math.random() < 0.3) {
                this.addFireParticle(px + Math.random() * this.tileSize, py + this.tileSize);
            }
        }

        // یخ روی رودخانه‌ها
        for (const pos of this.gs.frozenRivers || []) {
            const px = pos.x * this.tileSize;
            const py = pos.y * this.tileSize;
            this.ctx.fillStyle = 'rgba(200,220,255,0.3)';
            this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

            // ترک‌های یخ
            this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(px + 10, py + 15);
            this.ctx.lineTo(px + 30, py + 25);
            this.ctx.moveTo(px + 40, py + 10);
            this.ctx.lineTo(px + 20, py + 50);
            this.ctx.stroke();
        }

        // ذرات
        this.updateAndRenderParticles();

        // باران
        if (this.gs.weatherState === 'regen') {
            this.renderRain();
        }

        // برف
        if (this.gs.weatherState === 'schnee') {
            this.renderSnow();
        }
    }

    addFireParticle(x, y) {
        this.particles.push({
            type: 'fire',
            x, y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 2 + Math.random() * 4
        });
        if (this.particles.length > 200) this.particles.shift();
    }

    updateAndRenderParticles() {
        for (const p of [...this.particles]) {
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(this.particles.indexOf(p), 1);
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;

            const alpha = p.life / p.maxLife;
            if (p.type === 'fire') {
                this.ctx.fillStyle = `rgba(255,${Math.floor(150 * alpha)},0,${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    renderRain() {
        this.ctx.strokeStyle = 'rgba(100,150,255,0.3)';
        this.ctx.lineWidth = 1;
        const offsetX = this.camera.x - this.width / 2;
        const offsetY = this.camera.y - this.height / 2;

        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.width;
            const y = (Math.random() * this.height + Date.now() / 50) % this.height;
            this.ctx.beginPath();
            this.ctx.moveTo(x + offsetX, y + offsetY);
            this.ctx.lineTo(x - 2 + offsetX, y + 10 + offsetY);
            this.ctx.stroke();
        }
    }

    renderSnow() {
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const offsetX = this.camera.x - this.width / 2;
        const offsetY = this.camera.y - this.height / 2;

        for (let i = 0; i < 60; i++) {
            const x = Math.random() * this.width;
            const y = (Math.random() * this.height + Date.now() / 30) % this.height;
            const size = 2 + Math.random() * 3;
            this.ctx.beginPath();
            this.ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // ============ رندر HUD ============
    renderHUD() {
        // اطلاعات یگان انتخاب‌شده
        const unit = this.gs.selectedUnit;
        if (unit) {
            this.renderUnitTooltip(unit);
        }

        // پنل بالای صفحه
        this.renderTopPanel();
    }

    renderUnitTooltip(unit) {
        const px = unit.position.x * this.tileSize + this.tileSize;
        const py = unit.position.y * this.tileSize - 20;

        const screenX = px - this.camera.x + this.width / 2;
        const screenY = py - this.camera.y + this.height / 2;

        // محدود کردن به صفحه
        const x = Math.max(10, Math.min(this.width - 160, screenX));
        const y = Math.max(10, Math.min(this.height - 100, screenY));

        this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
        this.ctx.fillRect(x, y, 150, 90);
        this.ctx.strokeStyle = '#c8a84e';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, 150, 90);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(unit.name, x + 8, y + 18);

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '9px sans-serif';
        const stats = [
            `❤ ${unit.health}/${unit.maxHealth}`,
            `⚔ ${unit.getEffectiveAttack()}`,
            `🛡 ${unit.getEffectiveDefense()}`,
            `👟 ${Math.floor(unit.movementPoints)}/${unit.maxMovementPoints}`,
            `🔫 ${unit.ammo}/${unit.maxAmmo}`,
            `💪 ${unit.morale}%`
        ];

        for (let i = 0; i < stats.length; i++) {
            this.ctx.fillText(stats[i], x + 8, y + 35 + i * 10);
        }
    }

    renderTopPanel() {
        // بروزرسانی منابع در HTML
        const rpEl = document.getElementById('res-rp');
        const fuelEl = document.getElementById('res-fuel');
        const ammoEl = document.getElementById('res-ammo');
        const turnEl = document.getElementById('res-turn');

        if (rpEl) rpEl.textContent = this.gs.resources.rp;
        if (fuelEl) fuelEl.textContent = this.gs.resources.fuel;
        if (ammoEl) ammoEl.textContent = this.gs.resources.ammo;
        if (turnEl) turnEl.textContent = this.gs.currentTurn;
    }

    // ============ رندر مینی‌مپ ============
    renderMinimap() {
        if (!this.minimapCtx || !this.minimapCanvas) return;

        const mw = this.minimapCanvas.width;
        const mh = this.minimapCanvas.height;
        const scaleX = mw / CONFIG.MAP.WIDTH;
        const scaleY = mh / CONFIG.MAP.HEIGHT;

        this.minimapCtx.clearRect(0, 0, mw, mh);

        // پس‌زمینه
        this.minimapCtx.fillStyle = '#111';
        this.minimapCtx.fillRect(0, 0, mw, mh);

        // کاشی‌ها
        for (let y = 0; y < CONFIG.MAP.HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP.WIDTH; x++) {
                const tile = this.gs.getTile(x, y);
                if (!tile) continue;

                const px = x * scaleX;
                const py = y * scaleY;

                // رنگ ساده بر اساس زمین
                const miniColors = {
                    [TERRAIN_TYPE.PLAINS]: '#4a5a3a',
                    [TERRAIN_TYPE.FOREST]: '#2a3a1a',
                    [TERRAIN_TYPE.HILL]: '#5a4a3a',
                    [TERRAIN_TYPE.MOUNTAIN]: '#6a6a6a',
                    [TERRAIN_TYPE.RIVER]: '#3a5a8a',
                    [TERRAIN_TYPE.CITY]: '#5a5a4a',
                    [TERRAIN_TYPE.RUINS]: '#4a4a4a',
                    [TERRAIN_TYPE.BRIDGE]: '#6a5a3a',
                    [TERRAIN_TYPE.MARSH]: '#3a4a2a',
                    [TERRAIN_TYPE.ROAD]: '#5a5a3a',
                };

                this.minimapCtx.fillStyle = miniColors[tile.terrain] || '#333';
                this.minimapCtx.fillRect(px, py, scaleX + 1, scaleY + 1);
            }
        }

        // یگان‌ها
        for (const unit of this.gs.units) {
            if (unit.health <= 0 || unit.isMIA) continue;

            const px = unit.position.x * scaleX;
            const py = unit.position.y * scaleY;
            const size = Math.max(2, scaleX);

            this.minimapCtx.fillStyle = unit.faction === FACTION.WEHRMACHT ? '#4a8' : '#a44';
            this.minimapCtx.fillRect(px, py, size, size);
        }

        // محدوده دوربین
        const camX = (this.camera.x / (CONFIG.MAP.WIDTH * this.tileSize)) * mw;
        const camY = (this.camera.y / (CONFIG.MAP.HEIGHT * this.tileSize)) * mh;
        const camW = (this.width / (CONFIG.MAP.WIDTH * this.tileSize)) * mw;
        const camH = (this.height / (CONFIG.MAP.HEIGHT * this.tileSize)) * mh;

        this.minimapCtx.strokeStyle = '#c8a84e';
        this.minimapCtx.lineWidth = 1;
        this.minimapCtx.strokeRect(camX, camY, camW, camH);
    }

    // ============ افکت‌های ویژه ============
    screenShake(amount = 10, duration = 15) {
        this.shakeAmount = amount;
        this.shakeDuration = duration;
    }

    addExplosionEffect(x, y, size = 30) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                type: 'explosion',
                x: x * this.tileSize + this.tileSize / 2,
                y: y * this.tileSize + this.tileSize / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 20 + Math.random() * 20,
                maxLife: 40,
                size: 2 + Math.random() * size / 3,
                color: Math.random() < 0.5 ? '#f80' : '#ff4'
            });
        }
    }

    // ============ ابزار ============
    blendColors(color1, color2, ratio) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        if (!c1 || !c2) return color1;

        const r = Math.floor(c1.r + (c2.r - c1.r) * ratio);
        const g = Math.floor(c1.g + (c2.g - c1.g) * ratio);
        const b = Math.floor(c1.b + (c2.b - c1.b) * ratio);

        return `rgb(${r},${g},${b})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    screenToWorld(screenX, screenY) {
        const worldX = screenX + this.camera.x - this.width / 2;
        const worldY = screenY + this.camera.y - this.height / 2;
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize)
        };
    }
}
