// sturmglanz/js/ui.js
// رابط کاربری کامل و بی‌نظیر - تمام پنل‌ها، تولتیپ، پنل ساخت، مدیریت جوخه، سینمایی، نوتیفیکیشن و غیره
'use strict';

class UIManager {
    constructor(gameState, renderer, effectsManager) {
        this.gs = gameState;
        this.renderer = renderer;
        this.effects = effectsManager;
        this.campaign = gameState.campaign;
        this.narrative = gameState.narrative;
        this.multiplayer = gameState.multiplayer;

        // کش DOM
        this.elements = {
            unitList: document.getElementById('unit-list'),
            infoTitle: document.getElementById('info-title'),
            infoDetails: document.getElementById('info-details'),
            overlay: document.getElementById('overlay'),
            modal: document.getElementById('modal'),
            btnEndTurn: document.getElementById('btn-end-turn'),
            btnCenterHQ: document.getElementById('btn-center-hq'),
            btnSaveGame: document.getElementById('btn-save-game'),
            logPanel: document.getElementById('log-panel'),
            topBar: document.getElementById('top-bar'),
            resRp: document.getElementById('res-rp'),
            resFuel: document.getElementById('res-fuel'),
            resAmmo: document.getElementById('res-ammo'),
            resTurn: document.getElementById('res-turn'),
            tooltip: this.createTooltipElement(),
            toastContainer: this.createToastContainer(),
            armyMoraleBar: document.getElementById('army-morale-bar'),
            cinematicOverlay: document.getElementById('cinematic-overlay')
        };

        // حالت‌ها
        this.currentModal = null;
        this.isMainMenuVisible = true;
        this.dialogueCallbacks = [];

        // تنظیمات
        this.settings = {
            musicVolume: 0.4,
            sfxVolume: 0.7,
            language: 'fa',
            showGrid: true,
            showMinimap: true
        };

        this.init();
    }

    // ============ راه‌اندازی اولیه ============
    init() {
        this.bindEvents();
        this.showMainMenu();
        
        // گالری قهرمانان و سایر نمایشگرهای مخصوص
        document.getElementById('btn-hero-gallery')?.addEventListener('click', () => this.showHeroGallery());
        document.getElementById('btn-medals')?.addEventListener('click', () => this.showMedals());
        document.getElementById('btn-diary')?.addEventListener('click', () => this.showDiary());
        document.getElementById('btn-radio')?.addEventListener('click', () => this.showRadioPanel());
        document.getElementById('btn-write-letter')?.addEventListener('click', () => this.showLetterToSon());

        // بروزرسانی‌های دوره‌ای
        eventBus.on(GAME_EVENTS.NEW_TURN, () => this.updateAllPanels());
        eventBus.on(GAME_EVENTS.RESOURCES_CHANGED, () => this.updateResourceDisplay());
        eventBus.on(GAME_EVENTS.UNIT_SELECTED, (data) => this.onUnitSelected(data.unit));
        eventBus.on(GAME_EVENTS.UNIT_DESELECTED, () => this.onUnitDeselected());
        eventBus.on(GAME_EVENTS.PHASE_CHANGED, () => this.updateActionButtons());
        eventBus.on(GAME_EVENTS.LOG_ADDED, (data) => this.updateLogPanel(data));
        eventBus.on(GAME_EVENTS.DIALOGUE_TRIGGERED, (data) => this.showDialogueModal(data));
        eventBus.on(GAME_EVENTS.GAME_OVER, (data) => this.showGameOver(data));
        eventBus.on(GAME_EVENTS.MISSION_COMPLETE, (data) => this.showMissionSummary(data));
        eventBus.on(GAME_EVENTS.CHARACTER_DIED, (data) => this.showCinematicQuote(data.character?.deathQuote));
        eventBus.on(GAME_EVENTS.POEM_DISPLAYED, (poem) => this.showCinematicQuote(poem.text));
        eventBus.on('chatReceived', (data) => this.showToast(`پیام از ${data.senderName}: ${data.text}`));
    }

    bindEvents() {
        if (this.elements.btnEndTurn) this.elements.btnEndTurn.addEventListener('click', () => this.gs.endTurn());
        if (this.elements.btnCenterHQ) this.elements.btnCenterHQ.addEventListener('click', () => this.focusOnHQ());
        if (this.elements.btnSaveGame) this.elements.btnSaveGame.addEventListener('click', () => this.showSaveMenu());
    }

