// sturmglanz/js/campaign.js
// کمپین نهایی - ۲۰ مأموریت، ۸ شخصیت، داستان شاخه‌ای، ۴ پایان، تمام جزئیات
'use strict';

class CampaignManager {
    constructor(gameState) {
        this.gs = gameState;
        this.currentMission = 0;
        this.missions = [];
        this.characters = {};
        this.campaignProgress = {
            completedMissions: [],
            failedMissions: [],
            totalKills: 0,
            totalLosses: 0,
            heroes: [],
            decisions: {},
            unlockedEndings: [],
            playerRank: 'ستوان',
            totalCivilianSaved: 0,
            sonLetters: [],
            conspiracyInvolved: false,
            courtMartialCount: 0,
            characterDeaths: [],
            missionStats: {},
            missionJournal: {},
            newGamePlus: false,
            visitedMissions: [],
            radioLogs: []
        };
        this.sonLetters = this.generateSonLetters();
        this.initializeCharacters();
        this.initializeMissions();
    }

    // ============ نامه‌های پسر فرمانده ============
    generateSonLetters() {
        return [
            {
                triggerMission: 1,
                letter: 'بابای عزیزم،\nمامان میگه تو رفتی جنگ. نمی‌دونم جنگ کجاست ولی امیدوارم زود تموم بشه.\nمن هر شب دعا می‌کنم برگردی.\nپسرت، کارل'
            },
            {
                triggerMission: 5,
                letter: 'بابا،\nسه هفته گذشته و تو هنوز برنگشتی. مامان هر شب گریه می‌کنه.\nمن نقاشی کشیدم از خونه‌مون. می‌خوام وقتی برگشتی بهت نشون بدم.\nکارل'
            },
            {
                triggerMission: 10,
                letter: 'بابا،\nزمستان اومد. برف اومد. مامان مریض شده.\nبابا... کی میای خونه؟\nکارل'
            },
            {
                triggerMission: 15,
                letter: 'بابا،\nمامان... مامان رفت پیش فرشته‌ها.\nحالا من تنهام. بابا، خواهش می‌کنم برگرد.\nمن می‌ترسم.\nکارل'
            },
            {
                triggerMission: 19,
                letter: 'بابا،\nمی‌گن جنگ داره تموم میشه. یعنی تو برمی‌گردی؟\nمن هر روز در خونه رو نگاه می‌کنم.\nمنتظرتم.\nپسرت، کارل'
            }
        ];
    }

