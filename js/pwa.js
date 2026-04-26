// sturmglanz/js/pwa.js
// مدیریت کامل PWA - چرخه حیات SW، کش آفلاین، مدیریت خطا، بررسی پشتیبانی، عیب‌یابی
'use strict';

class PWAManager {
    constructor() {
        this.swRegistration = null;
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        this.updateAvailable = false;
        this.installButtonVisible = false;
        this.serviceWorkerSupported = 'serviceWorker' in navigator;
        this.notificationSupported = 'Notification' in window;
        this.indexedDBSupported = 'indexedDB' in window;
        this.cacheStatus = {};
        this.debugMode = false;

        this.init();
    }

    // ============ راه‌اندازی ============
    init() {
        // بررسی پشتیبانی کلی PWA
        this.checkPWASupport();

        if (!this.serviceWorkerSupported) {
            console.warn('Service Worker پشتیبانی نمی‌شود. PWA غیرفعال است.');
            return;
        }

        this.registerServiceWorker();
        this.handleNetworkChanges();
        this.handleInstallPrompt();
        this.setupPeriodicUpdates();
        this.listenForSWMessages();
    }

    // ============ بررسی پشتیبانی کامل PWA ============
    checkPWASupport() {
        const report = {
            serviceWorker: this.serviceWorkerSupported,
            notifications: this.notificationSupported,
            indexedDB: this.indexedDBSupported,
            cache: 'caches' in window,
            manifest: !!document.querySelector('link[rel="manifest"]'),
            displayStandalone: window.matchMedia('(display-mode: standalone)').matches
        };

        if (this.debugMode) {
            console.table(report);
        }

        return report;
    }

