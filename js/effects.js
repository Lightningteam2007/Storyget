// sturmglanz/js/effects.js
// سیستم جلوه‌های ویژه کامل - انیمیشن‌های پیشرفته، ذرات، سینمایی، رابط کاربری داستانی
'use strict';

class EffectsManager {
    constructor(gameState, renderer) {
        this.gs = gameState;
        this.renderer = renderer;
        this.activeEffects = [];
        this.cinematicQueue = [];
        this.isCinematicPlaying = false;
        this.transitionAlpha = 0;
        this.transitionState = null;
        this.transitionTimer = 0;
        this.transitionDuration = 0;
        this.notificationQueue = [];
        
        // انیمیشن‌های ویژه
        this.unitAnimations = new Map(); // انیمیشن حرکت و چرخش یگان‌ها
        this.buildingCollapses = []; // انیمیشن تخریب ساختمان
        this.flags = []; // پرچم‌های تسخیر
        this.lightningBolts = []; // رعد و برق
        this.candleState = { height: 100, lit: true, lastUpdate: Date.now() };
        this.treeGrowth = 0; // رشد درخت
        this.mirrorShards = []; // تکه‌های آینه شکسته
        this.diaryPages = { current: 0, animating: false, progress: 0 };
        this.galleryScroll = 0;
        this.medalGlows = [];
        this.typedTexts = []; // تایپوگرافی جنگی
        this.sketchLines = []; // دست‌خط روی نقشه
        this.blackAndWhitePhotos = []; // عکس‌های سیاه‌سفید
        this.calendarDate = { day: 15, month: 12, year: 1944 }; // ۱۵ دسامبر ۱۹۴۴
    }

    // ============ به‌روزرسانی اصلی ============
    update() {
        this.updateParticleEffects();
        this.updateUnitAnimations();
        this.updateBuildingCollapses();
        this.updateLightning();
        this.updateCandle();
        this.updateTree();
        this.updateMirror();
        this.updateDiary();
        this.updateTypedTexts();
        this.updateCinematics();
        this.updateTransitions();
        this.updateNotifications();
        this.updateCalendar();
    }