    // ============ شخصیت‌ها ============
    initializeCharacters() {
        this.characters = {
            keller: {
                id: 'keller', name: 'اوبرست کلر', role: 'فرمانده کل',
                alive: true, loyalty: 90, trust: 80, morale: 75,
                relationship: 'mentor',
                bio: 'افسر کهنه‌کار ۵۲ ساله. پدری که پسرش را در استالینگراد از دست داد.',
                missions: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                deathQuote: 'پسرم... دارم میام پیشت...'
            },
            weber: {
                id: 'weber', name: 'هاوپتمن وبر', role: 'فرمانده میدانی',
                alive: true, loyalty: 70, trust: 60, morale: 80,
                relationship: 'rival',
                bio: 'افسر پرخاشگر ۳۵ ساله. فقط پیروزی می‌شناسد.',
                missions: [1,2,3,5,6,8,10,11,14,15,16,17,19],
                deathQuote: 'من... نمی‌خواستم... بمیرم...'
            },
            schmidt: {
                id: 'schmidt', name: 'لویتنانت اشمیت', role: 'استراتژیست',
                alive: true, loyalty: 85, trust: 90, morale: 40,
                relationship: 'friend',
                bio: 'نابغه نقشه‌کش ۲۸ ساله. همیشه راه فرار دارد.',
                missions: [1,2,3,4,5,7,9,11,12,13,15,16,18,20],
                deathQuote: 'راه فرار... پیداش کردم...'
            },
            mueller: {
                id: 'mueller', name: 'فلدويبل مولر', role: 'کهنه‌سرباز',
                alive: true, loyalty: 95, trust: 95, morale: 60,
                relationship: 'brother',
                bio: '۶ سال در جهنم. دیگر نمی‌خندد ولی هنوز می‌جنگد.',
                missions: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                deathQuote: 'بالاخره... استراحت...'
            },
            frank: {
                id: 'frank', name: 'دکتر فرانک', role: 'پزشک',
                alive: true, loyalty: 60, trust: 70, morale: 30,
                relationship: 'conscience',
                bio: 'پزشکی که از خون متنفر است. فقط می‌خواهد التیام دهد.',
                missions: [3,5,7,9,11,13,15,16,17,18,20],
                deathQuote: 'دیگر... زخمی‌ای نیست...'
            },
            gertrud: {
                id: 'gertrud', name: 'گرترود', role: 'پرستار',
                alive: true, loyalty: 80, trust: 85, morale: 55,
                relationship: 'caretaker',
                bio: 'بیوه جنگ. شوهرش را از دست داد، حالا مادر همه سربازان است.',
                missions: [5,7,9,11,13,15,16,18,20],
                deathQuote: 'پسرم... تو برلین...'
            },
            heinrich: {
                id: 'heinrich', name: 'هاینریش', role: 'سرباز کودک',
                alive: true, loyalty: 100, trust: 100, morale: 90,
                relationship: 'son_figure',
                bio: '۱۴ ساله. دروغ گفت ۱۸ سالش است. می‌خواهد پدرش را پیدا کند.',
                missions: [7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                deathQuote: 'بابا... پیدات کردم...'
            },
            blitz: {
                id: 'blitz', name: 'بلیتز', role: 'سگ وفادار',
                alive: true, loyalty: 100, trust: 100, morale: 100,
                relationship: 'pet',
                bio: 'ژرمن شپرد. پارس نمی‌کند. فقط پیدا می‌کند.',
                missions: [1,3,5,7,9,11,13,15,16,18,20],
                deathQuote: null
            }
        };
    }

    // ============ ۲۰ مأموریت کامل ============
    initializeMissions() {
        this.missions = [
            // فصل ۱
            { id: 1, name: 'روز اول', chapter: 'فصل ۱: هجوم', type: 'defense', turns: 15, difficulty: 1,
              objectives: ['حفظ خط مقدم', 'حداکثر ۳ تلفات'], rewards: { rp: 100, newUnit: UNIT_TYPE.PANZERGRENADIER },
              mapSeed: 'normandy_1', branchA: 2, branchB: null,
              preDialogue: [
                { speaker: 'keller', text: 'فرمانده... متفقین از غرب هجوم آوردند.' },
                { speaker: 'weber', text: 'بگذارید بیایند!' },
                { speaker: 'schmidt', text: 'آرام باش وبر. باید عقب‌نشینی کنیم...' }
              ],
              postDialogueWin: [{ speaker: 'keller', text: 'روز اول را زنده ماندیم.' }],
              postDialogueLose: [{ speaker: 'weber', text: 'شکست در روز اول؟!' }],
              events: [{ turn: 5, type: 'reinforcement', message: 'نیروی کمکی می‌رسد.' }] },

            { id: 2, name: 'عقب‌نشینی', chapter: 'فصل ۱: هجوم', type: 'retreat', turns: 12, difficulty: 2,
              objectives: ['رسیدن به نقطه امن', 'نجات ۵ یگان'], rewards: { rp: 80 },
              mapSeed: 'retreat_1', branchA: 3, branchB: null,
              preDialogue: [
                { speaker: 'keller', text: 'به شرق عقب می‌نشینیم.' },
                { speaker: 'weber', text: 'عقب‌نشینی ننگ است!' },
                { speaker: 'schmidt', text: 'زنده ماندن ننگ نیست وبر.' }
              ],
              events: [{ turn: 3, type: 'civilian_encounter', message: 'خانواده‌ای درخواست کمک دارند.' }] },

            { id: 3, name: 'پل سرنوشت', chapter: 'فصل ۱: هجوم', type: 'defense', turns: 10, difficulty: 2,
              objectives: ['حفظ یا تخریب پل', 'جلوگیری از عبور دشمن'], rewards: { rp: 120, newUnit: UNIT_TYPE.ENGINEER },
              mapSeed: 'bridge_battle', branchA: 4, branchB: null,
              preDialogue: [
                { speaker: 'frank', text: 'اگر پل را بزنیم، غیرنظامیان آن طرف می‌مانند...' },
                { speaker: 'weber', text: 'جنگ انتخابات سخت دارد دکتر.' }
              ],
              moralChoice: {
                title: 'پل را حفظ کنم یا تخریب؟',
                options: [
                  { id: 'save_bridge', text: 'حفظ پل', effect: { civiliansSaved: 15, moraleChange: 10 } },
                  { id: 'destroy_bridge', text: 'تخریب پل', effect: { enemyDelayed: 3, moraleChange: -10 } }
                ]},
              events: [{ turn: 7, type: 'bridge_under_attack', message: 'دشمن به پل حمله کرد!' }] },

            { id: 4, name: 'شب در نرماندی', chapter: 'فصل ۱: هجوم', type: 'night_defense', turns: 8, difficulty: 3,
              objectives: ['زنده ماندن تا سحر', 'کمین به ۳ گشت'], rewards: { rp: 100 },
              mapSeed: 'night', branchA: 5, branchB: null,
              preDialogue: [{ speaker: 'schmidt', text: 'تاریکی بهترین دوست ماست.' }],
              events: [{ turn: 4, type: 'flare', message: 'منور! پناه بگیرید!' }] },

            { id: 5, name: 'ضدحمله', chapter: 'فصل ۱: هجوم', type: 'counter_attack', turns: 12, difficulty: 2,
              objectives: ['بازپس‌گیری ۳ نقطه', 'نابودی ۵ یگان'], rewards: { rp: 150, newUnit: UNIT_TYPE.PANZER_IV },
              mapSeed: 'counter', branchA: 6, branchB: 8,
              preDialogue: [
                { speaker: 'weber', text: 'وقت حمله است!' },
                { speaker: 'gertrud', text: 'مراقب باشید.' }
              ],
              sonLetterIndex: 1 },

            { id: 6, name: 'دیوار آتلانتیک', chapter: 'فصل ۱: هجوم', type: 'last_stand', turns: 20, difficulty: 4,
              objectives: ['حفظ موضع', 'حداقل ۲ یگان زنده'], rewards: { rp: 200, medal: 'iron_cross_1st' },
              mapSeed: 'atlantic', branchA: 7, branchB: null,
              preDialogue: [
                { speaker: 'keller', text: 'اینجا می‌مانیم. تا آخر.' },
                { speaker: 'mueller', text: 'من همیشه می‌خواستم کنار دریا بمیرم...' }
              ],
              events: [
                { turn: 10, type: 'air_strike', message: 'بمب‌افکن‌های دشمن!' },
                { turn: 18, type: 'last_reinforcement', message: 'آخرین نیروی کمکی!' }
              ]},

            // فصل ۲
            { id: 7, name: 'جاده پاریس', chapter: 'فصل ۲: عقب‌نشینی', type: 'escort', turns: 15, difficulty: 2,
              objectives: ['محافظت از کاروان', 'رسیدن به نقطه امن'], rewards: { rp: 80 },
              mapSeed: 'paris', branchA: 8, branchB: null,
              preDialogue: [
                { speaker: 'heinrich', text: 'کمکشون می‌کنیم فرمانده؟' },
                { speaker: 'frank', text: 'البته هاینریش.' }
              ]},

            { id: 8, name: 'کمین در آردن', chapter: 'فصل ۲: عقب‌نشینی', type: 'ambush', turns: 10, difficulty: 3,
              objectives: ['نابودی ۸ یگان', 'حفظ استتار'], rewards: { rp: 130, newUnit: UNIT_TYPE.JAGDPANTHER },
              mapSeed: 'ardennes', branchA: 9, branchB: null },

            { id: 9, name: 'راین', chapter: 'فصل ۲: عقب‌نشینی', type: 'defense', turns: 15, difficulty: 3,
              objectives: ['حفظ پل‌ها', 'عقب راندن دشمن'], rewards: { rp: 150 },
              mapSeed: 'rhine', branchA: 10, branchB: null,
              preDialogue: [{ speaker: 'gertrud', text: 'راین... چقدر قشنگه.' }] },

            { id: 10, name: 'زمستان', chapter: 'فصل ۲: عقب‌نشینی', type: 'winter_survival', turns: 12, difficulty: 4,
              objectives: ['زنده ماندن', 'حفظ تدارکات'], rewards: { rp: 100, medal: 'eastern_front' },
              mapSeed: 'winter', branchA: 11, branchB: null,
              preDialogue: [
                { speaker: 'mueller', text: 'سرما بدتر از گلوله است.' },
                { speaker: 'heinrich', text: 'دستام یخ زده...' }
              ],
              sonLetterIndex: 2 },

            // فصل ۳
            { id: 11, name: 'مرز آلمان', chapter: 'فصل ۳: دفاع از میهن', type: 'desperate_defense', turns: 20, difficulty: 5,
              objectives: ['دفاع از شهر', 'حداقل ۳ یگان'], rewards: { rp: 100, newUnit: UNIT_TYPE.TIGER },
              mapSeed: 'border', branchA: 12, branchB: null,
              preDialogue: [{ speaker: 'keller', text: 'حالا تو خاک خودمونیم.' }] },

            { id: 12, name: 'فولکس‌اشتورم', chapter: 'فصل ۳', type: 'training', turns: 8, difficulty: 2,
              objectives: ['آموزش ۵ یگان', 'دفاع از اردوگاه'], rewards: { rp: 50, newUnit: UNIT_TYPE.VOLKSSTURM },
              mapSeed: 'volks', branchA: 13, branchB: null },

            { id: 13, name: 'بمباران', chapter: 'فصل ۳', type: 'rescue', turns: 10, difficulty: 3,
              objectives: ['نجات ۲۰ غیرنظامی', 'خاموش کردن آتش'], rewards: { rp: 80 },
              mapSeed: 'bombing', branchA: 14, branchB: null,
              preDialogue: [
                { speaker: 'frank', text: 'مجروحان همه جا هستند!' },
                { speaker: 'gertrud', text: 'با هم انجامش می‌دیم دکتر.' }
              ]},

            { id: 14, name: 'کاروان تانک', chapter: 'فصل ۳', type: 'escort', turns: 12, difficulty: 4,
              objectives: ['رساندن ۳ تانک', 'محافظت از کارخانه'], rewards: { rp: 200, newUnit: UNIT_TYPE.KING_TIGER },
              mapSeed: 'convoy', branchA: 15, branchB: null },

            { id: 15, name: 'محاصره', chapter: 'فصل ۳', type: 'breakout', turns: 15, difficulty: 5,
              objectives: ['شکستن محاصره', 'نجات ۶ یگان'], rewards: { rp: 150, medal: 'knights_cross' },
              mapSeed: 'encircle', branchA: 16, branchB: null,
              preDialogue: [{ speaker: 'schmidt', text: 'من یه راه دارم... خطرناکه.' }],
              sonLetterIndex: 3 },

            // فصل ۴
            { id: 16, name: 'برلین می‌سوزد', chapter: 'فصل ۴: سقوط', type: 'urban_warfare', turns: 25, difficulty: 6,
              objectives: ['دفاع از مرکز', 'حداقل ۵ یگان'], rewards: { rp: 200, newUnit: UNIT_TYPE.STURMTIGER },
              mapSeed: 'berlin', branchA: 17, branchB: null,
              preDialogue: [
                { speaker: 'keller', text: 'برلین... داره می‌سوزه.' },
                { speaker: 'heinrich', text: 'من می‌ترسم فرمانده.' }
              ]},

            { id: 17, name: 'پناهگاه', chapter: 'فصل ۴', type: 'moral_choice', turns: 10, difficulty: 5,
              objectives: ['تصمیم نهایی', 'محافظت از غیرنظامیان'], rewards: { rp: 100 },
              mapSeed: 'bunker', branchA: 18, branchB: null,
              preDialogue: [
                { speaker: 'weber', text: 'پیشوا می‌گه تا آخر بجنگیم.' },
                { speaker: 'keller', text: 'تا آخرین کودک؟!' }
              ],
              moralChoice: {
                title: 'از پیشوا اطاعت کنم؟',
                options: [
                  { id: 'obey', text: 'اطاعت', effect: { civilianLosses: 100, loyaltyChange: 20 } },
                  { id: 'disobey', text: 'سرپیچی برای نجات مردم', effect: { civilianSaved: 80, courtMartial: true } }
                ]}},

            { id: 18, name: 'پل وایدنبورگ', chapter: 'فصل ۴', type: 'defense', turns: 20, difficulty: 6,
              objectives: ['حفظ پل', 'نجات غیرنظامیان'], rewards: { rp: 100 },
              mapSeed: 'bridge', branchA: 19, branchB: null,
              preDialogue: [
                { speaker: 'gertrud', text: 'همه می‌خوان فرار کنن.' },
                { speaker: 'frank', text: 'بذار برن.' }
              ]},

            { id: 19, name: 'آخرین گلوله', chapter: 'فصل ۴', type: 'last_stand', turns: 5, difficulty: 7,
              objectives: ['تصمیم نهایی', 'حفظ شرافت'], rewards: { rp: 0 },
              mapSeed: 'last', branchA: 20, branchB: null,
              preDialogue: [{ speaker: 'mueller', text: 'فقط یه گلوله مونده.' }],
              moralChoice: {
                title: 'آخرین گلوله برای چه کسی؟',
                options: [
                  { id: 'enemy', text: 'شلیک به دشمن', effect: { finalKill: 1 } },
                  { id: 'save', text: 'نگه داشتن', effect: { ending: 'hope' } },
                  { id: 'self', text: '...', effect: { ending: 'tragic' } }
                ]},
              sonLetterIndex: 4 },

            { id: 20, name: '۸ می ۱۹۴۵', chapter: 'فصل ۴: پایان', type: 'surrender', turns: 1, difficulty: 1,
              objectives: ['تسلیم با شرافت', 'زنده ماندن'], rewards: { ending: true },
              mapSeed: 'peace', branchA: null, branchB: null,
              preDialogue: [
                { speaker: 'keller', text: 'تموم شد.' },
                { speaker: 'heinrich', text: 'می‌تونم برم خونه؟' }
              ],
              finalScene: true }
        ];
    }

    // ============ مدیریت مأموریت ============
    startMission(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission) return false;

        this.currentMission = missionId;
        this.campaignProgress.visitedMissions.push(missionId);
        this.gs.initialize();

        if (this.gs.mapManager) {
            this.gs.tiles = this.gs.mapManager.generate(mission.type);
        }

        this.setupMissionUnits(mission);
        this.showDialogues(mission.preDialogue || []);
        this.checkSonLetter(mission);
        this.playRadioIfAvailable(missionId);

        this.gs.log(`--- ${mission.chapter}: ${mission.name} ---`, 'system');
        this.gs.log(mission.objectives.join(' | '), 'system');
        this.scheduleMissionEvents(mission);

        // دفتر خاطرات
        this.campaignProgress.missionJournal[missionId] = {
            started: this.gs.currentTurn,
            name: mission.name,
            charactersPresent: this.getAvailableCharacters(missionId).map(c => c.name)
        };

        eventBus.emit(GAME_EVENTS.GAME_INITIALIZED, { mission });
        return true;
    }