    // ============ ثبت Service Worker با مدیریت خطا ============
    async registerServiceWorker(retryCount = 0) {
        const MAX_RETRIES = 3;
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            this.swRegistration = registration;
            console.log('⚡ Service Worker ثبت شد:', registration.scope);

            // بررسی وضعیت فعلی
            if (registration.installing) {
                console.log('📥 Service Worker در حال نصب...');
                this.trackSWInstall(registration.installing);
            } else if (registration.waiting) {
                console.log('⏳ Service Worker منتظر فعال‌سازی...');
                this.trackSWWaiting(registration.waiting);
            } else if (registration.active) {
                console.log('✅ Service Worker فعال است.');
                this.checkCacheStatus();
                eventBus.emit(GAME_EVENTS.OFFLINE_READY, {});
            }

            // گوش دادن به به‌روزرسانی‌های آینده
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                console.log('🔄 به‌روزرسانی جدید پیدا شد.');
                this.trackSWInstall(newWorker);
            });

        } catch (error) {
            console.error(`خطا در ثبت Service Worker (تلاش ${retryCount + 1}/${MAX_RETRIES}):`, error);
            if (retryCount < MAX_RETRIES - 1) {
                // تلاش مجدد بعد از ۵ ثانیه
                await new Promise(resolve => setTimeout(resolve, 5000));
                return this.registerServiceWorker(retryCount + 1);
            } else {
                this.showToast('حالت آفلاین محدود است. برخی ویژگی‌ها کار نمی‌کنند.', 'warning');
            }
        }
    }

    // ============ پیگیری چرخه حیات Service Worker ============
    trackSWInstall(worker) {
        worker.addEventListener('statechange', () => {
            console.log(`Service Worker وضعیت: ${worker.state}`);
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                eventBus.emit(GAME_EVENTS.UPDATE_AVAILABLE, {});
                this.showToast('نسخه جدید بازی آماده است. برای اعمال، بازی را ببندید و باز کنید.', 'info');
            }
            if (worker.state === 'activated') {
                this.checkCacheStatus();
                eventBus.emit(GAME_EVENTS.OFFLINE_READY, {});
            }
        });
    }

    trackSWWaiting(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
                console.log('✅ Service Worker فعال شد (بعد از انتظار).');
                this.checkCacheStatus();
            }
        });
    }

    // ============ گوش دادن به پیام‌های Service Worker ============
    listenForSWMessages() {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (this.debugMode) {
                console.log('📨 پیام از SW:', event.data);
            }

            switch (event.data?.type) {
                case 'CACHE_UPDATED':
                    this.checkCacheStatus();
                    this.showToast('کش آفلاین به‌روز شد.', 'success');
                    break;
                case 'CACHE_ERROR':
                    console.error('خطای کش:', event.data.error);
                    this.showToast('خطا در ذخیره‌سازی آفلاین.', 'error');
                    break;
                case 'OFFLINE_PAGE_SERVED':
                    console.log('📄 صفحه آفلاین نمایش داده شد.');
                    break;
                default:
                    if (this.debugMode) {
                        console.log('پیام ناشناخته از SW:', event.data);
                    }
            }
        });
    }

    // ============ بررسی وضعیت کش ============
    async checkCacheStatus() {
        if (!('caches' in window)) return;
        try {
            const cacheNames = await caches.keys();
            const status = {};
            for (const name of cacheNames) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                status[name] = keys.length;
            }
            this.cacheStatus = status;
            if (this.debugMode) {
                console.log('📦 وضعیت کش:', status);
            }
        } catch (error) {
            console.warn('خطا در بررسی کش:', error);
        }
    }

    // ============ مدیریت وضعیت شبکه ============
    handleNetworkChanges() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            document.body.classList.remove('offline');
            eventBus.emit(GAME_EVENTS.NETWORK_CHANGE, { online: true });
            this.showToast('اتصال اینترنت برقرار شد ✅', 'success');
            // بررسی به‌روزرسانی کش بعد از آنلاین شدن
            if (this.swRegistration) {
                this.swRegistration.update();
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            document.body.classList.add('offline');
            eventBus.emit(GAME_EVENTS.NETWORK_CHANGE, { online: false });
            this.showToast('حالت آفلاین - بازی همچنان قابل اجراست 📡', 'warning');
        });
    }

    // ============ مدیریت نصب برنامه ============
    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt = event;
            this.installButtonVisible = true;
            eventBus.emit('installAvailable', {});

            const installBtn = document.getElementById('btn-install-app');
            if (installBtn) {
                installBtn.style.display = 'block';
                installBtn.addEventListener('click', () => this.showInstallPrompt());
            }
        });

        window.addEventListener('appinstalled', () => {
            this.installButtonVisible = false;
            this.deferredPrompt = null;
            eventBus.emit('appInstalled', {});
            this.showToast('بازی با موفقیت نصب شد! 🎉', 'success');
            const installBtn = document.getElementById('btn-install-app');
            if (installBtn) installBtn.style.display = 'none';
        });
    }

    async showInstallPrompt() {
        if (!this.deferredPrompt) {
            this.showToast('نصب در حال حاضر ممکن نیست.', 'error');
            return;
        }
        try {
            const result = await this.deferredPrompt.prompt();
            console.log(`نتیجه نصب: ${result.outcome}`);
            this.deferredPrompt = null;
            this.installButtonVisible = false;
            const installBtn = document.getElementById('btn-install-app');
            if (installBtn) installBtn.style.display = 'none';
        } catch (error) {
            console.error('خطا در نمایش پنجره نصب:', error);
        }
    }

    // ============ به‌روزرسانی دوره‌ای ============
    setupPeriodicUpdates() {
        // هر ۳۰ دقیقه بررسی به‌روزرسانی
        setInterval(() => {
            if (this.swRegistration) {
                this.swRegistration.update().catch(err => {
                    console.warn('خطا در بررسی به‌روزرسانی خودکار:', err);
                });
            }
        }, 30 * 60 * 1000);
    }

    applyUpdate() {
        if (!this.swRegistration || !this.swRegistration.waiting) {
            this.showToast('به‌روزرسانی در دسترس نیست.', 'warning');
            return;
        }
        // ارسال پیام به Service Worker برای skipWaiting
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // بارگذاری مجدد صفحه بعد از فعال‌سازی
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    // ============ نوتیفیکیشن‌ها ============
    async requestNotificationPermission() {
        if (!this.notificationSupported) {
            console.warn('Notification API پشتیبانی نمی‌شود.');
            return false;
        }
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    async sendNotification(title, options = {}) {
        if (!this.notificationSupported || Notification.permission !== 'granted') {
            return false;
        }
        const reg = this.swRegistration;
        if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
                body: options.body || '',
                icon: options.icon || '/icon-192.png',
                badge: options.badge || '/badge-72.png',
                tag: options.tag || 'sturmglanz',
                renotify: options.renotify || false,
                data: options.data || {}
            });
            return true;
        }
        new Notification(title, options);
        return true;
    }

    // ============ حالت عیب‌یابی ============
    enableDebugMode() {
        this.debugMode = true;
        console.log('🐛 حالت عیب‌یابی PWA فعال شد.');
        this.checkPWASupport();
        this.checkCacheStatus();
    }

    // ============ ابزار ============
    getOfflineStatus() {
        return {
            isOnline: this.isOnline,
            updateAvailable: this.updateAvailable,
            installAvailable: this.installButtonVisible,
            swActive: !!this.swRegistration?.active,
            cacheStatus: this.cacheStatus
        };
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `pwa-toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#a44' : type === 'warning' ? '#ca5' : '#4a8'};
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 500;
            font-size: 0.9em;
            animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// نمونه سراسری
const pwaManager = new PWAManager();
