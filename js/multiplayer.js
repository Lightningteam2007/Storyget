// sturmglanz/js/multiplayer.js
// سیستم چندنفره کامل - Firebase، Quick Match، ناهمگام، چت، ELO، پروفایل
'use strict';

class MultiplayerManager {
    constructor(gameState) {
        this.gs = gameState;
        this.db = null;
        this.currentRoom = null;
        this.playerId = this.generatePlayerId();
        this.playerName = localStorage.getItem('mp_playerName') || 'فرمانده ' + Math.floor(Math.random() * 9000 + 1000);
        this.playerFlag = localStorage.getItem('mp_playerFlag') || '🏴';
        this.eloRating = parseInt(localStorage.getItem('mp_elo') || '1200');
        this.isHost = false;
        this.opponentId = null;
        this.opponentName = null;
        this.opponentRating = null;
        this.chatMessages = [];
        this.leaderboard = [];
        this.spectators = [];
        this.isOnline = false;
        this.matchType = null; // 'realtime', 'async'
        this.lastMoveTimestamp = null;
        this.matchHistory = [];
        this.initFirebase();
    }

    // ============ راه‌اندازی Firebase ============
    initFirebase() {
        if (!CONFIG.FIREBASE.ENABLED || typeof firebase === 'undefined') {
            console.log('بخش چندنفره غیرفعال است.');
            return;
        }

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(CONFIG.FIREBASE.CONFIG);
            }
            this.db = firebase.database();
            this.isOnline = true;
            this.setupPresence();
            this.loadMatchHistory();
            console.log('🌐 بخش چندنفره آماده است.');
        } catch (e) {
            console.warn('Firebase راه‌اندازی نشد:', e);
            this.isOnline = false;
        }
    }

    // ============ حضور آنلاین ============
    setupPresence() {
        const presenceRef = this.db.ref('presence/' + this.playerId);
        presenceRef.set({
            name: this.playerName,
            flag: this.playerFlag,
            elo: this.eloRating,
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        presenceRef.onDisconnect().update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    }

    // ============ پروفایل بازیکن ============
    updateProfile(name, flag) {
        if (name) {
            this.playerName = name;
            localStorage.setItem('mp_playerName', name);
        }
        if (flag) {
            this.playerFlag = flag;
            localStorage.setItem('mp_playerFlag', flag);
        }
        if (this.isOnline) {
            const ref = this.db.ref('players/' + this.playerId);
            ref.update({
                name: this.playerName,
                flag: this.playerFlag,
                elo: this.eloRating
            });
            this.setupPresence();
        }
    }

    // ============ Quick Match ============
    queueForQuickMatch(matchType = 'realtime') {
        if (!this.isOnline) return false;

        const queueRef = this.db.ref('matchmaking/' + matchType);
        const playerEntry = {
            playerId: this.playerId,
            name: this.playerName,
            rating: this.eloRating,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        };

        // افزودن به صف
        const newEntryRef = queueRef.push(playerEntry);

        // حذف از صف هنگام قطع
        newEntryRef.onDisconnect().remove();

        this.gs.log('🔍 در حال جستجوی حریف...', 'system');

        // گوش دادن به صف برای حریف
        const onChildAdded = (snap) => {
            const entry = snap.val();
            if (entry.playerId === this.playerId) return;

            // حریف پیدا شد!
            newEntryRef.off('child_added', onChildAdded);

            // ایجاد اتاق جدید
            const roomId = `quick_${Date.now()}`;
            this.db.ref(`rooms/${roomId}`).set({
                host: this.playerId,
                hostName: this.playerName,
                hostRating: this.eloRating,
                guest: entry.playerId,
                guestName: entry.name,
                guestRating: entry.rating,
                status: 'playing',
                matchType: matchType,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                turn: 0,
                currentPlayer: this.playerId,
                gameData: null,
                chat: {}
            });

            // حذف هر دو از صف
            this.db.ref(`matchmaking/${matchType}/${snap.key}`).remove();
            newEntryRef.remove();

            this.currentRoom = roomId;
            this.isHost = true;
            this.opponentId = entry.playerId;
            this.opponentName = entry.name;
            this.opponentRating = entry.rating;
            this.matchType = matchType;

            this.startMatch();
        };

        queueRef.on('child_added', onChildAdded);
        return true;
    }

    // ============ ایجاد اتاق خصوصی ============
    createPrivateRoom() {
        if (!this.isOnline) return null;

        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        this.db.ref(`rooms/${roomCode}`).set({
            host: this.playerId,
            hostName: this.playerName,
            hostRating: this.eloRating,
            guest: null,
            guestName: null,
            status: 'waiting',
            matchType: 'realtime',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            turn: 0,
            currentPlayer: null,
            gameData: null
        });

        this.currentRoom = roomCode;
        this.isHost = true;

        this.db.ref(`rooms/${roomCode}/guest`).on('value', (snap) => {
            const guest = snap.val();
            if (guest) {
                this.opponentId = guest;
                this.db.ref(`rooms/${roomCode}/guestName`).once('value', (nameSnap) => {
                    this.opponentName = nameSnap.val() || 'حریف';
                    this.db.ref(`rooms/${roomCode}/status`).set('playing');
                    this.startMatch();
                });
            }
        });

        this.gs.log(`🏠 کد اتاق: ${roomCode}`, 'system');
        return roomCode;
    }

    joinRoom(roomCode) {
        if (!this.isOnline || !roomCode) return false;

        this.db.ref(`rooms/${roomCode}`).once('value').then((snap) => {
            const room = snap.val();
            if (!room) {
                this.gs.log('اتاق پیدا نشد.', 'system');
                return;
            }
            if (room.guest) {
                this.gs.log('اتاق پر است.', 'system');
                return;
            }

            this.currentRoom = roomCode;
            this.isHost = false;
            this.opponentId = room.host;
            this.opponentName = room.hostName;
            this.opponentRating = room.hostRating;
            this.matchType = room.matchType || 'realtime';

            this.db.ref(`rooms/${roomCode}/guest`).set(this.playerId);
            this.db.ref(`rooms/${roomCode}/guestName`).set(this.playerName);
            this.db.ref(`rooms/${roomCode}/guestRating`).set(this.eloRating);
            this.db.ref(`rooms/${roomCode}/status`).set('playing');

            this.startMatch();
        });
    }

    // ============ شروع بازی ============
    startMatch() {
        if (!this.currentRoom) return;

        this.gs.log(`⚔ نبرد با ${this.opponentName} (ELO: ${this.opponentRating})`, 'system');

        // تنظیمات اولیه بازی
        this.gs.initialize();

        // گوش دادن به تغییرات بازی
        this.gameRef = this.db.ref(`rooms/${this.currentRoom}/gameData`);
        this.gameRef.on('value', (snap) => {
            const data = snap.val();
            if (data && data.turn !== this.gs.currentTurn && data.lastMoveBy !== this.playerId) {
                this.receiveOpponentMove(data);
            }
        });

        // وضعیت اتمام
        this.db.ref(`rooms/${this.currentRoom}/status`).on('value', (snap) => {
            if (snap.val() === 'finished') {
                this.endGame(snap.val());
            }
        });

        // چت
        this.setupChat();

        eventBus.emit(GAME_EVENTS.GAME_INITIALIZED, { multiplayer: true });
    }

    // ============ ارسال و دریافت حرکت ============
    sendMove(moveData) {
        if (!this.isOnline || !this.gameRef) return;

        // اعتبارسنجی میزبان بودن و نوبت
        if (this.matchType === 'realtime' && this.gs.currentPlayer !== this.playerId) return;

        const gameData = this.gs.toSaveData();
        gameData.lastMoveBy = this.playerId;
        gameData.turn = this.gs.currentTurn;
        gameData.timestamp = firebase.database.ServerValue.TIMESTAMP;

        this.gameRef.set(gameData);
        this.db.ref(`rooms/${this.currentRoom}/currentPlayer`).set(this.opponentId);
    }

    receiveOpponentMove(data) {
        this.gs.loadSaveData(data);
        this.gs.log(`📩 حرکت ${this.opponentName} دریافت شد.`, 'system');
        eventBus.emit(GAME_EVENTS.NEW_TURN, { turn: data.turn });
    }

    // ============ سیستم ناهمگام ============
    enableAsyncMode() {
        this.matchType = 'async';
        // ذخیره وضعیت هنگام خروج
        window.addEventListener('beforeunload', () => {
            if (this.currentRoom) {
                this.db.ref(`rooms/${this.currentRoom}/currentPlayer`).set(this.opponentId);
                this.db.ref(`rooms/${this.currentRoom}/gameData`).set(this.gs.toSaveData());
            }
        });

        // بازیابی هنگام ورود
        this.db.ref(`rooms/${this.currentRoom}/gameData`).once('value', (snap) => {
            const data = snap.val();
            if (data) {
                const currentPlayer = data.currentPlayer || this.playerId;
                if (currentPlayer !== this.playerId) {
                    this.gs.log('⏳ نوبت حریف است. منتظر بمانید...', 'system');
                }
            }
        });
    }

    // ============ چت ============
    setupChat() {
        if (!this.currentRoom) return;

        this.chatRef = this.db.ref(`rooms/${this.currentRoom}/chat`);
        this.chatRef.limitToLast(30).on('child_added', (snap) => {
            const msg = snap.val();
            this.chatMessages.push(msg);
            if (this.chatMessages.length > 50) this.chatMessages.shift();
            eventBus.emit('chatReceived', msg);
        });
    }

    sendChatMessage(text) {
        if (!this.chatRef || !text.trim()) return;

        const message = {
            senderId: this.playerId,
            senderName: this.playerName,
            text: text.substring(0, 200),
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        this.chatRef.push(message);
    }

    // ============ پایان بازی و ELO ============
    surrender() {
        if (!this.currentRoom) return;
        this.db.ref(`rooms/${this.currentRoom}/status`).set('finished');
        this.db.ref(`rooms/${this.currentRoom}/winner`).set(this.opponentId);
        this.updateELO(false);
    }

    endGame(winnerId) {
        const won = winnerId === this.playerId;
        this.updateELO(won);
        this.saveMatchResult(won);

        this.gs.log(won ? '🏆 پیروزی!' : '💔 شکست...', 'system');

        // پاکسازی
        if (this.gameRef) this.gameRef.off();
        if (this.chatRef) this.chatRef.off();
        if (this.isHost) {
            this.db.ref(`rooms/${this.currentRoom}`).remove();
        }

        this.currentRoom = null;
        this.isHost = false;
        this.opponentId = null;

        eventBus.emit(GAME_EVENTS.GAME_OVER, { multiplayer: true, won });
    }

    // ============ سیستم ELO ============
    updateELO(won) {
        const K = 32;
        const expected = 1 / (1 + Math.pow(10, (this.opponentRating - this.eloRating) / 400));
        const newElo = Math.round(this.eloRating + K * ((won ? 1 : 0) - expected));
        this.eloRating = newElo;
        localStorage.setItem('mp_elo', newElo.toString());

        if (this.isOnline) {
            this.db.ref('players/' + this.playerId).update({ elo: newElo });
            this.db.ref('leaderboard/' + this.playerId).update({
                name: this.playerName,
                flag: this.playerFlag,
                rating: newElo,
                wins: won ? firebase.database.ServerValue.increment(1) : 0,
                losses: !won ? firebase.database.ServerValue.increment(1) : 0
            });
        }
    }

    // ============ تاریخچه مسابقات ============
    saveMatchResult(won) {
        const match = {
            opponent: this.opponentName,
            opponentRating: this.opponentRating,
            won,
            date: new Date().toISOString(),
            myRating: this.eloRating,
            roomId: this.currentRoom
        };
        this.matchHistory.unshift(match);
        if (this.matchHistory.length > 50) this.matchHistory.pop();
        localStorage.setItem('mp_history', JSON.stringify(this.matchHistory));
    }

    loadMatchHistory() {
        try {
            const data = localStorage.getItem('mp_history');
            if (data) this.matchHistory = JSON.parse(data);
        } catch (e) {
            this.matchHistory = [];
        }
    }

    // ============ لیدربورد ============
    loadLeaderboard(callback) {
        if (!this.isOnline) return;

        this.db.ref('leaderboard').orderByChild('rating').limitToLast(50).once('value', (snap) => {
            const topPlayers = [];
            snap.forEach((child) => {
                topPlayers.unshift({ id: child.key, ...child.val() });
            });
            this.leaderboard = topPlayers;
            if (callback) callback(topPlayers);
        });
    }

    // ============ نظاره‌گر ============
    watchGame(roomId) {
        if (!this.isOnline) return;

        this.db.ref(`rooms/${roomId}`).once('value').then((snap) => {
            const room = snap.val();
            if (!room || room.status !== 'playing') {
                this.gs.log('این بازی در حال انجام نیست.', 'system');
                return;
            }

            this.currentRoom = roomId;
            this.db.ref(`rooms/${roomId}/spectators/${this.playerId}`).set(this.playerName);

            this.gameRef = this.db.ref(`rooms/${roomId}/gameData`);
            this.gameRef.on('value', (gameSnap) => {
                const data = gameSnap.val();
                if (data) {
                    this.gs.loadSaveData(data);
                }
            });

            this.gs.log('📺 در حال تماشای بازی...', 'system');
        });
    }

    // ============ ابزار ============
    generatePlayerId() {
        return 'mp_' + Math.random().toString(36).substr(2, 12);
    }

    getStatus() {
        return {
            isOnline: this.isOnline,
            currentRoom: this.currentRoom,
            isHost: this.isHost,
            opponentName: this.opponentName,
            opponentRating: this.opponentRating,
            elo: this.eloRating,
            matchType: this.matchType,
            history: this.matchHistory.slice(0, 10)
        };
    }
}