    setupMissionUnits(mission) {
        switch (mission.type) {
            case 'defense':
            case 'last_stand':
                const hq = this.gs.getMyUnits().find(u => u.type === UNIT_TYPE.HQ);
                if (hq) {
                    for (let i = 0; i < 5; i++) {
                        const pos = new Position(hq.position.x + Math.floor(Math.random()*5)-2, hq.position.y + Math.floor(Math.random()*5)-2);
                        if (pos.isValid()) this.gs.addUnit(UNIT_TYPE.INFANTRY, FACTION.WEHRMACHT, pos.x, pos.y);
                    }
                }
                break;
            case 'night_defense': this.gs.dayPhase = 'night'; break;
            case 'winter_survival':
                this.gs.weatherState = 'schnee';
                if (this.gs.mapManager) this.gs.mapManager.freezeRivers();
                break;
        }
    }

    checkSonLetter(mission) {
        if (mission.sonLetterIndex !== undefined && this.sonLetters[mission.sonLetterIndex]) {
            const letter = this.sonLetters[mission.sonLetterIndex];
            this.campaignProgress.sonLetters.push(letter);
            this.gs.log(`📨 نامه از کارل: "${letter.letter.substring(0, 30)}..."`, 'system');
        }
    }

    playRadioIfAvailable(missionId) {
        const radioMessages = {
            1: 'رادیو برلین: "دشمن از غرب حمله کرده. همه به جبهه!"',
            5: 'رادیو برلین: "ضدحمله موفقیت‌آمیز بود. روحیه بالا!"',
            10: 'رادیو: "زمستان سخت در راه است..."',
            15: 'رادیو مسکو: "برلین سقوط خواهد کرد." (سیگنال ضعیف)',
            20: 'رادیو: "...جنگ... تمام شد..." (سکوت)'
        };
        if (radioMessages[missionId]) {
            this.campaignProgress.radioLogs.push({ mission: missionId, message: radioMessages[missionId] });
            this.gs.log(`📻 ${radioMessages[missionId]}`, 'system');
        }
    }

