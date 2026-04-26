// sturmglanz/js/narrative.js
// سیستم روایت کامل - داستان پویا، رازها، شعر، نامه، دفتر خاطرات، رادیو، دادگاه نظامی،
// واکنش به مرگ، وفاداری، خیانت، دعوا، آشتی، فرار، فلش‌بک، اپیلوگ

'use strict';

class NarrativeSystem {
    constructor(gameState, campaignManager) {
        this.gs = gameState;
        this.campaign = campaignManager;
        this.activeDialogues = [];
        this.discoveredMysteries = [];
        this.poems = this.loadPoems();
        this.storyFlags = {};
        this.dialogueHistory = [];
        this.pendingCourtMartial = null;
        this.betrayalTriggered = false;
        this.flashbacks = this.loadFlashbacks();
        this.characterConflicts = [];
        this.finalLetterWritten = false;
    }

    // ============ اشعار جنگی ============
    loadPoems() {
        return [
            {
                id: 'winter_1',
                title: 'زمستان ۱۹۴۴',
                text: 'برف می‌بارد بر شانه‌های خسته‌ام\nسکوت سنگر، همدم تنهایی‌ام\nدر دوردست، آتش و دود\nو من فقط به خانه می‌اندیشم',
                trigger: () => this.gs.weatherState === 'schnee' && this.gs.dayPhase === 'night',
                displayed: false
            },
            {
                id: 'comrade_fallen',
                title: 'برای رفیق',
                text: 'تو رفتی و تفنگت ماند\nخون گرمت بر برف سرد\nقول دادم برنگردم\nاما تو جا ماندی',
                trigger: () => this.campaign.campaignProgress.characterDeaths.length > 0,
                displayed: false
            },
            {
                id: 'mother',
                title: 'مادر',
                text: 'مادر، اگر برنگشتم\nبدان که در راه وطن\nدر میان آتش و فولاد\nبه آسمان نگریستم',
                trigger: () => this.gs.currentTurn > 20,
                displayed: false
            },
            {
                id: 'hope',
                title: 'امید',
                text: 'گلی کوچک میان آوار\nرنگ زردش در خاکستری\nشاید فردا\nخورشید طلوع کند',
                trigger: () => this.gs.dayPhase === 'dawn',
                displayed: false
            },
            {
                id: 'last_letter',
                title: 'آخرین نامه',
                text: 'اگر این آخرین نامه باشد\nبدان که دوستت داشتم\nای وطن، ای مادر، ای پسرکم\nروزی همدیگر را خواهیم دید',
                trigger: () => this.campaign.currentMission >= 19,
                displayed: false
            }
        ];
    }

    // ============ فلش‌بک‌ها ============
    loadFlashbacks() {
        return [
            {
                id: 'prewar_1',
                title: 'مونیخ، ۱۹۳۸',
                text: 'پسرکم کارل روی شانه‌هایم نشسته بود.\nاز بالای کوه به شهر نگاه می‌کردیم.\nاو پرسید: "بابا، هیچوقت جنگ نمی‌شه؟"\nمن گفتم: "نه پسرم. هیچوقت."',
                triggerMission: 1,
                displayed: false
            },
            {
                id: 'prewar_2',
                title: 'برلین، ۱۹۴۰',
                text: 'رژه پیروزی در خیابانهای برلین.\nهمه خوشحال بودند.\nمن هم بودم.\nنمی‌دانستم چهار سال بعد کجا خواهم بود.',
                triggerMission: 10,
                displayed: false
            },
            {
                id: 'prewar_3',
                title: 'کریسمس ۱۹۴۳',
                text: 'آخرین کریسمس قبل از رفتنم.\nکارل یک سرباز اسباب‌بازی به من داد.\nگفت: "بابا، اینو ببر تا ازت محافظت کنه."\nهنوز در جیبم است.',
                triggerMission: 15,
                displayed: false
            }
        ];
    }