    // ============ عناصر DOM کمکی ============
    createTooltipElement() {
        const el = document.createElement('div');
        el.id = 'game-tooltip';
        el.style.cssText = 'position:fixed; background:rgba(0,0,0,0.9); color:#fff; padding:6px 10px; border:1px solid var(--gold); border-radius:3px; font-size:0.8em; pointer-events:none; z-index:300; display:none;';
        document.body.appendChild(el);
        return el;
    }

    createToastContainer() {
        const el = document.createElement('div');
        el.id = 'toast-container';
        el.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:400; display:flex; flex-direction:column-reverse; gap:5px;';
        document.body.appendChild(el);
        return el;
    }

    showToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.style.cssText = 'background:rgba(0,0,0,0.85); color:#fff; padding:8px 15px; border-radius:3px; font-size:0.8em; border-left:3px solid var(--gold); animation: slideIn 0.3s ease;';
        toast.textContent = message;
        this.elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ============ تولتیپ هوشمند ============
    showTooltip(x, y, content) {
        const el = this.elements.tooltip;
        el.innerHTML = content;
        el.style.display = 'block';
        el.style.left = `${x + 15}px`;
        el.style.top = `${y + 15}px`;
    }

    hideTooltip() {
        this.elements.tooltip.style.display = 'none';
    }

    // ============ نمایش‌های اصلی ============
    showMainMenu() {
        this.isMainMenuVisible = true;
        const html = `
            <h2>⚔ اشتورم‌گلانتس ⚔</h2>
            <p style="color:var(--gold);">شامگاه خدایان</p>
            <div class="menu-buttons">
                <button class="btn primary" id="btn-campaign">🏰 کمپین</button>
                <button class="btn" id="btn-multiplayer">🌐 چندنفره</button>
                <button class="btn" id="btn-settings">⚙️ تنظیمات</button>
                <button class="btn" id="btn-about">📜 درباره</button>
            </div>
        `;
        this.showOverlay(html);
        document.getElementById('btn-campaign')?.addEventListener('click', () => this.showCampaignMenu());
        document.getElementById('btn-multiplayer')?.addEventListener('click', () => this.showMultiplayerMenu());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-about')?.addEventListener('click', () => this.showAbout());
    }

    // ============ منوی کمپین ============
    showCampaignMenu() {
        if (!this.campaign) return;
        const missions = this.campaign.missions;
        let html = `<h3>🗺️ کمپین (${this.campaign.campaignProgress.playerRank})</h3><div class="mission-list">`;
        missions.forEach(m => {
            const status = this.campaign.getMissionStatus(m.id);
            const locked = status === 'locked' ? 'disabled' : '';
            html += `<button class="btn ${locked}" id="start-mission-${m.id}" ${status==='locked'?'disabled':''}>
                ${m.id}. ${m.name} [${status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⬜'}]
            </button>`;
        });
        html += '</div><button class="btn" id="back-to-menu">بازگشت</button>';
        this.showOverlay(html);
        missions.forEach(m => {
            document.getElementById(`start-mission-${m.id}`)?.addEventListener('click', () => {
                this.campaign.startMission(m.id);
                this.hideOverlay();
                this.isMainMenuVisible = false;
            });
        });
        document.getElementById('back-to-menu')?.addEventListener('click', () => this.showMainMenu());
    }