    scheduleMissionEvents(mission) {
        if (!mission.events) return;
        for (const event of mission.events) {
            eventBus.once(GAME_EVENTS.NEW_TURN, (data) => {
                if (data.turn === event.turn) {
                    this.gs.log(`[رویداد] ${event.message}`, 'system');
                    this.handleEvent(event);
                }
            });
        }
    }

    handleEvent(event) {
        switch (event.type) {
            case 'reinforcement':
                this.gs.resources.rp += 50;
                this.gs.addUnit(UNIT_TYPE.INFANTRY, FACTION.WEHRMACHT, 10, 10);
                break;
            case 'civilian_encounter':
                this.gs.civiliansOnMap.push({ x: 5, y: 5, alive: true });
                break;
            case 'air_strike':
                if (this.gs.combatSystem) this.gs.combatSystem.callAirstrike(new Position(15, 15));
                break;
        }
    }

    // ============ پایان مأموریت ============
    completeMission(success = true) {
        const mission = this.missions.find(m => m.id === this.currentMission);
        if (!mission) return;

        this.campaignProgress.missionStats[mission.id] = {
            success,
            kills: this.gs.units.filter(u => u.health <= 0 && u.faction === FACTION.SOVIET).length,
            losses: this.gs.heroesGallery.length,
            civiliansSaved: this.gs.mapManager ? this.gs.mapManager.getCivilianCount() : 0,
            turn: this.gs.currentTurn
        };

        if (success) {
            this.campaignProgress.completedMissions.push(mission.id);
            if (mission.rewards.rp) this.gs.resources.rp += mission.rewards.rp;
            if (mission.rewards.newUnit) {
                if (!this.campaignProgress.unlockedUnits) this.campaignProgress.unlockedUnits = [];
                if (!this.campaignProgress.unlockedUnits.includes(mission.rewards.newUnit)) {
                    this.campaignProgress.unlockedUnits.push(mission.rewards.newUnit);
                }
            }
            if (mission.rewards.medal) {
                if (!this.campaignProgress.medals) this.campaignProgress.medals = [];
                this.campaignProgress.medals.push(mission.rewards.medal);
            }
            this.showDialogues(mission.postDialogueWin || []);
        } else {
            this.campaignProgress.failedMissions.push(mission.id);
            this.showDialogues(mission.postDialogueLose || []);
        }

        if (mission.moralChoice) this.resolveMoralChoice(mission.moralChoice);
        this.checkCharacterDeaths(mission);
        this.updateCharacterRelationships(success);
        this.updateRank();
        this.saveHeroes();

        this.campaignProgress.totalKills += this.campaignProgress.missionStats[mission.id].kills;
        this.campaignProgress.totalLosses += this.campaignProgress.missionStats[mission.id].losses;
        this.campaignProgress.totalCivilianSaved += this.campaignProgress.missionStats[mission.id].civiliansSaved;

        if (mission.finalScene) this.triggerFinalScene();
        if (mission.rewards.ending) this.triggerEnding();

        eventBus.emit(GAME_EVENTS.PHASE_CHANGED, { type: 'mission_complete', success, missionId: mission.id });
    }