    // ============ پردازش رویدادهای داستانی ============
    processTurn() {
        this.checkPoems();
        this.checkMysteries();
        this.checkCharacterConflicts();
        this.checkBetrayal();
        this.updateLoyaltyEffects();
        this.processRadio();
        this.generateJournalEntry();
        this.checkFlashbacks();
    }

    // ============ اشعار ============
    checkPoems() {
        for (const poem of this.poems) {
            if (!poem.displayed && poem.trigger()) {
                poem.displayed = true;
                this.gs.log(`📜 شعر: "${poem.title}"\n${poem.text}`, 'system');
                eventBus.emit(GAME_EVENTS.POEM_DISPLAYED, { poem });
            }
        }
    }

    // ============ رازها و معماها ============
    checkMysteries() {
        const mysteries = [
            {
                id: 'radio_signal',
                title: 'سیگنال مرموز',
                description: 'در میان پارازیت‌های رادیو، گاهی صدای ضعیفی شنیده می‌شود. کسی به آلمانی حرف می‌زند درباره صلح. اما هیچ فرکانسی نباید این صدا را پخش کند.',
                trigger: () => this.gs.currentTurn === 7 && !this.discoveredMysteries.includes('radio_signal'),
                onDiscover: () => {
                    this.gs.log('🔍 راز کشف شد: سیگنال مرموز', 'system');
                    this.storyFlags.radioSignalHeard = true;
                }
            },
            {
                id: 'missing_soldier',
                title: 'سرباز گمشده',
                description: 'در میان وسایل یک سرباز کشته‌شده، عکسی از یک زن و کودک پیدا می‌شود. پشت عکس نوشته: "پیدایم کن."',
                trigger: () => this.gs.heroesGallery.length >= 5 && !this.discoveredMysteries.includes('missing_soldier'),
                onDiscover: () => {
                    this.gs.log('🔍 راز کشف شد: سرباز گمشده', 'system');
                    this.storyFlags.foundPhoto = true;
                }
            },
            {
                id: 'conspiracy',
                title: 'توطئه در قرارگاه',
                description: 'برخی افسران زمزمه می‌کنند که جنگ باخته است. باید کاری کرد. اما چه کسی جرات دارد؟',
                trigger: () => this.campaign.currentMission === 17 && !this.discoveredMysteries.includes('conspiracy'),
                onDiscover: () => {
                    this.gs.log('🔍 راز کشف شد: توطئه در قرارگاه', 'system');
                    this.storyFlags.conspiracyRevealed = true;
                }
            }
        ];

        for (const mystery of mysteries) {
            if (mystery.trigger()) {
                this.discoveredMysteries.push(mystery.id);
                if (mystery.onDiscover) mystery.onDiscover();
            }
        }
    }