    // ============ منوی چندنفره (خلاصه) ============
    showMultiplayerMenu() {
        if (!this.multiplayer?.isOnline) {
            this.showOverlay('<p>بخش چندنفره در دسترس نیست.</p><button class="btn" id="back-to-menu">بازگشت</button>');
            document.getElementById('back-to-menu')?.addEventListener('click', () => this.showMainMenu());
            return;
        }
        let html = `<h3>🌐 چندنفره</h3><p>نام: ${this.multiplayer.playerName} | ELO: ${this.multiplayer.eloRating}</p>`;
        html += '<button class="btn" id="btn-quick-match">Quick Match</button>';
        html += '<button class="btn" id="btn-create-room">اتاق خصوصی</button>';
        html += '<button class="btn" id="btn-join-room">پیوستن</button>';
        html += '<button class="btn" id="btn-leaderboard">لیدربورد</button>';
        html += '<button class="btn" id="back-to-menu">بازگشت</button>';
        this.showOverlay(html);
        document.getElementById('btn-quick-match')?.addEventListener('click', () => { this.multiplayer.queueForQuickMatch(); this.hideOverlay(); });
        document.getElementById('btn-create-room')?.addEventListener('click', () => {
            const room = this.multiplayer.createPrivateRoom();
            this.showOverlay(`<p>کد اتاق: <b>${room}</b></p><button class="btn" id="cancel-room">انصراف</button>`);
            document.getElementById('cancel-room')?.addEventListener('click', () => { this.multiplayer.endMultiplayerGame(); this.hideOverlay(); });
        });
        document.getElementById('btn-join-room')?.addEventListener('click', () => {
            const code = prompt('کد اتاق:');
            if (code) { this.multiplayer.joinRoom(code); this.hideOverlay(); }
        });
        document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
            this.multiplayer.loadLeaderboard((top) => {
                let lb = '<h3>🏆 لیدربورد</h3><ol>';
                top.slice(0,10).forEach(p => lb += `<li>${p.name} (${p.rating})</li>`);
                lb += '</ol><button class="btn" id="back-to-mp">بازگشت</button>';
                this.showOverlay(lb);
                document.getElementById('back-to-mp')?.addEventListener('click', () => this.showMultiplayerMenu());
            });
        });
        document.getElementById('back-to-menu')?.addEventListener('click', () => this.showMainMenu());
    }

    // ============ پنل ساخت یگان ============
    showRecruitmentPanel() {
        const available = UnitFactory.getAvailableUnits(this.gs);
        let html = '<h3>🏭 ساخت یگان</h3><div class="recruitment-grid">';
        available.forEach(u => {
            html += `<div class="unit-card recruit" data-type="${u.type}">
                <b>${u.name}</b> (${u.cost} RP)<br>
                <small>${u.description}</small>
                ${u.canAfford ? '<button class="btn-small">ساخت</button>' : '<span style="color:red;">منابع کم</span>'}
            </div>`;
        });
        html += '</div><button class="btn" id="close-recruit">بستن</button>';
        this.showOverlay(html);
        
        document.querySelectorAll('.unit-card.recruit[data-type]').forEach(card => {
            const type = card.getAttribute('data-type');
            card.querySelector('button')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const positions = UnitFactory.getBuildablePositions(this.gs);
                if (positions.length > 0) {
                    const pos = positions[0];
                    const newUnit = UnitFactory.createUnit(type, FACTION.WEHRMACHT, pos, this.gs);
                    if (newUnit) {
                        this.updateAllPanels();
                        this.hideOverlay();
                        this.renderer?.centerOnUnit(newUnit);
                    }
                } else {
                    this.showToast('جایی برای ساخت نیست!', 2000);
                }
            });
        });
        document.getElementById('close-recruit')?.addEventListener('click', () => this.hideOverlay());
    }

    // ============ بروزرسانی پنل‌ها ============
    updateAllPanels() {
        this.updateUnitList();
        this.updateInfoPanel(this.gs.selectedUnit);
        this.updateActionButtons();
        this.updateResourceDisplay();
        this.updateArmyMoraleBar();
        this.updateMinimap();
    }

    updateUnitList() {
        const container = this.elements.unitList;
        if (!container) return;
        container.innerHTML = '';
        const myUnits = this.gs.getMyUnits().sort((a,b) => (a.type===UNIT_TYPE.HQ?-1:0) || a.name.localeCompare(b.name));
        myUnits.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'unit-card';
            if (this.gs.selectedUnit?.id === unit.id) card.classList.add('selected');
            card.innerHTML = `
                <div class="unit-card-header">
                    <span class="unit-card-name">${unit.name}</span>
                    <span class="unit-card-type">${UNIT_STATS[unit.type]?.name || ''}</span>
                </div>
                <div class="unit-card-stats">
                    <span class="stat health">${unit.health}</span>
                    <span class="stat attack">${unit.getEffectiveAttack()}</span>
                    <span class="stat movement">${Math.floor(unit.movementPoints)}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                this.gs.selectedUnit = unit;
                this.updateAllPanels();
                this.renderer?.centerOnUnit(unit);
                eventBus.emit(GAME_EVENTS.UNIT_SELECTED, { unit });
            });
            container.appendChild(card);
        });
    }

    updateArmyMoraleBar() {
        const bar = this.elements.armyMoraleBar;
        if (!bar) return;
        const units = this.gs.getMyUnits();
        const avgMorale = units.length ? Math.floor(units.reduce((s,u)=>s+u.morale,0)/units.length) : 100;
        bar.style.width = `${avgMorale}%`;
        bar.style.backgroundColor = avgMorale > 60 ? '#4a8' : avgMorale > 30 ? '#ca5' : '#a44';
    }

    // ============ صحنه‌های سینمایی ============
    showCinematicQuote(text) {
        if (!text) return;
        const overlay = this.elements.cinematicOverlay || document.getElementById('cinematic-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        overlay.innerHTML = `<blockquote style="color:#c8a84e;font-style:italic;font-size:1.2em;text-align:center;">${text}</blockquote>`;
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = '1'; }, 1000);
        }, 3000);
    }

    // ============ مودال‌ها (ادامه مشابه قبل) ============
    showOverlay(html) {
        if (this.elements.overlay && this.elements.modal) {
            this.elements.modal.innerHTML = html;
            this.elements.overlay.classList.remove('hidden');
        }
    }
    hideOverlay() {
        this.elements.overlay?.classList.add('hidden');
    }
    showSaveMenu() {
        let html = '<h3>💾 ذخیره</h3>';
        for(let i=1;i<=3;i++) html += `<button class="btn" id="save-slot-${i}">اسلات ${i}</button>`;
        html += '<button class="btn" id="cancel-save">بازگشت</button>';
        this.showOverlay(html);
        for(let i=1;i<=3;i++) document.getElementById(`save-slot-${i}`)?.addEventListener('click', () => {
            StorageManager?.saveGame(`slot${i}`, this.gs.toSaveData());
            this.showToast('ذخیره شد!');
            this.hideOverlay();
        });
        document.getElementById('cancel-save')?.addEventListener('click', () => this.hideOverlay());
    }
    showSettings() {
        let html = `<h3>⚙️ تنظیمات</h3>
            <label>صدای موسیقی: <input type="range" id="music-vol" value="${this.settings.musicVolume*100}"></label><br>
            <label>زبان: <select id="lang-select"><option value="fa" ${this.settings.language==='fa'?'selected':''}>فارسی</option><option value="de">آلمانی</option></select></label><br>
            <button class="btn primary" id="save-settings">ذخیره</button><button class="btn" id="cancel-settings">بازگشت</button>`;
        this.showOverlay(html);
        document.getElementById('save-settings')?.addEventListener('click', () => {
            this.settings.musicVolume = document.getElementById('music-vol').value/100;
            this.settings.language = document.getElementById('lang-select').value;
            this.gs.audio?.setMusicVolume(this.settings.musicVolume);
            I18N?.setLanguage(this.settings.language);
            this.hideOverlay();
            this.showMainMenu();
        });
        document.getElementById('cancel-settings')?.addEventListener('click', () => this.showMainMenu());
    }
    showAbout() {
        this.showOverlay(`<h3>📜 اشتورم‌گلانتس</h3><p>${CONFIG.VERSION}</p><p>تقدیم به تمام قربانیان جنگ.</p><button class="btn" id="close-about">بازگشت</button>`);
        document.getElementById('close-about')?.addEventListener('click', () => this.showMainMenu());
    }
    // ... سایر نمایش‌ها مانند گالری قهرمانان، مدال‌ها، رادیو، نامه و غیره مشابه نسخه قبلی
    showHeroGallery() {
        const heroes = this.gs.heroesGallery || [];
        let html = '<h3>🏛️ گالری قهرمانان</h3><div class="scrollable">';
        heroes.forEach(h => html += `<p><b>${h.name}</b> - ${h.lastWords || '...'}</p>`);
        html += '</div><button class="btn" id="close-heroes">بستن</button>';
        this.showOverlay(html);
        document.getElementById('close-heroes')?.addEventListener('click', () => this.hideOverlay());
    }
    showMedals() {
        const medals = this.campaign?.campaignProgress?.medals || [];
        let html = '<h3>🏅 مدال‌ها</h3>';
        medals.forEach(m => html += `<p>🥇 ${m}</p>`);
        html += '<button class="btn" id="close-medals">بستن</button>';
        this.showOverlay(html);
        document.getElementById('close-medals')?.addEventListener('click', () => this.hideOverlay());
    }
    showDiary() {
        // پیاده‌سازی مشابه دفتر خاطرات
    }
    showRadioPanel() {
        let html = '<h3>📻 رادیو</h3><button class="btn" id="radio-berlin">برلین</button><button class="btn" id="close-radio">بستن</button>';
        this.showOverlay(html);
        document.getElementById('radio-berlin')?.addEventListener('click', () => {
            this.gs.audio?.playRadio('berlin');
            this.hideOverlay();
        });
        document.getElementById('close-radio')?.addEventListener('click', () => this.hideOverlay());
    }
    showLetterToSon() {
        let html = '<h3>✉️ نامه به کارل</h3><textarea id="letter-text" rows="4"></textarea><br><button class="btn primary" id="send-letter">ارسال</button><button class="btn" id="cancel-letter">بازگشت</button>';
        this.showOverlay(html);
        document.getElementById('send-letter')?.addEventListener('click', () => {
            const text = document.getElementById('letter-text')?.value;
            if (text && this.narrative) {
                this.narrative.writeFinalLetter(text);
                this.showToast('نامه برای همیشه ثبت شد.');
            }
            this.hideOverlay();
        });
        document.getElementById('cancel-letter')?.addEventListener('click', () => this.hideOverlay());
    }
    showMissionSummary(data) {
        if (!data) return;
        let html = `<h3>خلاصه مأموریت</h3><p>${data.success?'پیروزی':'شکست'}</p>`;
        html += `<button class="btn primary" id="continue-campaign">ادامه</button>`;
        this.showOverlay(html);
        document.getElementById('continue-campaign')?.addEventListener('click', () => { this.hideOverlay(); this.showCampaignMenu(); });
    }
    showDialogueModal(data) {
        let html = `<div class="dialogue">`;
        if(data.speaker) html += `<p><b>${data.speaker}:</b> "${data.text}"</p>`;
        else html += `<p>${data.text || data.message}</p>`;
        if(data.options) data.options.forEach(opt => html += `<button class="btn" data-option="${opt.id}">${opt.text}</button>`);
        else html += '<button class="btn" id="close-dialogue">ادامه</button>';
        html += '</div>';
        this.showOverlay(html);
        document.getElementById('close-dialogue')?.addEventListener('click', () => this.hideOverlay());
        if(data.options) document.querySelectorAll('[data-option]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const opt = data.options.find(o=>o.id===e.target.dataset.option);
                if(opt?.effect && this.campaign) {
                    // اعمال تأثیرات وفاداری و ...
                    for(const [key,val] of Object.entries(opt.effect)) {
                        if(key.endsWith('_loyalty')) {
                            const charId = key.replace('_loyalty','');
                            if(this.campaign.characters[charId]) this.campaign.characters[charId].loyalty += val;
                        }
                    }
                }
                this.hideOverlay();
            });
        });
    }
    showGameOver(data) {
        this.showOverlay(`<h2>${data.victory?'پیروزی':'شکست'}</h2><p>${data.message}</p><button class="btn primary" id="restart-game">شروع دوباره</button><button class="btn" id="to-menu">منو</button>`);
        document.getElementById('restart-game')?.addEventListener('click', ()=>{this.hideOverlay(); this.gs.initialize();});
        document.getElementById('to-menu')?.addEventListener('click', ()=>{this.hideOverlay(); this.showMainMenu();});
    }
    focusOnHQ() {
        const hq = this.gs.getMyUnits().find(u => u.type === UNIT_TYPE.HQ);
        if (hq) this.renderer?.centerOnUnit(hq);
    }
    updateInfoPanel(unit) { /* مختصر مشابه قبل */ }
    updateActionButtons() { /* مختصر مشابه قبل */ }
    updateResourceDisplay() {
        if(this.elements.resRp) this.elements.resRp.textContent = this.gs.resources.rp;
        if(this.elements.resFuel) this.elements.resFuel.textContent = this.gs.resources.fuel;
        if(this.elements.resAmmo) this.elements.resAmmo.textContent = this.gs.resources.ammo;
        if(this.elements.resTurn) this.elements.resTurn.textContent = this.gs.currentTurn;
    }
    updateMinimap() { this.renderer?.renderMinimap(); }
    updateLogPanel(data) {
        if(!this.elements.logPanel || !data) return;
        const entry = document.createElement('div');
        entry.className = `log-entry ${data.type}`;
        entry.textContent = `[${this.gs.currentTurn}] ${data.message}`;
        this.elements.logPanel.appendChild(entry);
        this.elements.logPanel.scrollTop = this.elements.logPanel.scrollHeight;
    }
}