    resolveMoralChoice(choice) {
        this.gs.log(`[تصمیم اخلاقی] ${choice.title}`, 'system');
        this.campaignProgress.decisions[this.currentMission] = choice.options[0].id;
        if (choice.options[0].effect.courtMartial) {
            this.campaignProgress.courtMartialCount++;
            this.gs.log('⚠️ شما به دادگاه نظامی احضار شده‌اید.', 'system');
        }
    }

    checkCharacterDeaths(mission) {
        for (const char of Object.values(this.characters)) {
            if (!char.alive || !char.missions.includes(this.currentMission)) continue;
            const deathChance = mission.difficulty >= 6 ? 0.15 : mission.difficulty >= 4 ? 0.05 : 0.01;
            if (Math.random() < deathChance) {
                char.alive = false;
                this.campaignProgress.characterDeaths.push({
                    id: char.id, name: char.name,
                    mission: this.currentMission,
                    quote: char.deathQuote || '...'
                });
                this.gs.log(`💔 ${char.name} کشته شد. آخرین کلمات: "${char.deathQuote}"`, 'system');
                eventBus.emit(GAME_EVENTS.CHARACTER_DIED, { character: char });
            }
        }
    }

    updateCharacterRelationships(success) {
        for (const char of Object.values(this.characters)) {
            if (!char.alive) continue;
            if (success) {
                char.loyalty = Math.min(100, char.loyalty + 3);
                char.trust = Math.min(100, char.trust + 2);
                char.morale = Math.min(100, char.morale + 5);
            } else {
                char.loyalty = Math.max(0, char.loyalty - 5);
                char.trust = Math.max(0, char.trust - 3);
                char.morale = Math.max(0, char.morale - 10);
            }
        }
    }