    // ============ درگیری بین شخصیت‌ها ============
    checkCharacterConflicts() {
        const chars = Object.values(this.campaign.characters).filter(c => c.alive);
        
        // دعوا بین وبر و اشمیت
        const weber = chars.find(c => c.id === 'weber');
        const schmidt = chars.find(c => c.id === 'schmidt');
        if (weber && schmidt && !this.characterConflicts.includes('weber_schmidt')) {
            if (weber.loyalty > 50 && schmidt.loyalty > 50 && Math.random() < 0.05) {
                this.characterConflicts.push('weber_schmidt');
                this.gs.log('⚡ وبر و اشمیت درباره استراتژی بحث می‌کنند.', 'system');
                this.gs.log(`${weber.name}: "باید حمله کنیم!"`, 'system');
                this.gs.log(`${schmidt.name}: "این خودکشی است!"`, 'system');
                
                // بازیکن باید تصمیم بگیره
                eventBus.emit(GAME_EVENTS.DIALOGUE_TRIGGERED, {
                    type: 'conflict',
                    characters: ['weber', 'schmidt'],
                    options: [
                        { id: 'support_weber', text: 'حمایت از وبر - حمله', effect: { weber_loyalty: 10, schmidt_loyalty: -10 } },
                        { id: 'support_schmidt', text: 'حمایت از اشمیت - احتیاط', effect: { schmidt_loyalty: 10, weber_loyalty: -10 } },
                        { id: 'mediate', text: 'وساطت - هر دو رو آروم کن', effect: { both_loyalty: 5 } }
                    ]
                });
            }
        }

        // تنش بین فرانک و وبر
        const frank = chars.find(c => c.id === 'frank');
        if (weber && frank && !this.characterConflicts.includes('weber_frank')) {
            if (this.gs.heroesGallery.length > 10 && Math.random() < 0.04) {
                this.characterConflicts.push('weber_frank');
                this.gs.log('😠 وبر از دکتر فرانک انتقاد می‌کند که چرا نمی‌تواند مجروحان بیشتری نجات دهد.', 'system');
                eventBus.emit(GAME_EVENTS.DIALOGUE_TRIGGERED, {
                    type: 'conflict',
                    characters: ['weber', 'frank'],
                    options: [
                        { id: 'defend_frank', text: 'دفاع از دکتر فرانک', effect: { frank_loyalty: 15, weber_loyalty: -5 } },
                        { id: 'pressure_frank', text: 'فشار به فرانک برای کار بیشتر', effect: { frank_loyalty: -15, weber_loyalty: 10 } }
                    ]
                });
            }
        }
    }

    // ============ خیانت ============
    checkBetrayal() {
        if (this.betrayalTriggered) return;
        
        const weber = this.campaign.characters.weber;
        if (!weber || !weber.alive) return;
        
        // وبر ممکنه خیانت کنه اگه وفاداریش خیلی پایین بیاد
        if (weber.loyalty < 20 && this.campaign.currentMission >= 15) {
            this.betrayalTriggered = true;
            this.gs.log(`⚠️ ${weber.name} به دشمن پیوسته است!`, 'system');
            this.storyFlags.betrayal = true;
            
            // حذف وبر از ارتش ما
            const weberUnit = this.gs.getMyUnits().find(u => u.name.includes('وبر'));
            if (weberUnit) {
                weberUnit.faction = FACTION.SOVIET;
                this.gs.log(`${weberUnit.name} به نیروهای دشمن ملحق شد.`, 'combat');
            }
            
            eventBus.emit(GAME_EVENTS.DIALOGUE_TRIGGERED, {
                type: 'betrayal',
                character: 'weber',
                text: 'هاوپتمن وبر می‌گوید: "جنگ باخته شده. من نمی‌خواهم با شما بمیرم."'
            });
        }
    }

    // ============ تأثیر وفاداری ============
    updateLoyaltyEffects() {
        for (const char of Object.values(this.campaign.characters)) {
            if (!char.alive) continue;
            
            // وفاداری پایین = ممکنه فرار کنه
            if (char.loyalty < 15 && char.id !== 'keller' && Math.random() < 0.03) {
                char.alive = false;
                this.gs.log(`🏃 ${char.name} از خدمت فرار کرد.`, 'system');
                this.storyFlags[`${char.id}_deserted`] = true;
            }
            
            // وفاداری بالا = بونوس در مأموریت
            if (char.loyalty > 80) {
                const unit = this.gs.getMyUnits().find(u => u.name.includes(char.name));
                if (unit) {
                    unit.morale = Math.min(100, unit.morale + 2);
                }
            }
        }
    }

