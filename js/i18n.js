// sturmglanz/js/i18n.js
// سیستم ترجمه فارسی/آلمانی/روسی
'use strict';

const I18N = {
    currentLanguage: 'fa',
    
    translations: {
        // ============ منوها ============
        'menu.new_game': { fa: 'نبرد جدید', de: 'Neues Spiel', ru: 'Новая игра' },
        'menu.load_game': { fa: 'ادامه نبرد', de: 'Spiel laden', ru: 'Загрузить' },
        'menu.settings': { fa: 'تنظیمات', de: 'Einstellungen', ru: 'Настройки' },
        'menu.credits': { fa: 'دست‌اندرکاران', de: 'Mitwirkende', ru: 'Создатели' },
        'menu.exit': { fa: 'ترک خدمت', de: 'Dienst verlassen', ru: 'Покинуть службу' },
        'menu.save': { fa: 'ذخیره', de: 'Speichern', ru: 'Сохранить' },
        'menu.multiplayer': { fa: 'نبرد با دوستان', de: 'Mehrspieler', ru: 'Сетевая игра' },
        
        // ============ نوبت ============
        'turn.end': { fa: 'پایان نوبت', de: 'Zug beenden', ru: 'Конец хода' },
        'turn.number': { fa: 'نوبت {n}', de: 'Zug {n}', ru: 'Ход {n}' },
        'turn.phase.planning': { fa: 'مرحله طرح‌ریزی', de: 'Planungsphase', ru: 'Фаза планирования' },
        'turn.phase.execution': { fa: 'مرحله اجرا', de: 'Ausführungsphase', ru: 'Фаза исполнения' },
        'turn.phase.enemy': { fa: 'نوبت دشمن', de: 'Feindzug', ru: 'Ход врага' },
        'turn.phase.resolution': { fa: 'مرحله جمع‌بندی', de: 'Auflösungsphase', ru: 'Фаза завершения' },
        
        // ============ واحدها ============
        'unit.infantry': { fa: 'پیاده‌نظام', de: 'Infanterie', ru: 'Пехота' },
        'unit.panzergrenadier': { fa: 'پانتسرگرنادیر', de: 'Panzergrenadier', ru: 'Панцергренадер' },
        'unit.panzer_iv': { fa: 'پانتسر ۴', de: 'Panzer IV', ru: 'Панцер IV' },
        'unit.tiger': { fa: 'تایگر', de: 'Tiger', ru: 'Тигр' },
        'unit.king_tiger': { fa: 'کینگ تایگر', de: 'Königstiger', ru: 'Королевский Тигр' },
        'unit.artillery': { fa: 'توپخانه', de: 'Artillerie', ru: 'Артиллерия' },
        'unit.flak_88': { fa: 'فلاک ۸۸', de: 'Flak 88', ru: 'Зенитка 88' },
        'unit.recon': { fa: 'شناسایی', de: 'Aufklärung', ru: 'Разведка' },
        'unit.engineer': { fa: 'مهندس رزمی', de: 'Pionier', ru: 'Сапёр' },
        'unit.hq': { fa: 'قرارگاه', de: 'Hauptquartier', ru: 'Штаб' },
        'unit.supply': { fa: 'تدارکات', de: 'Nachschub', ru: 'Снабжение' },
        'unit.sniper': { fa: 'تک‌تیرانداز', de: 'Scharfschütze', ru: 'Снайпер' },
        'unit.mortar': { fa: 'خمپاره‌انداز', de: 'Mörser', ru: 'Миномёт' },
        'unit.nebelwerfer': { fa: 'نبل‌ورفر', de: 'Nebelwerfer', ru: 'Небельверфер' },
        'unit.panzerfaust': { fa: 'پانتسرفاوست', de: 'Panzerfaust', ru: 'Панцерфауст' },
        'unit.stug': { fa: 'اشتوگ ۳', de: 'StuG III', ru: 'Штуг III' },
        'unit.jagdpanther': { fa: 'یاگدپانتر', de: 'Jagdpanther', ru: 'Ягдпантера' },
        'unit.wirbelwind': { fa: 'ویربلویند', de: 'Wirbelwind', ru: 'Вирбельвинд' },
        'unit.kubelwagen': { fa: 'کوبل‌واگن', de: 'Kübelwagen', ru: 'Кюбельваген' },
        'unit.sdkfz_251': { fa: 'زره‌پوش ۲۵۱', de: 'SdKfz 251', ru: 'Бронетранспортёр' },
        'unit.volkssturm': { fa: 'فولکس‌اشتورم', de: 'Volkssturm', ru: 'Фольксштурм' },
        'unit.hitlerjugend': { fa: 'جوانان هیتلری', de: 'Hitlerjugend', ru: 'Гитлерюгенд' },
        'unit.brandenburger': { fa: 'براندنبورگر', de: 'Brandenburger', ru: 'Бранденбуржцы' },
        'unit.feldgendarmerie': { fa: 'پلیس نظامی', de: 'Feldgendarmerie', ru: 'Полевая жандармерия' },
        'unit.sturmtiger': { fa: 'اشتورم‌تایگر', de: 'Sturmtiger', ru: 'Штурмтигр' },
        
        // ============ دستورات ============
        'order.move': { fa: 'حرکت', de: 'Bewegen', ru: 'Движение' },
        'order.attack': { fa: 'حمله', de: 'Angreifen', ru: 'Атака' },
        'order.defend': { fa: 'دفاع', de: 'Verteidigen', ru: 'Защита' },
        'order.fortify': { fa: 'سنگربندی', de: 'Verschanzen', ru: 'Укрепление' },
        'order.overwatch': { fa: 'دیدبانی', de: 'Überwachen', ru: 'Наблюдение' },
        'order.ambush': { fa: 'کمین', de: 'Hinterhalt', ru: 'Засада' },
        'order.retreat': { fa: 'عقب‌نشینی', de: 'Rückzug', ru: 'Отступление' },
        'order.blitz': { fa: 'بلیتسکریگ', de: 'Blitzkrieg', ru: 'Блицкриг' },
        'order.repair': { fa: 'تعمیر', de: 'Reparieren', ru: 'Ремонт' },
        'order.resupply': { fa: 'بازتأمین', de: 'Nachschub', ru: 'Пополнение' },
        
        // ============ زمین ============
        'terrain.plains': { fa: 'دشت', de: 'Ebene', ru: 'Равнина' },
        'terrain.forest': { fa: 'جنگل', de: 'Wald', ru: 'Лес' },
        'terrain.hill': { fa: 'تپه', de: 'Hügel', ru: 'Холм' },
        'terrain.mountain': { fa: 'کوهستان', de: 'Gebirge', ru: 'Горы' },
        'terrain.river': { fa: 'رودخانه', de: 'Fluss', ru: 'Река' },
        'terrain.city': { fa: 'شهر', de: 'Stadt', ru: 'Город' },
        'terrain.ruins': { fa: 'ویرانه', de: 'Ruinen', ru: 'Руины' },
        'terrain.bridge': { fa: 'پل', de: 'Brücke', ru: 'Мост' },
        'terrain.marsh': { fa: 'مرداب', de: 'Sumpf', ru: 'Болото' },
        'terrain.road': { fa: 'جاده', de: 'Straße', ru: 'Дорога' },
        'terrain.bunker': { fa: 'پناهگاه', de: 'Bunker', ru: 'Бункер' },
        'terrain.trench': { fa: 'سنگر', de: 'Schützengraben', ru: 'Окоп' },
        'terrain.minefield': { fa: 'میدان مین', de: 'Minenfeld', ru: 'Минное поле' },
        'terrain.cemetery': { fa: 'گورستان', de: 'Friedhof', ru: 'Кладбище' },
        'terrain.factory': { fa: 'کارخانه', de: 'Fabrik', ru: 'Завод' },
        
        // ============ شخصیت‌ها ============
        'character.keller': { fa: 'اوبرست کلر', de: 'Oberst Keller', ru: 'Оберст Келлер' },
        'character.weber': { fa: 'هاوپتمن وبر', de: 'Hauptmann Weber', ru: 'Гауптман Вебер' },
        'character.schmidt': { fa: 'لویتنانت اشمیت', de: 'Leutnant Schmidt', ru: 'Лейтенант Шмидт' },
        'character.mueller': { fa: 'فلدويبل مولر', de: 'Feldwebel Müller', ru: 'Фельдфебель Мюллер' },
        'character.frank': { fa: 'دکتر فرانک', de: 'Doktor Frank', ru: 'Доктор Франк' },
        'character.gertrud': { fa: 'گرترود', de: 'Gertrud', ru: 'Гертруда' },
        'character.heinrich': { fa: 'هاینریش', de: 'Heinrich', ru: 'Генрих' },
        'character.blitz': { fa: 'بلیتز (سگ)', de: 'Blitz (Hund)', ru: 'Блиц (пёс)' },
        
        // ============ آب‌وهوا ============
        'weather.clear': { fa: 'صاف', de: 'Klar', ru: 'Ясно' },
        'weather.rain': { fa: 'بارانی', de: 'Regen', ru: 'Дождь' },
        'weather.snow': { fa: 'برفی', de: 'Schnee', ru: 'Снег' },
        'weather.fog': { fa: 'مه‌آلود', de: 'Nebel', ru: 'Туман' },
        'weather.storm': { fa: 'طوفان', de: 'Sturm', ru: 'Шторм' },
        
        // ============ زمان روز ============
        'time.dawn': { fa: 'سحر', de: 'Morgendämmerung', ru: 'Рассвет' },
        'time.day': { fa: 'روز', de: 'Tag', ru: 'День' },
        'time.dusk': { fa: 'غروب', de: 'Abenddämmerung', ru: 'Закат' },
        'time.night': { fa: 'شب', de: 'Nacht', ru: 'Ночь' },
        
        // ============ پیام‌ها ============
        'msg.victory': { fa: 'پیروزی!', de: 'Sieg!', ru: 'Победа!' },
        'msg.defeat': { fa: 'شکست...', de: 'Niederlage...', ru: 'Поражение...' },
        'msg.unit_destroyed': { fa: '{name} نابود شد.', de: '{name} wurde zerstört.', ru: '{name} уничтожен.' },
        'msg.unit_promoted': { fa: '{name} ارتقا یافت!', de: '{name} wurde befördert!', ru: '{name} повышен!' },
        'msg.character_died': { fa: '{name} کشته شد.', de: '{name} ist gefallen.', ru: '{name} пал.' },
        'msg.mercy': { fa: 'بخت با شما یار شد...', de: 'Das Glück ist mit Ihnen...', ru: 'Удача на вашей стороне...' },
        'msg.save_success': { fa: 'نبرد ثبت شد.', de: 'Spiel gespeichert.', ru: 'Игра сохранена.' },
        'msg.no_save': { fa: 'هیچ سیوی پیدا نشد.', de: 'Kein Spielstand gefunden.', ru: 'Сохранения не найдены.' },
        'msg.cannot_afford': { fa: 'منابع کافی نیست.', de: 'Nicht genug Ressourcen.', ru: 'Недостаточно ресурсов.' },
        
        // ============ اتمسفر ============
        'atmo.dawn_comes': { fa: 'سحر از راه می‌رسد...', de: 'Die Dämmerung kommt...', ru: 'Рассвет наступает...' },
        'atmo.night_falls': { fa: 'شب فرا می‌رسد...', de: 'Die Nacht bricht herein...', ru: 'Ночь наступает...' },
        'atmo.snow_begins': { fa: 'برف شروع به باریدن کرد...', de: 'Es beginnt zu schneien...', ru: 'Начинается снег...' },
        'atmo.storm_coming': { fa: 'طوفانی در راه است...', de: 'Ein Sturm zieht auf...', ru: 'Надвигается шторм...' },
        'atmo.radio_silence': { fa: 'سکوت رادیویی...', de: 'Funkstille...', ru: 'Радио молчит...' },
        'atmo.tank_sound': { fa: 'صدای زنجیر تانک از دور...', de: 'Kettengeräusche in der Ferne...', ru: 'Звук гусениц вдали...' },
        
        // ============ پایان‌ها ============
        'ending.victory_title': { fa: 'پیروزی پوچ', de: 'Leerer Sieg', ru: 'Пустая победа' },
        'ending.surrender_title': { fa: 'تسلیم شرافتمندانه', de: 'Ehrenhafte Kapitulation', ru: 'Почётная капитуляция' },
        'ending.escape_title': { fa: 'فرار به تاریکی', de: 'Flucht ins Dunkel', ru: 'Побег во тьму' },
        'ending.secret_title': { fa: 'نامه‌ای از آینده', de: 'Brief aus der Zukunft', ru: 'Письмо из будущего' },
        
        // ============ متفرقه ============
        'misc.confirm_exit': { fa: 'واقعاً می‌خواهی ترک کنی؟ سربازانت منتظرند.', de: 'Wollen Sie wirklich gehen? Ihre Soldaten warten.', ru: 'Вы правда хотите уйти? Ваши солдаты ждут.' },
        'misc.one_more_turn': { fa: 'فقط یک نوبت دیگر...', de: 'Nur noch ein Zug...', ru: 'Ещё один ход...' },
        'misc.loading': { fa: 'در حال بارگذاری...', de: 'Lade...', ru: 'Загрузка...' },
        'misc.offline': { fa: 'حالت آفلاین', de: 'Offline-Modus', ru: 'Офлайн-режим' },
        'misc.online': { fa: 'آنلاین', de: 'Online', ru: 'Онлайн' }
    },
    
    t(key, params = {}) {
        const translation = this.translations[key];
        if (!translation) {
            console.warn(`[i18n] کلید ترجمه یافت نشد: ${key}`);
            return key;
        }
        
        let text = translation[this.currentLanguage] || translation['fa'] || key;
        
        for (const [param, value] of Object.entries(params)) {
            text = text.replace(`{${param}}`, value);
        }
        
        return text;
    },
    
    setLanguage(lang) {
        if (['fa', 'de', 'ru'].includes(lang)) {
            this.currentLanguage = lang;
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
            return true;
        }
        return false;
    },
    
    getDirection() {
        return this.currentLanguage === 'fa' ? 'rtl' : 'ltr';
    },
    
    getAvailableLanguages() {
        return [
            { code: 'fa', name: 'فارسی', nativeName: 'فارسی' },
            { code: 'de', name: 'آلمانی', nativeName: 'Deutsch' },
            { code: 'ru', name: 'روسی', nativeName: 'Русский' }
        ];
    }
};

const __ = (key, params) => I18N.t(key, params);