    updateRank() {
        const c = this.campaignProgress.completedMissions.length;
        if (c >= 18) this.campaignProgress.playerRank = 'ژنرال';
        else if (c >= 12) this.campaignProgress.playerRank = 'سرهنگ';
        else if (c >= 7) this.campaignProgress.playerRank = 'سروان';
        else if (c >= 3) this.campaignProgress.playerRank = 'ستوان';
        else this.campaignProgress.playerRank = 'سرباز';
    }

    saveHeroes() {
        for (const unit of this.gs.getMyUnits()) {
            if (unit.health > 0 && unit.level >= 3) {
                if (!this.campaignProgress.heroes.find(h => h.id === unit.id)) {
                    this.campaignProgress.heroes.push({
                        id: unit.id, name: unit.name, type: unit.type,
                        kills: unit.kills, level: unit.level,
                        savedInMission: this.currentMission
                    });
                }
            }
        }
    }

    showDialogues(dialogues) {
        for (const d of dialogues) {
            const char = this.characters[d.speaker];
            if (char && char.alive) {
                this.gs.log(`${char.name}: "${d.text}"`, 'system');
            }
        }
    }

    getAvailableCharacters(missionId) {
        return Object.values(this.characters).filter(c => c.alive && c.missions.includes(missionId));
    }

