// sturmglanz/js/main.js
// نقطه ورود اصلی - ارکستراتور نهایی، مدیریت چرخه کامل اپلیکیشن، حالت خطایابی و سیستم پلاگین
'use strict';

// ============ فضای نام سراسری ============
const STURMGLANZ = window.STURMGLANZ || {};

// ============ کلاس اصلی بازی ============
class Game {
    constructor() {
        // هسته بازی
        this.state = null;
        
        // ماژول‌های اصلی
        this.renderer = null;
        this.effects = null;
        this.audio = null;
        this.ui = null;
        this.input = null;
        this.combat = null;
        this.ai = null;
        
        // ماژول‌های مدیریت محتوا
        this.campaign = null;
        this.narrative = null;
        this.systems = null;
        
        // ماژول‌های شبکه و داده
        this.multiplayer = null;
        this.storage = null;
        this.pwa = null;
        
        // وضعیت اجرایی
        this.isRunning = false;
        this.isPaused = false;
        this.currentScene = 'main_menu'; // main_menu, playing, replay, cinematic
        
        // سیستم‌های جانبی
        this.plugins = new Map();
        this.performanceMonitor = new PerformanceMonitor();
        this.errorHandler = new ErrorHandler();
        this.authManager = null; // برای احراز هویت ابری
        
        // حلقه بازی
        this.lastTimestamp = 0;
        this.animationFrameId = null;
        
        // متغیرهای توسعه
        this.debugMode = false;
        this.debugOverlay = null;
    }

    // ============ راه‌اندازی ============
    async init() {
        console.log(`⚔️ اشتورم‌گلانتس: ${CONFIG.BUILD} | نسخه ${CONFIG.VERSION}`);
        
        try {
            // ۱. راه‌اندازی ماژول‌های پایه
            this.storage = new StorageManager();
            await this.storage.initPromise;
            
            this.pwa = new PWAManager();
            
            // ۲. راه‌اندازی هسته بازی
            this.state = new GameState();
            this.state.eventBus = eventBus; // اتصال EventBus
            
            // ۳. راه‌اندازی سیستم‌های محتوایی
            this.systems = new SystemsManager(this.state);
            this.state.systems = this.systems;
            
            this.campaign = new CampaignManager(this.state);
            this.state.campaign = this.campaign;
            
            this.narrative = new NarrativeSystem(this.state, this.campaign);
            this.state.narrative = this.narrative;
            
            // ۴. راه‌اندازی ماژول‌های نظامی
            this.combat = new CombatSystem(this.state);
            this.state.combatSystem = this.combat;
            
            this.ai = new AISystem(this.state);
            this.state.aiSystem = this.ai;
            
            // ۵. راه‌اندازی ماژول‌های شبکه
            this.multiplayer = new MultiplayerManager(this.state);
            this.state.multiplayer = this.multiplayer;
            
            // ۶. راه‌اندازی رابط کاربری و رندر (وابسته به DOM)
            await this.waitForDOM();
            
            this.renderer = new Renderer(this.state);
            this.effects = new EffectsManager(this.state, this.renderer);
            this.state.effects = this.effects;
            
            this.audio = new AudioEngine(this.state);
            this.state.audio = this.audio;
            
            this.ui = new UIManager(this.state, this.renderer, this.effects);
            this.state.ui = this.ui;
            
            // ۷. راه‌اندازی مدیریت ورودی
            this.input = new InputHandler(this.state, this.renderer, this.ui);
            
            // ۸. راه‌اندازی سیستم‌های توسعه
            this.setupDevTools();
            this.setupErrorHandling();
            this.setupPlugins();
            
            // ۹. رویدادهای سراسری
            this.bindGlobalEvents();
            
            console.log('✅ تمام ماژول‌ها با موفقیت راه‌اندازی شدند.');
            STURMGLANZ.instance = this;
            
        } catch (error) {
            console.error('❌ خطای بحرانی در راه‌اندازی:', error);
            this.errorHandler.showFatalError(error);
        }
    }