    // ============ واکنش به مرگ ============
    reactToDeath(characterId) {
        const char = this.campaign.characters[characterId];
        if (!char) return;
        
        const reactions = {
            keller: (viewer) => {
                if (viewer.id === 'weber') return 'وبر سرش را پایین می‌اندازد: "او فرمانده بهتری از من بود."';
                if (viewer.id === 'schmidt') return 'اشمیت اشک می‌ریزد: "استاد... بدون تو چه کنم؟"';
                if (viewer.id === 'heinrich') return 'هاینریش نمی‌فهمد. فقط خیره شده است.';
                return 'سکوتی سنگین همه را فرا می‌گیرد.';
            },
            heinrich: (viewer) => {
                if (viewer.id === 'mueller') return 'مولر گریه می‌کند. اولین بار در ۶ سال. "پسرک... تو فقط یه بچه بودی."';
                if (viewer.id === 'gertrud') return 'گرترود زانو می‌زند: "خداوندا... چرا بچه‌ها؟"';
                return 'همه ساکت‌اند. مرگ یک کودک حتی در جنگ هم تلخ است.';
            },
            gertrud: (viewer) => {
                if (viewer.id === 'frank') return 'دکتر فرانک: "او تنها کسی بود که می‌فهمید چرا من هنوز اینجام."';
                return 'تنها زن گروه رفته است. چیزی در اردوگاه شکسته.';
            }
        };
        
        const aliveChars = Object.values(this.campaign.characters).filter(c => c.alive && c.id !== characterId);
        for (const viewer of aliveChars.slice(0, 2)) {
            const reactionFn = reactions[characterId];
            if (reactionFn) {
                const msg = reactionFn(viewer);
                this.gs.log(`${viewer.name}: "${msg}"`, 'system');
            }
        }
    }

    // ============ رادیو ============
    processRadio() {
        if (this.gs.currentTurn % 5 !== 0) return; // هر ۵ نوبت
        
        const stations = [
            {
                name: 'رادیو برلین',
                message: this.storyFlags.betrayal ? 
                    'به شهروندان هشدار داده می‌شود: خائنانی در میان ما هستند.' :
                    'نیروهای آلمانی شجاعانه در حال دفاع از میهن هستند. پیروزی نزدیک است!',
                propaganda: true
            },
            {
                name: 'رادیو مسکو',
                message: 'برلین محاصره شده است. مقاومت بی‌فایده است. تسلیم شوید و زنده بمانید.',
                propaganda: false
            },
            {
                name: 'رادیو لندن',
                message: 'نیروهای متفقین در حال پیشروی هستند. جنگ در اروپا به زودی پایان می‌یابد.',
                propaganda: false
            },
            {
                name: 'رادیو واتیکان',
                message: 'پاپ برای صلح دعا می‌کند. خداوند همه فرزندانش را می‌بخشد.',
                propaganda: false
            },
            {
                name: 'فرکانس ناشناس',
                message: '...اگر می‌شنوید... مقاومت کنید... تنها نیستید... (صدای خش‌خش)',
                propaganda: false
            }
        ];
        
        const station = stations[Math.floor(Math.random() * stations.length)];
        this.gs.log(`📻 ${station.name}: "${station.message}"`, 'system');
        
        // تأثیر پروپاگاندا
        if (station.propaganda) {
            for (const char of Object.values(this.campaign.characters)) {
                if (char.alive) char.morale = Math.min(100, char.morale + 2);
            }
        }
    }

    // ============ دفتر خاطرات خودکار ============
    generateJournalEntry() {
        const mission = this.campaign.missions.find(m => m.id === this.campaign.currentMission);
        if (!mission) return;
        
        if (!this.campaign.campaignProgress.missionJournal) {
            this.campaign.campaignProgress.missionJournal = {};
        }
        
        const journal = this.campaign.campaignProgress.missionJournal;
        if (!journal[mission.id]) {
            journal[mission.id] = {
                entries: [],
                startedAt: this.gs.currentTurn
            };
        }
        
        // فقط هر ۳ نوبت یه entry اضافه کن
        if (this.gs.currentTurn % 3 === 0) {
            const myUnits = this.gs.getMyUnits();
            const enemies = this.gs.getEnemyUnits();
            
            const entry = {
                turn: this.gs.currentTurn,
                weather: this.gs.weatherState,
                dayPhase: this.gs.dayPhase,
                myUnits: myUnits.length,
                enemyUnits: enemies.length,
                casualties: this.gs.heroesGallery.length,
                note: this.generateJournalNote(myUnits, enemies)
            };
            
            journal[mission.id].entries.push(entry);
        }
    }

