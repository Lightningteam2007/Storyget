// sturmglanz/sw.js
// Service Worker کامل - کش پیشرفته، مدیریت آفلاین، به‌روزرسانی خودکار، نوتیفیکیشن
'use strict';

// ============ نام کش‌ها ============
const CACHE_STATIC = 'sturmglanz-static-v3.0.0';
const CACHE_DYNAMIC = 'sturmglanz-dynamic-v3.0.0';
const CACHE_IMAGES = 'sturmglanz-images-v3.0.0';
const CACHE_FONTS = 'sturmglanz-fonts-v3.0.0';

// ============ فایل‌های ضروری برای کش استاتیک ============
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/js/config.js',
    '/js/eventbus.js',
    '/js/i18n.js',
    '/js/core.js',
    '/js/map.js',
    '/js/units.js',
    '/js/combat.js',
    '/js/ai.js',
    '/js/campaign.js',
    '/js/narrative.js',
    '/js/systems.js',
    '/js/renderer.js',
    '/js/effects.js',
    '/js/audio.js',
    '/js/multiplayer.js',
    '/js/ui.js',
    '/js/storage.js',
    '/js/pwa.js',
    '/js/main.js',
    '/manifest.json',
    '/sw.js'
];

// ============ نصب Service Worker ============
self.addEventListener('install', (event) => {
    console.log('[SW] در حال نصب...');

    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => {
                console.log('[SW] کش کردن فایل‌های استاتیک...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] تمام فایل‌های استاتیک کش شدند.');
                return self.skipWaiting(); // فعال‌سازی فوری
            })
            .catch((error) => {
                console.error('[SW] خطا در کش کردن فایل‌ها:', error);
            })
    );
});

// ============ فعال‌سازی Service Worker ============
self.addEventListener('activate', (event) => {
    console.log('[SW] در حال فعال‌سازی...');

    const cacheWhitelist = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES, CACHE_FONTS];

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheWhitelist.includes(cacheName)) {
                            console.log('[SW] حذف کش قدیمی:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] فعال‌سازی کامل شد.');
                return self.clients.claim(); // کنترل تمام صفحات
            })
    );
});

// ============ استراتژی کش: Network First با Fallback به کش ============
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // رد کردن درخواست‌های غیر GET
    if (request.method !== 'GET') return;

    // رد کردن درخواست‌های API خارجی (Firebase)
    if (request.url.includes('firebaseio.com') || request.url.includes('googleapis.com')) {
        return; // بگذار از شبکه برود
    }

    // استراتژی Network First
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // ذخیره در کش داینامیک
                const responseClone = networkResponse.clone();
                caches.open(CACHE_DYNAMIC).then((cache) => {
                    cache.put(request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // Fallback به کش
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // اگر صفحه HTML باشد، صفحه آفلاین را برگردان
                        if (request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        // در غیر این صورت خطا
                        return new Response('آفلاین', { status: 503 });
                    });
            })
    );
});

// ============ مدیریت پیام‌ها ============
self.addEventListener('message', (event) => {
    const message = event.data;

    if (!message) return;

    switch (message.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        console.log('[SW] حذف کش:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                console.log('[SW] تمام کش‌ها پاک شدند.');
                // اطلاع به کلاینت
                event.source?.postMessage({ type: 'CACHE_CLEARED' });
            });
            break;

        case 'CHECK_CACHE':
            caches.keys().then((cacheNames) => {
                const cacheInfo = {};
                const promises = cacheNames.map((cacheName) => {
                    return caches.open(cacheName).then((cache) => {
                        return cache.keys().then((keys) => {
                            cacheInfo[cacheName] = keys.length;
                        });
                    });
                });
                return Promise.all(promises).then(() => {
                    event.source?.postMessage({ type: 'CACHE_STATUS', data: cacheInfo });
                });
            });
            break;

        case 'UPDATE_CACHE':
            // به‌روزرسانی دستی کش
            caches.open(CACHE_STATIC).then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            }).then(() => {
                event.source?.postMessage({ type: 'CACHE_UPDATED' });
            });
            break;

        default:
            console.log('[SW] پیام ناشناخته:', message.type);
    }
});

// ============ مدیریت نوتیفیکیشن‌ها ============
self.addEventListener('push', (event) => {
    let data = {
        title: 'اشتورم‌گلانتس',
        body: 'نوبت شماست!',
        icon: '/icon-192.png',
        badge: '/badge-72.png'
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag || 'sturmglanz',
        renotify: data.renotify || false,
        data: data.data || {},
        actions: [
            { action: 'play', title: 'بازی کن' },
            { action: 'close', title: 'ببند' }
        ],
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ============ کلیک روی نوتیفیکیشن ============
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'play') {
        // باز کردن بازی
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    return clients.openWindow('/');
                })
        );
    }
});