    // ============ منتظر ماندن برای DOM ============
    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
    }

    // ============ رویدادهای سراسری ============
    bindGlobalEvents() {
        // شروع بازی
        eventBus.on(GAME_EVENTS.GAME_INITIALIZED, () => this.startGameLoop());
        eventBus.on(GAME_EVENTS.GAME_LOADED, () => this.startGameLoop());
        
        // پایان بازی
        eventBus.on(GAME_EVENTS.GAME_OVER, () => this.stopGameLoop());
        
        // تغییر فاز
        eventBus.on(GAME_EVENTS.PHASE_CHANGED, (data) => {
            if (data.phase === TURN_PHASES.ENEMY) {
                this.input?.setEnabled(false);
                if (this.ai) {
                    setTimeout(() => {
                        if (this.state.phase === TURN_PHASES.ENEMY) {
                            this.ai.executeAITurn();
                            this.state.endTurn();
                        }
                    }, 800);
                }
            } else {
                this.input?.setEnabled(true);
            }
            this.updateSystems();
        });

        // نوبت جدید
        eventBus.on(GAME_EVENTS.NEW_TURN, () => {
            this.updateSystems();
            if (this.storage && this.state.currentTurn % CONFIG.GAME.AUTOSAVE_INTERVAL === 0) {
                this.storage.saveGame('autosave', this.state.toSaveData());
            }
        });
        
        // سایر رویدادها...
    }

    // ============ حلقه اصلی بازی ============
    startGameLoop() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isPaused = false;
        this.lastTimestamp = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
        this.audio?.resume();
    }

    stopGameLoop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = Math.min(timestamp - this.lastTimestamp, 33.33); // حداکثر 30fps
        this.lastTimestamp = timestamp;

        if (!this.isPaused) {
            this.update(deltaTime);
            this.render();
        }

        this.performanceMonitor.frame(deltaTime);
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    // ============ به‌روزرسانی ============
    update(deltaTime) {
        this.systems?.updateAll?.();
        this.effects?.update?.();
        this.audio?.updateSilence?.();
        
        if (this.debugMode) {
            this.performanceMonitor.update();
        }
    }

    // ============ رندر ============
    render() {
        this.renderer?.render?.();
        this.effects?.render?.(this.renderer?.ctx, this.renderer?.camera);
        this.performanceMonitor?.render?.(this.renderer?.ctx);
    }

    // ============ بروزرسانی سیستم‌ها ============
    updateSystems() {
        this.ui?.updateAllPanels?.();
        const hq = this.state?.getMyUnits?.()?.find(u => u.type === UNIT_TYPE.HQ);
        if (hq) this.renderer?.centerOnUnit?.(hq);
    }

    // ============ ابزارهای توسعه ============
    setupDevTools() {
        // فعال‌سازی با کلید F12 یا ` در بازی
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'D')) {
                e.preventDefault();
                this.toggleDebugMode();
            }
        });
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        if (this.debugMode) {
            this.debugOverlay = new DebugOverlay(this);
            this.pwa?.enableDebugMode?.();
            eventBus.enableDebug();
        } else {
            this.debugOverlay?.destroy();
            this.debugOverlay = null;
            eventBus.disableDebug();
        }
    }

    // ============ مدیریت خطا ============
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.errorHandler.handle(event.error);
        });
        window.addEventListener('unhandledrejection', (event) => {
            this.errorHandler.handle(event.reason);
        });
    }

    // ============ سیستم پلاگین ============
    setupPlugins() {
        // پلاگین‌های پیش‌فرض
        this.registerPlugin('autoSave', new AutoSavePlugin(this));
        this.registerPlugin('cloudSync', new CloudSyncPlugin(this));
    }

    registerPlugin(name, plugin) {
        this.plugins.set(name, plugin);
        if (plugin.init) plugin.init(this);
    }
}

// ============ کلاس‌های کمکی ============

// پایش عملکرد
class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.memoryUsage = 0;
    }

    frame(deltaTime) {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            if (performance.memory) {
                this.memoryUsage = performance.memory.usedJSHeapSize / 1048576;
            }
        }
    }

    render(ctx) {
        if (!ctx) return;
        ctx.fillStyle = 'lime';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        if (this.memoryUsage) ctx.fillText(`MEM: ${this.memoryUsage.toFixed(1)}MB`, 10, 40);
    }
}

// مدیریت خطا
class ErrorHandler {
    handle(error) {
        console.error('خطای مدیریت‌شده:', error);
        eventBus.emit('error', { error });
    }

    showFatalError(error) {
        document.body.innerHTML = `
            <div style="color:red;text-align:center;padding:50px;">
                <h1>خطای بحرانی</h1>
                <p>${error.message}</p>
                <button onclick="location.reload()">بارگذاری مجدد</button>
            </div>`;
    }
}

// پلاگین ذخیره خودکار
class AutoSavePlugin {
    constructor(game) { this.game = game; }
    init() {
        eventBus.on(GAME_EVENTS.NEW_TURN, () => {
            if (this.game.state.currentTurn % CONFIG.GAME.AUTOSAVE_INTERVAL === 0) {
                this.game.storage?.saveGame('autosave', this.game.state.toSaveData());
            }
        });
    }
}

// پلاگین همگام‌سازی ابری
class CloudSyncPlugin {
    constructor(game) { this.game = game; }
    init() {
        // همگام‌سازی هنگام آنلاین شدن
        eventBus.on(GAME_EVENTS.NETWORK_CHANGE, (data) => {
            if (data.online) {
                // تلاش برای همگام‌سازی
            }
        });
    }
}

// ============ راه‌اندازی ============
document.addEventListener('DOMContentLoaded', async () => {
    const game = new Game();
    await game.init();
    STURMGLANZ.game = game;
    console.log('🎮 بازی آماده اجراست.');
});