    generateJournalNote(myUnits, enemies) {
        const notes = [
            'نبرد ادامه دارد. سربازان خسته‌اند.',
            'امروز تعدادی از بهترین‌هایمان را از دست دادیم.',
            'آسمان خاکستری است. باران می‌بارد.',
            'یک لحظه سکوت. بعد دوباره صدای توپ.',
            'هاینریش امروز شجاع بود. زیادی شجاع.',
            'مولر گفت: "فقط یه نوبت دیگه."',
            `تلفات امروز: سنگین.`,
            'نامه‌ای از خانه نرسید. شاید فردا.'
        ];
        return notes[Math.floor(Math.random() * notes.length)];
    }

    // ============ فلش‌بک ============
    checkFlashbacks() {
        for (const fb of this.flashbacks) {
            if (!fb.displayed && this.campaign.currentMission === fb.triggerMission) {
                fb.displayed = true;
                this.gs.log(`💭 فلش‌بک - ${fb.title}:`, 'system');
                this.gs.log(fb.text, 'system');
                eventBus.emit(GAME_EVENTS.DIALOGUE_TRIGGERED, { type: 'flashback', data: fb });
            }
        }
    }

    // ============ دادگاه نظامی ============
    initiateCourtMartial(reason = 'disobey_orders') {
        this.pendingCourtMartial = {
            reason,
            turn: this.gs.currentTurn,
            defendant: 'keller', // فرمانده (بازیکن)
            charges: reason === 'disobey_orders' ? 
                'سرپیچی از دستور فرماندهی عالی' : 
                'فرار از خدمت و ترک پست',
            witnesses: Object.values(this.campaign.characters).filter(c => c.alive && c.id !== 'keller'),
            verdict: null
        };
        
        this.gs.log('⚖️ دادگاه نظامی تشکیل شده است.', 'system');
        this.gs.log(`اتهام: ${this.pendingCourtMartial.charges}`, 'system');
        
        // فراخوانی شهود
        for (const witness of this.pendingCourtMartial.witnesses.slice(0, 3)) {
            const testimonies = [
                `${witness.name}: "من شهادت می‌دهم که فرمانده همیشه به فکر سربازانش بود."`,
                `${witness.name}: "در آن شرایط، انتخاب دیگری نداشت."`,
                `${witness.name}: "اگر فرمانده نبود، همه ما مرده بودیم."`
            ];
            this.gs.log(testimonies[Math.floor(Math.random() * testimonies.length)], 'system');
        }
        
        // رأی دادگاه
        const loyalWitnesses = this.pendingCourtMartial.witnesses.filter(w => w.loyalty > 50);
        if (loyalWitnesses.length >= 2) {
            this.pendingCourtMartial.verdict = 'تبرئه';
            this.gs.log('📜 رأی دادگاه: تبرئه. شما بی‌گناه شناخته شدید.', 'system');
        } else {
            this.pendingCourtMartial.verdict = 'مجرم';
            this.gs.log('📜 رأی دادگاه: مجرم. اما با توجه به شرایط، تخفیف در نظر گرفته می‌شود.', 'system');
            // کاهش منابع به عنوان جریمه
            this.gs.resources.rp = Math.floor(this.gs.resources.rp * 0.7);
            this.gs.log('منابع شما ۳۰٪ کاهش یافت.', 'system');
        }
        
        this.storyFlags.courtMartialHeld = true;
        eventBus.emit(GAME_EVENTS.DIALOGUE_TRIGGERED, { 
            type: 'court_martial', 
            verdict: this.pendingCourtMartial.verdict 
        });
        
        return this.pendingCourtMartial;
    }