    // ============ پایان‌ها ============
    triggerEnding() {
        const c = this.campaignProgress.completedMissions.length;
        const l = this.campaignProgress.totalLosses;
        const civ = this.campaignProgress.totalCivilianSaved;
        const cd = this.campaignProgress.characterDeaths.length;
        const alive = Object.values(this.characters).filter(ch => ch.alive).length;

        if (c >= 18 && l < 30 && civ > 80 && cd <= 2 && alive >= 6) {
            this.campaignProgress.unlockedEndings.push('hero');
            this.gs.log('🏆 پایان قهرمان: شما افسانه شدید. سربازانتان زنده ماندند. کارل پدرش را دید.', 'system');
        } else if (c >= 12 && l < 60 && alive >= 3) {
            this.campaignProgress.unlockedEndings.push('commander');
            this.gs.log('🎖️ پایان فرمانده: به وظیفه‌تان عمل کردید. بعضی زنده ماندند.', 'system');
        } else if (c >= 8) {
            this.campaignProgress.unlockedEndings.push('sacrifice');
            this.gs.log('💀 پایان فداکاری: بهای سنگینی پرداختید. اما شرافت حفظ شد.', 'system');
        } else {
            this.campaignProgress.unlockedEndings.push('defeat');
            this.gs.log('⚰️ پایان شکست: جنگ باخته شد. همه چیز از دست رفت.', 'system');
        }

        if (civ > 120 && cd === 0 && alive === 8) {
            this.campaignProgress.unlockedEndings.push('secret');
            this.gs.log('🌟 پایان مخفی: انسانیت در میان جهنم زنده ماند. همه شخصیت‌ها نجات یافتند.', 'system');
        }
    }

