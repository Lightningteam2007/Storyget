// sturmglanz/js/storage.js
// سیستم ذخیره‌سازی کامل - IndexedDB، ذخیره/بارگذاری، بازپخش، تنظیمات، خروجی/ورودی
'use strict';

class StorageManager {
    constructor() {
        this.db = null;
        this.dbReady = false;
        this.initPromise = this.init();
    }

    // ============ راه‌اندازی IndexedDB ============
    async init() {
        if (!window.indexedDB) {
            console.warn('IndexedDB پشتیبانی نمی‌شود. ذخیره‌سازی غیرفعال است.');
            return;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.STORAGE.DB_NAME, CONFIG.STORAGE.DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // فروشگاه ذخیره بازی‌ها
                if (!db.objectStoreNames.contains(CONFIG.STORAGE.STORE_SAVES)) {
                    const savesStore = db.createObjectStore(CONFIG.STORAGE.STORE_SAVES, { keyPath: 'slot' });
                    savesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // فروشگاه تنظیمات
                if (!db.objectStoreNames.contains(CONFIG.STORAGE.STORE_SETTINGS)) {
                    db.createObjectStore(CONFIG.STORAGE.STORE_SETTINGS, { keyPath: 'key' });
                }

                // فروشگاه بازپخش‌ها
                if (!db.objectStoreNames.contains(CONFIG.STORAGE.STORE_REPLAYS)) {
                    const replaysStore = db.createObjectStore(CONFIG.STORAGE.STORE_REPLAYS, { keyPath: 'id', autoIncrement: true });
                    replaysStore.createIndex('timestamp', 'timestamp', { unique: false });
                    replaysStore.createIndex('missionId', 'missionId', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.dbReady = true;
                console.log('🗄️ IndexedDB آماده است.');
                resolve();
            };

            request.onerror = (event) => {
                console.error('خطا در باز کردن IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============ ذخیره و بارگذاری بازی ============
    async saveGame(slot, data) {
        await this.ensureReady();
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_SAVES], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_SAVES);

            const saveEntry = {
                slot: slot,
                timestamp: Date.now(),
                turn: data.currentTurn || 1,
                missionId: data.missionId || null,
                data: data
            };

            const request = store.put(saveEntry);

            request.onsuccess = () => {
                console.log(`بازی در شکاف ${slot} ذخیره شد.`);
                eventBus.emit(GAME_EVENTS.SAVE_COMPLETED, { slot });
                resolve(true);
            };

            request.onerror = (event) => {
                console.error('خطا در ذخیره بازی:', event.target.error);
                resolve(false);
            };
        });
    }

    async loadGame(slot) {
        await this.ensureReady();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_SAVES], 'readonly');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_SAVES);
            const request = store.get(slot);