    // ============ نامه آخر به پسر ============
    writeFinalLetter(text) {
        this.finalLetterWritten = true;
        this.storyFlags.finalLetter = text;
        this.gs.log('✉️ نامه نهایی به کارل نوشته شد.', 'system');
        this.gs.log(`"${text.substring(0, 50)}..."`, 'system');
        return true;
    }

    getFinalLetter() {
        if (!this.finalLetterWritten) {
            return {
                title: 'نامه‌ای که هرگز نوشته نشد',
                text: 'اگر این نامه را می‌خوانی، یعنی من دیگر نیستم.\nپسرم، کارل،\nهرگز فراموش نکن که دوستت دارم.\nبابا'
            };
        }
        return {
            title: 'نامه به کارل',
            text: this.storyFlags.finalLetter
        };
    }

    // ============ دیالوگ‌های پویا ============
    getContextualDialogue(characterId) {
        const char = this.campaign.characters[characterId];
        if (!char || !char.alive) return null;
        
        const dialogues = [];
        
        // واکنش به آب‌وهوا
        if (this.gs.weatherState === 'schnee') {
            dialogues.push(`${char.name}: "این برف لعنتی... دستام یخ زده."`);
        } else if (this.gs.weatherState === 'regen') {
            dialogues.push(`${char.name}: "بارون همه جا رو گل کرده."`);
        }
        
        // واکنش به شکست‌ها
        if (this.campaign.campaignProgress.failedMissions.length > 0) {
            dialogues.push(`${char.name}: "هنوز از شکست قبلی درد می‌کشه."`);
        }
        
        // واکنش به مرگ شخصیت‌ها
        const deadChars = this.campaign.campaignProgress.characterDeaths;
        if (deadChars.length > 0) {
            const lastDead = deadChars[deadChars.length - 1];
            dialogues.push(`${char.name}: "هنوز باورم نمیشه ${lastDead.name} رفته..."`);
        }
        
        // واکنش شخصی
        const personalDialogues = {
            heinrich: ['"فردا بهتر میشه... مگه نه؟"', '"دلم برای مامانم تنگ شده."'],
            mueller: ['"فقط یه نوبت دیگه..."', '"من ۶ ساله اینجام. دیگه خسته شدم."'],
            frank: ['"باند تموم شده. باید از پاره‌ها استفاده کنم."', '"هر روز صورت جدیدی می‌بینم که دیگه فردا نیست."'],
            gertrud: ['"پسرم... کجایی؟"', '"بعضی وقتا فکر می‌کنم دیگه نمی‌تونم."'],
            keller: ['"ما مسئول این آدماییم. فراموش نکن."', '"جنگ که تموم بشه... می‌خوام برم ماهیگیری."'],
            weber: ['"فقط برد مهمه. هیچی دیگه."', '"ضعیفا می‌میرن. قویا زنده می‌مونن."'],
            schmidt: ['"من یه نقشه جدید دارم... شاید جواب بده."', '"بعضی وقتا بهترین کار هیچ کاری نکردنه."']
        };
        
        if (personalDialogues[characterId]) {
            dialogues.push(personalDialogues[characterId][Math.floor(Math.random() * personalDialogues[characterId].length)]);
        }
        
        return dialogues[Math.floor(Math.random() * dialogues.length)] || `${char.name}: "..."`;
    }

    // ============ صفحه خلاصه مأموریت ============
    getMissionSummary(missionId) {
        const stats = this.campaign.campaignProgress.missionStats[missionId];
        const journal = this.campaign.campaignProgress.missionJournal[missionId];
        const mission = this.campaign.missions.find(m => m.id === missionId);
        
        if (!stats || !mission) return null;
        
        return {
            missionName: mission.name,
            success: stats.success,
            kills: stats.kills,
            losses: stats.losses,
            civiliansSaved: stats.civiliansSaved || 0,
            turnsTaken: stats.turn,
            journalEntries: journal ? journal.entries.length : 0,
            charactersPresent: this.campaign.getAvailableCharacters(missionId).map(c => ({
                name: c.name,
                survived: c.alive
            })),
            newUnitsUnlocked: mission.rewards?.newUnit ? [mission.rewards.newUnit] : [],
            medalsEarned: mission.rewards?.medal ? [mission.rewards.medal] : [],
            moralDecision: this.campaign.campaignProgress.decisions[missionId] || null
        };
    }