    triggerFinalScene() {
        const alive = Object.values(this.characters).filter(c => c.alive);
        const dead = Object.values(this.characters).filter(c => !c.alive);
        
        this.gs.log('=== ۸ می ۱۹۴۵ - صحنه پایانی ===', 'system');
        this.gs.log(`بازماندگان (${alive.length} نفر): ${alive.map(c => c.name).join('، ') || 'هیچکس'}`, 'system');
        if (dead.length > 0) {
            this.gs.log(`از دست رفتگان: ${dead.map(c => c.name).join('، ')}`, 'system');
        }
        this.gs.log(`غیرنظامیان نجات‌یافته: ${this.campaignProgress.totalCivilianSaved}`, 'system');
        this.gs.log(`تلفات کل: ${this.campaignProgress.totalLosses}`, 'system');
        this.gs.log(`رتبه نهایی: ${this.campaignProgress.playerRank}`, 'system');
        
        if (alive.length >= 5) {
            this.gs.log('همه به هم نگاه می‌کنند. کسی چیزی نمی‌گوید.', 'system');
            this.gs.log('هاینریش لبخند می‌زند. اولین بار بعد از ماه‌ها.', 'system');
        }
        
        this.gs.log('جنگ تمام شد.', 'system');
        this.gs.log('فردا... روز دیگری است.', 'system');
    }

    // ============ اطلاعات ============
    getMissionStatus(missionId) {
        if (this.campaignProgress.completedMissions.includes(missionId)) return 'completed';
        if (this.campaignProgress.failedMissions.includes(missionId)) return 'failed';
        if (missionId === this.currentMission) return 'active';
        const lastDone = Math.max(0, ...this.campaignProgress.completedMissions, ...this.campaignProgress.failedMissions);
        if (missionId <= lastDone + 1) return 'available';
        return 'locked';
    }

    getAvailableMissions() {
        return this.missions.filter(m => this.getMissionStatus(m.id) !== 'locked');
    }

    getNextMissionId() {
        const mission = this.missions.find(m => m.id === this.currentMission);
        if (!mission) return null;
        const success = this.campaignProgress.completedMissions.includes(this.currentMission);
        return success ? (mission.branchA || null) : (mission.branchB || mission.branchA || null);
    }

    getCampaignSummary() {
        return {
            ...this.campaignProgress,
            totalMissions: this.missions.length,
            completionRate: Math.floor(this.campaignProgress.completedMissions.length / this.missions.length * 100),
            aliveCharacters: Object.values(this.characters).filter(c => c.alive).map(c => c.name),
            deadCharacters: Object.values(this.characters).filter(c => !c.alive).map(c => c.name),
            sonLettersCount: this.campaignProgress.sonLetters.length,
            radioLogsCount: this.campaignProgress.radioLogs.length
        };
    }

    // ============ New Game Plus ============
    enableNewGamePlus() {
        this.campaignProgress.newGamePlus = true;
        this.gs.resources.rp += 200;
        this.gs.log('🌟 New Game Plus فعال شد! منابع اضافی دریافت کردید.', 'system');
    }

    // ============ اپیلوگ ============
    getEpilogue() {
        const alive = Object.values(this.characters).filter(c => c.alive);
        const epilogues = [];
        
        for (const char of alive) {
            switch (char.id) {
                case 'keller': epilogues.push(`${char.name} به مونیخ بازگشت. دیگر هرگز نجنگید.`); break;
                case 'weber': epilogues.push(`${char.name} در نورنبرگ محاکمه شد. تبرئه شد.`); break;
                case 'schmidt': epilogues.push(`${char.name} استاد استراتژی در دانشگاه برلین شد.`); break;
                case 'mueller': epilogues.push(`${char.name} به دهکده‌اش بازگشت. نانوا شد.`); break;
                case 'frank': epilogues.push(`${char.name} بیمارستانی برای قربانیان جنگ ساخت.`); break;
                case 'gertrud': epilogues.push(`${char.name} پسرش را در برلین پیدا کرد. زنده بود.`); break;
                case 'heinrich': epilogues.push(`${char.name} پدرش را پیدا کرد. در اردوگاه اسرا. زنده بود.`); break;
                case 'blitz': epilogues.push(`${char.name} با هاینریش به خانه رفت. پارس کردن را یاد گرفت.`); break;
            }
        }
        
        return epilogues;
    }
}