            request.onsuccess = (event) => {
                const result = event.target.result;
                if (result && result.data) {
                    console.log(`بازی از شکاف ${slot} بارگذاری شد.`);
                    eventBus.emit(GAME_EVENTS.LOAD_COMPLETED, { slot });
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };

            request.onerror = (event) => {
                console.error('خطا در بارگذاری بازی:', event.target.error);
                resolve(null);
            };
        });
    }

    async deleteGame(slot) {
        await this.ensureReady();
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_SAVES], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_SAVES);
            const request = store.delete(slot);

            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    async listSaves() {
        await this.ensureReady();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_SAVES], 'readonly');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_SAVES);
            const index = store.index('timestamp');
            const saves = [];

            index.openCursor(null, 'prev').onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    saves.push({
                        slot: cursor.value.slot,
                        turn: cursor.value.turn,
                        missionId: cursor.value.missionId,
                        timestamp: cursor.value.timestamp
                    });
                    cursor.continue();
                } else {
                    resolve(saves);
                }
            };
        });
    }

    // ============ تنظیمات ============
    async saveSettings(settings) {
        await this.ensureReady();
        if (!this.db) return;

        const transaction = this.db.transaction([CONFIG.STORAGE.STORE_SETTINGS], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORAGE.STORE_SETTINGS);
        store.put({ key: 'user_settings', value: settings });
    }

    async loadSettings() {
        await this.ensureReady();
        if (!this.db) return {};

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_SETTINGS], 'readonly');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_SETTINGS);
            const request = store.get('user_settings');

            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.value : {});
            };
            request.onerror = () => resolve({});
        });
    }

    // ============ بازپخش ============
    async saveReplay(replayData) {
        await this.ensureReady();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_REPLAYS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_REPLAYS);

            const entry = {
                timestamp: Date.now(),
                turnCount: replayData.turns ? replayData.turns.length : 0,
                missionId: replayData.missionId || null,
                data: replayData
            };

            const request = store.add(entry);

            request.onsuccess = (event) => {
                const id = event.target.result;
                console.log(`بازپخش با id=${id} ذخیره شد.`);
                resolve(id);
            };

            request.onerror = () => resolve(null);
        });
    }

    async loadReplay(id) {
        await this.ensureReady();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_REPLAYS], 'readonly');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_REPLAYS);
            const request = store.get(id);

            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.data : null);
            };

            request.onerror = () => resolve(null);
        });
    }

    async listReplays() {
        await this.ensureReady();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_REPLAYS], 'readonly');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_REPLAYS);
            const index = store.index('timestamp');
            const replays = [];

            index.openCursor(null, 'prev').onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    replays.push({
                        id: cursor.value.id,
                        timestamp: cursor.value.timestamp,
                        turnCount: cursor.value.turnCount,
                        missionId: cursor.value.missionId
                    });
                    cursor.continue();
                } else {
                    resolve(replays);
                }
            };
        });
    }

    async deleteReplay(id) {
        await this.ensureReady();
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([CONFIG.STORAGE.STORE_REPLAYS], 'readwrite');
            const store = transaction.objectStore(CONFIG.STORAGE.STORE_REPLAYS);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    // ============ خروجی و ورودی ============
    exportSave(slot) {
        return this.loadGame(slot).then(data => {
            if (!data) return null;
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sturmglanz_save_${slot}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return true;
        });
    }

    importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // اعتبارسنجی اولیه
                    if (!data || !data.currentTurn) {
                        throw new Error('فایل ذخیره نامعتبر است.');
                    }
                    // ذخیره در شکاف جداگانه
                    const slot = `imported_${Date.now()}`;
                    this.saveGame(slot, data).then(() => resolve(slot));
                } catch (err) {
                    console.error('خطا در ورودی فایل ذخیره:', err);
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // ============ ذخیره ابری (placeholder) ============
    async cloudSave(data) {
        // Firebase integration placeholder
        if (typeof firebase !== 'undefined' && CONFIG.FIREBASE.ENABLED) {
            // Using Firebase for cloud saves
            const userId = localStorage.getItem('user_id') || 'anonymous';
            const db = firebase.database();
            await db.ref(`cloud_saves/${userId}/latest`).set({
                data: data,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        }
        console.warn('ذخیره ابری فعال نیست.');
        return false;
    }

    async cloudLoad() {
        if (typeof firebase !== 'undefined' && CONFIG.FIREBASE.ENABLED) {
            const userId = localStorage.getItem('user_id') || 'anonymous';
            const db = firebase.database();
            const snapshot = await db.ref(`cloud_saves/${userId}/latest`).once('value');
            const val = snapshot.val();
            return val ? val.data : null;
        }
        return null;
    }

    // ============ ابزار ============
    async ensureReady() {
        if (this.dbReady) return;
        await this.initPromise;
    }

    static async getStorageStats() {
        const estimate = await navigator.storage?.estimate?.();
        if (estimate) {
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                percentage: Math.round((estimate.usage / estimate.quota) * 100)
            };
        }
        return null;
    }
}

// نمونه سراسری
const storageManager = new StorageManager();