    // ============ ذخیره خودکار ============
    autoSave() {
        const saveData = {
            narrativeState: {
                discoveredMysteries: this.discoveredMysteries,
                storyFlags: this.storyFlags,
                poemsDisplayed: this.poems.filter(p => p.displayed).map(p => p.id),
                flashbacksDisplayed: this.flashbacks.filter(f => f.displayed).map(f => f.id),
                characterConflicts: this.characterConflicts,
                betrayalTriggered: this.betrayalTriggered,
                finalLetterWritten: this.finalLetterWritten,
                pendingCourtMartial: this.pendingCourtMartial,
                dialogueHistory: this.dialogueHistory.slice(-20)
            }
        };
        
        return saveData;
    }

    loadAutoSave(data) {
        if (!data || !data.narrativeState) return;
        
        const ns = data.narrativeState;
        this.discoveredMysteries = ns.discoveredMysteries || [];
        this.storyFlags = ns.storyFlags || {};
        this.characterConflicts = ns.characterConflicts || [];
        this.betrayalTriggered = ns.betrayalTriggered || false;
        this.finalLetterWritten = ns.finalLetterWritten || false;
        this.pendingCourtMartial = ns.pendingCourtMartial || null;
        this.dialogueHistory = ns.dialogueHistory || [];
        
        // بازگردانی نمایش اشعار
        const displayedIds = ns.poemsDisplayed || [];
        for (const poem of this.poems) {
            if (displayedIds.includes(poem.id)) poem.displayed = true;
        }
        
        // بازگردانی فلش‌بک‌ها
        const fbIds = ns.flashbacksDisplayed || [];
        for (const fb of this.flashbacks) {
            if (fbIds.includes(fb.id)) fb.displayed = true;
        }
    }

    // ============ موسیقی و صدای فصل ============
    getChapterAudio(chapter) {
        const audioThemes = {
            'فصل ۱: هجوم': {
                mood: 'tense',
                tempo: 120,
                instruments: ['drums', 'brass'],
                description: 'ضربان طبل جنگ. حمله آغاز شده.'
            },
            'فصل ۲: عقب‌نشینی': {
                mood: 'melancholic',
                tempo: 80,
                instruments: ['strings', 'piano'],
                description: 'غم از دست دادن. عقب‌نشینی.'
            },
            'فصل ۳: دفاع از میهن': {
                mood: 'desperate',
                tempo: 140,
                instruments: ['organ', 'choir'],
                description: 'دفاع ناامیدانه. آخرین سنگر.'
            },
            'فصل ۴: سقوط': {
                mood: 'somber',
                tempo: 40,
                instruments: ['cello', 'silence'],
                description: 'پایان. سکوت.'
            }
        };
        
        return audioThemes[chapter] || audioThemes['فصل ۱: هجوم'];
    }

    // ============ اطلاعات داستانی ============
    getStoryProgress() {
        return {
            mysteriesFound: this.discoveredMysteries.length,
            totalMysteries: 3,
            poemsRevealed: this.poems.filter(p => p.displayed).length,
            totalPoems: this.poems.length,
            flashbacksSeen: this.flashbacks.filter(f => f.displayed).length,
            totalFlashbacks: this.flashbacks.length,
            betrayalTriggered: this.betrayalTriggered,
            courtMartialHeld: this.storyFlags.courtMartialHeld || false,
            finalLetterWritten: this.finalLetterWritten,
            activeConflicts: this.characterConflicts.length
        };
    }
}