    // ============ ذرات ============
    spawnParticles(x, y, type, count = 15) {
        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(x, y, type);
            if (particle) this.activeEffects.push(particle);
        }
    }

    createParticle(x, y, type) {
        const base = { x, y, type, life: 1.0, decay: 0.02 + Math.random() * 0.04, size: 2 + Math.random() * 4 };
        switch (type) {
            case 'explosion': return { ...base, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, color: Math.random() < 0.5 ? '#ff6600' : '#ffcc00', size: 3 + Math.random() * 8 };
            case 'smoke': return { ...base, vx: (Math.random() - 0.5) * 1, vy: -Math.random() * 2 - 0.5, color: '#666', size: 5 + Math.random() * 10, decay: 0.005 + Math.random() * 0.01 };
            case 'spark': return { ...base, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, color: '#ffff00', size: 1 + Math.random() * 2, decay: 0.05 + Math.random() * 0.1 };
            case 'blood': return { ...base, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 - 1, color: '#cc0000', size: 2 + Math.random() * 3, decay: 0.03 + Math.random() * 0.05 };
            case 'dust': return { ...base, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1, color: '#c8b896', size: 3 + Math.random() * 5, decay: 0.01 + Math.random() * 0.02 };
            case 'muzzle_flash': return { ...base, vx: 0, vy: 0, color: '#ffffaa', size: 8 + Math.random() * 10, decay: 0.15, life: 0.4 };
            default: return { ...base, vx: 0, vy: 0, color: '#fff' };
        }
    }

    updateParticleEffects() {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const p = this.activeEffects[i];
            p.life -= p.decay;
            if (p.life <= 0) { this.activeEffects.splice(i, 1); continue; }
            p.x += p.vx || 0;
            p.y += p.vy || 0;
        }
    }

    renderParticles(ctx, camera) {
        for (const p of this.activeEffects) {
            const screenX = p.x - camera.x + (ctx.canvas?.width / 2 || 400);
            const screenY = p.y - camera.y + (ctx.canvas?.height / 2 || 300);
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            if (p.type === 'muzzle_flash') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(screenX, screenY, p.size * p.life * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
    }

    // ============ انیمیشن‌های یگان ============
    startUnitMove(unit, fromX, fromY, toX, toY) {
        this.unitAnimations.set(unit.id, {
            type: 'move',
            unit,
            startX: fromX * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            startY: fromY * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            endX: toX * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            endY: toY * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            progress: 0,
            duration: 20
        });
    }

    startUnitDeath(unit) {
        this.unitAnimations.set(unit.id, {
            type: 'death',
            unit,
            x: unit.position.x * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            y: unit.position.y * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            progress: 0,
            duration: 30
        });
    }

    startUnitShoot(attacker, defender) {
        this.unitAnimations.set(`shoot_${Date.now()}`, {
            type: 'shoot',
            startX: attacker.position.x * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            startY: attacker.position.y * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            endX: defender.position.x * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            endY: defender.position.y * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            progress: 0,
            duration: 10
        });
    }

    updateUnitAnimations() {
        for (const [key, anim] of this.unitAnimations) {
            anim.progress++;
            if (anim.progress >= anim.duration) {
                this.unitAnimations.delete(key);
            }
        }
    }

    renderUnitAnimations(ctx, camera) {
        for (const [key, anim] of this.unitAnimations) {
            const t = Math.min(1, anim.progress / anim.duration);
            const offsetX = camera.x - (ctx.canvas?.width / 2 || 400);
            const offsetY = camera.y - (ctx.canvas?.height / 2 || 300);

            if (anim.type === 'move') {
                const x = anim.startX + (anim.endX - anim.startX) * t - offsetX;
                const y = anim.startY + (anim.endY - anim.startY) * t - offsetY;
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#fff';
                ctx.fillRect(x - 10, y - 10, 20, 20);
            } else if (anim.type === 'death') {
                ctx.globalAlpha = 1 - t;
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.arc(anim.x - offsetX, anim.y - offsetY, 15 * (1 + t), 0, Math.PI * 2);
                ctx.fill();
            } else if (anim.type === 'shoot') {
                const sx = anim.startX - offsetX;
                const sy = anim.startY - offsetY;
                const ex = anim.endX - offsetX;
                const ey = anim.endY - offsetY;
                ctx.strokeStyle = '#ff0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + (ex - sx) * t, sy + (ey - sy) * t);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1.0;
    }

    // ============ تخریب ساختمان ============
    startBuildingCollapse(x, y) {
        this.buildingCollapses.push({
            x: x * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            y: y * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2,
            progress: 0,
            duration: 40
        });
    }

    updateBuildingCollapses() {
        for (let i = this.buildingCollapses.length - 1; i >= 0; i--) {
            this.buildingCollapses[i].progress++;
            if (this.buildingCollapses[i].progress >= this.buildingCollapses[i].duration) {
                this.buildingCollapses.splice(i, 1);
            }
        }
    }

    renderBuildingCollapses(ctx, camera) {
        for (const coll of this.buildingCollapses) {
            const t = coll.progress / coll.duration;
            const sx = coll.x - camera.x + (ctx.canvas?.width / 2 || 400);
            const sy = coll.y - camera.y + (ctx.canvas?.height / 2 || 300);
            for (let i = 0; i < 8; i++) {
                ctx.fillStyle = `rgba(100,100,100,${1 - t})`;
                ctx.fillRect(sx + Math.random() * 20 * t - 10, sy + Math.random() * 30 * t - 15, 8, 8);
            }
        }
    }

    // ============ پرچم ============
    placeFlag(x, y, faction) {
        this.flags.push({ x, y, faction, wave: 0 });
    }

    renderFlags(ctx, camera) {
        for (const flag of this.flags) {
            const sx = flag.x * CONFIG.MAP.TILE_SIZE + CONFIG.MAP.TILE_SIZE / 2 - camera.x + (ctx.canvas?.width / 2 || 400);
            const sy = flag.y * CONFIG.MAP.TILE_SIZE - camera.y + (ctx.canvas?.height / 2 || 300);
            flag.wave += 0.1;
            ctx.fillStyle = '#8a8a8a';
            ctx.fillRect(sx - 1, sy, 2, 25);
            ctx.fillStyle = flag.faction === FACTION.WEHRMACHT ? '#cc0000' : '#cc4444';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 12 + Math.sin(flag.wave) * 3, sy + 7);
            ctx.lineTo(sx, sy + 14);
            ctx.fill();
        }
    }

    // ============ رعد و برق ============
    triggerLightning() {
        this.lightningBolts.push({ x: Math.random() * 800, progress: 0, duration: 10 });
    }

    updateLightning() {
        for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
            this.lightningBolts[i].progress++;
            if (this.lightningBolts[i].progress >= this.lightningBolts[i].duration) {
                this.lightningBolts.splice(i, 1);
            }
        }
    }

    renderLightning(ctx) {
        for (const bolt of this.lightningBolts) {
            const alpha = bolt.progress < 3 ? 1 : Math.max(0, 1 - (bolt.progress - 3) / 7);
            ctx.strokeStyle = `rgba(255,255,200,${alpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(bolt.x, 0);
            ctx.lineTo(bolt.x + 30, 150);
            ctx.lineTo(bolt.x - 20, 300);
            ctx.lineTo(bolt.x + 10, 500);
            ctx.stroke();
        }
    }

    // ============ شمع واقعی ============
    updateCandle() {
        if (!this.candleState.lit) return;
        const now = Date.now();
        const elapsed = (now - this.candleState.lastUpdate) / 1000;
        this.candleState.height = Math.max(0, this.candleState.height - elapsed * 2);
        this.candleState.lastUpdate = now;
    }

    renderCandle(ctx) {
        const h = this.candleState.height;
        ctx.fillStyle = '#eaddcf';
        ctx.fillRect(380, 500 - h, 20, h);
        ctx.fillStyle = '#f90';
        ctx.beginPath();
        ctx.arc(390, 500 - h - 5, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // ============ درخت ============
    updateTree() {
        if (this.treeGrowth < 100 && this.gs.currentTurn % 5 === 0) this.treeGrowth++;
    }

    renderTree(ctx) {
        const h = 20 + this.treeGrowth * 1.5;
        ctx.fillStyle = '#6b4c3b';
        ctx.fillRect(690, 400 - h, 10, h);
        ctx.fillStyle = '#2d5a27';
        ctx.beginPath();
        ctx.arc(695, 390 - h, 20 + this.treeGrowth / 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // ============ آینه شکسته ============
    updateMirror() {
        for (let i = this.mirrorShards.length - 1; i >= 0; i--) {
            this.mirrorShards[i].y += 0.5;
            this.mirrorShards[i].rotation += 0.01;
            if (this.mirrorShards[i].y > 600) this.mirrorShards.splice(i, 1);
        }
    }

    renderMirror(ctx) {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(100, 200, 150, 200);
        for (const shard of this.mirrorShards) {
            ctx.save();
            ctx.translate(shard.x, shard.y);
            ctx.rotate(shard.rotation);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(-shard.size, -shard.size, shard.size * 2, shard.size * 2);
            ctx.restore();
        }
    }

    breakMirror() {
        this.mirrorShards = [];
        for (let i = 0; i < 12; i++) {
            this.mirrorShards.push({
                x: 175 + Math.random() * 30,
                y: 300 + Math.random() * 30,
                size: 5 + Math.random() * 15,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }

    // ============ دفتر خاطرات و نامه ============
    updateDiary() {
        if (this.diaryPages.animating) {
            this.diaryPages.progress += 0.05;
            if (this.diaryPages.progress >= 1) {
                this.diaryPages.animating = false;
                this.diaryPages.progress = 0;
                this.diaryPages.current++;
            }
        }
    }

    renderDiary(ctx) {
        ctx.fillStyle = '#f4e4c1';
        ctx.fillRect(300, 100, 200, 250);
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 2;
        ctx.strokeRect(300, 100, 200, 250);
        ctx.fillStyle = '#333';
        ctx.font = '14px serif';
        ctx.fillText(`صفحه ${this.diaryPages.current + 1}`, 340, 200);
    }

    flipDiaryPage() {
        if (!this.diaryPages.animating) this.diaryPages.animating = true;
    }

    // ============ گالری قهرمانان ============
    renderHeroGallery(ctx) {
        this.galleryScroll = (this.galleryScroll + 1) % 500;
        ctx.fillStyle = '#111';
        ctx.fillRect(50, 50, 500, 400);
        ctx.fillStyle = '#fff';
        ctx.font = '20px serif';
        ctx.fillText('⚔ گالری قهرمانان ⚔', 150, 80);
        ctx.font = '14px serif';
        for (let i = 0; i < 10; i++) {
            const y = 120 + i * 30 - this.galleryScroll;
            if (y > 50 && y < 450) {
                ctx.fillText(`سرباز گمنام ${i + 1} - درگذشته با افتخار`, 80, y);
            }
        }
    }

    // ============ مدال‌ها ============
    addMedalGlow(x, y) {
        this.medalGlows.push({ x, y, life: 60 });
    }

    renderMedalGlows(ctx) {
        for (let i = this.medalGlows.length - 1; i >= 0; i--) {
            const g = this.medalGlows[i];
            g.life--;
            if (g.life <= 0) { this.medalGlows.splice(i, 1); continue; }
            const alpha = g.life / 60;
            ctx.fillStyle = `rgba(255,215,0,${alpha})`;
            ctx.beginPath();
            ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // ============ نقشه کمپین ============
    renderCampaignMap(ctx) {
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(100, 80, 400, 300);
        ctx.strokeStyle = '#c8a84e';
        ctx.lineWidth = 2;
        ctx.strokeRect(100, 80, 400, 300);
        ctx.fillStyle = '#fff';
        ctx.font = '16px serif';
        ctx.fillText('🗺 نقشه کمپین - جبهه شرق ۱۹۴۴', 180, 110);
        ctx.fillStyle = '#f44';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(200 + i * 60, 250 + Math.sin(i) * 30, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ============ عکس سیاه‌سفید ============
    takeBlackAndWhitePhoto() {
        this.blackAndWhitePhotos.push({ x: 50 + Math.random() * 300, y: 50 + Math.random() * 300, timer: 300 });
    }

    renderBlackAndWhitePhotos(ctx) {
        for (let i = this.blackAndWhitePhotos.length - 1; i >= 0; i--) {
            const photo = this.blackAndWhitePhotos[i];
            photo.timer--;
            if (photo.timer <= 0) { this.blackAndWhitePhotos.splice(i, 1); continue; }
            ctx.fillStyle = '#888';
            ctx.fillRect(photo.x, photo.y, 80, 100);
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.fillText('لحظه ثبت‌شده', photo.x + 5, photo.y + 50);
        }
    }

    // ============ تایپوگرافی جنگی ============
    showTypedText(text, x, y, duration = 200) {
        this.typedTexts.push({ text, x, y, progress: 0, duration, chars: text.split('') });
    }

    updateTypedTexts() {
        for (let i = this.typedTexts.length - 1; i >= 0; i--) {
            this.typedTexts[i].progress++;
            if (this.typedTexts[i].progress >= this.typedTexts[i].duration) {
                this.typedTexts.splice(i, 1);
            }
        }
    }

    renderTypedTexts(ctx) {
        for (const tt of this.typedTexts) {
            const visibleChars = Math.floor((tt.progress / tt.duration) * tt.chars.length);
            const displayText = tt.chars.slice(0, visibleChars).join('');
            ctx.fillStyle = '#c8a84e';
            ctx.font = 'bold 28px serif';
            ctx.fillText(displayText, tt.x, tt.y);
        }
    }

    // ============ دست‌خط روی نقشه ============
    addSketchLine(x1, y1, x2, y2) {
        this.sketchLines.push({ x1, y1, x2, y2, alpha: 1.0 });
    }

    renderSketchLines(ctx, camera) {
        for (const line of this.sketchLines) {
            const offsetX = camera.x - 400;
            const offsetY = camera.y - 300;
            ctx.strokeStyle = `rgba(200,50,50,${line.alpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(line.x1 - offsetX, line.y1 - offsetY);
            ctx.lineTo(line.x2 - offsetX, line.y2 - offsetY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // ============ تقویم ============
    updateCalendar() {
        // هر ۳ نوبت = ۱ روز
        if (this.gs.currentTurn % 3 === 0) {
            this.calendarDate.day++;
            if (this.calendarDate.day > 30) {
                this.calendarDate.day = 1;
                this.calendarDate.month++;
                if (this.calendarDate.month > 12) {
                    this.calendarDate.month = 1;
                    this.calendarDate.year++;
                }
            }
        }
    }

    renderCalendar(ctx) {
        const months = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
        ctx.fillStyle = '#f4e4c1';
        ctx.fillRect(50, 400, 120, 80);
        ctx.strokeStyle = '#8b7355';
        ctx.strokeRect(50, 400, 120, 80);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px serif';
        ctx.fillText(this.calendarDate.day, 100, 440);
        ctx.font = '10px serif';
        ctx.fillText(months[this.calendarDate.month - 1], 80, 460);
        ctx.fillText(this.calendarDate.year.toString(), 90, 475);
    }

    // ============ ساعت مچی ============
    renderWatch(ctx) {
        const now = new Date();
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(700, 100, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c8a84e';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${hours}:${minutes < 10 ? '0' + minutes : minutes}`, 685, 105);
    }

    // ============ صحنه‌های سینمایی ============
    queueCinematic(scene) { this.cinematicQueue.push(scene); if (!this.isCinematicPlaying) this.playNextCinematic(); }

    playNextCinematic() {
        if (this.cinematicQueue.length === 0) { this.isCinematicPlaying = false; return; }
        this.isCinematicPlaying = true;
        const scene = this.cinematicQueue.shift();
        this.executeCinematic(scene);
    }

    executeCinematic(scene) {
        this.startTransition('fadeOut', 30);
        setTimeout(() => {
            if (scene.text) this.showNotification(scene.text, scene.duration || 180);
            if (scene.callback) scene.callback();
        }, 600);
        setTimeout(() => {
            this.startTransition('fadeIn', 30);
            setTimeout(() => this.playNextCinematic(), 600);
        }, (scene.duration || 120) + 600);
    }

    // ============ ترانزیشن‌ها ============
    startTransition(type, duration) { this.transitionState = type; this.transitionAlpha = type === 'fadeOut' ? 0 : 1; this.transitionDuration = duration; this.transitionTimer = 0; }

    updateTransitions() {
        if (!this.transitionState) return;
        this.transitionTimer++;
        const progress = Math.min(1, this.transitionTimer / this.transitionDuration);
        this.transitionAlpha = this.transitionState === 'fadeOut' ? progress : 1 - progress;
        if (progress >= 1) { this.transitionState = null; this.transitionAlpha = 0; }
    }

    renderTransition(ctx) {
        if (this.transitionAlpha <= 0) return;
        ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
        ctx.fillRect(0, 0, ctx.canvas?.width || 800, ctx.canvas?.height || 600);
    }

    // ============ نوتیفیکیشن‌ها ============
    showNotification(text, duration = 120) { this.notificationQueue.push({ text, duration, timer: 0 }); }

    updateNotifications() {
        for (let i = this.notificationQueue.length - 1; i >= 0; i--) {
            this.notificationQueue[i].timer++;
            if (this.notificationQueue[i].timer >= this.notificationQueue[i].duration) this.notificationQueue.splice(i, 1);
        }
    }

    renderNotifications(ctx) {
        if (this.notificationQueue.length === 0) return;
        const w = ctx.canvas?.width || 800, h = ctx.canvas?.height || 600;
        const notif = this.notificationQueue[0];
        const progress = notif.timer / notif.duration;
        const alpha = progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        const tw = ctx.measureText(notif.text).width + 40;
        ctx.fillRect(w/2 - tw/2, h/2 - 30, tw, 60);
        ctx.strokeStyle = '#c8a84e';
        ctx.strokeRect(w/2 - tw/2, h/2 - 30, tw, 60);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px serif';
        ctx.textAlign = 'center';
        ctx.fillText(notif.text, w/2, h/2 + 5);
        ctx.textAlign = 'start';
        ctx.globalAlpha = 1.0;
    }

    // ============ افکت‌های آماده ============
    playExplosion(x, y, size = 'medium') {
        const counts = { small: 10, medium: 20, large: 35 };
        this.spawnParticles(x, y, 'explosion', counts[size] || 20);
        this.spawnParticles(x, y, 'smoke', counts[size] / 2);
        this.spawnParticles(x, y, 'spark', counts[size] / 2);
        if (this.renderer) this.renderer.screenShake(size === 'large' ? 15 : 5, size === 'large' ? 20 : 8);
    }

    playHit(x, y) { this.spawnParticles(x, y, 'spark', 8); this.spawnParticles(x, y, 'dust', 5); }
    playDeath(x, y) { this.spawnParticles(x, y, 'blood', 12); if (this.renderer) this.renderer.screenShake(3, 5); }
    playBuildingCollapse(x, y) { this.spawnParticles(x, y, 'dust', 50); this.startBuildingCollapse(x, y); if (this.renderer) this.renderer.screenShake(12, 25); }

    // ============ رندر اصلی ============
    render(ctx, camera) {
        this.renderParticles(ctx, camera);
        this.renderUnitAnimations(ctx, camera);
        this.renderBuildingCollapses(ctx, camera);
        this.renderFlags(ctx, camera);
        this.renderLightning(ctx);
        this.renderSketchLines(ctx, camera);
        this.renderBlackAndWhitePhotos(ctx);
        this.renderMedalGlows(ctx);
        this.renderTypedTexts(ctx);
        this.renderNotifications(ctx);
        this.renderTransition(ctx);
    }

    // ============ رندر UI (برای صحنه‌های داستانی) ============
    renderUIElements(ctx) {
        this.renderCandle(ctx);
        this.renderTree(ctx);
        this.renderMirror(ctx);
        this.renderDiary(ctx);
        this.renderCalendar(ctx);
        this.renderWatch(ctx);
    }
}
