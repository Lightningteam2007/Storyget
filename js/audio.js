// sturmglanz/js/audio.js
// موتور صوتی کامل - Web Audio API، موسیقی پویا، افکت‌های صوتی، رادیو، سکوت هنری
'use strict';

class AudioEngine {
    constructor(gameState) {
        this.gs = gameState;
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.ambientGain = null;
        this.radioGain = null;

        this.currentMusic = null;
        this.musicNodes = [];
        this.activeSFX = [];
        this.ambientNodes = [];
        this.radioNodes = [];

        this.isMuted = false;
        this.musicVolume = 0.4;
        this.sfxVolume = 0.7;
        this.ambientVolume = 0.3;
        this.radioVolume = 0.5;

        this.characterMotifs = {}; // موتیف ۴ نتی هر شخصیت
        this.silenceTimer = 0;
        this.isSilenceActive = false;

        this.init();
    }

    // ============ راه‌اندازی ============
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // گین‌های اصلی
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.isMuted ? 0 : 1;
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.value = this.ambientVolume;
            this.ambientGain.connect(this.masterGain);

            this.radioGain = this.ctx.createGain();
            this.radioGain.gain.value = this.radioVolume;
            this.radioGain.connect(this.masterGain);

            // موتیف شخصیت‌ها
            this.setupCharacterMotifs();

            // شروع صدای محیط
            this.startAmbient();

            console.log('🔊 موتور صوتی راه‌اندازی شد.');
        } catch (e) {
            console.warn('Web Audio API در دسترس نیست:', e);
            this.ctx = null;
        }
    }

    // ============ موتیف شخصیت‌ها (۴ نت) ============
    setupCharacterMotifs() {
        this.characterMotifs = {
            keller: { notes: [262, 294, 330, 349], rhythm: [0.2, 0.2, 0.2, 0.4], instrument: 'square' },
            weber: { notes: [392, 440, 494, 523], rhythm: [0.15, 0.15, 0.15, 0.3], instrument: 'sawtooth' },
            schmidt: { notes: [330, 294, 262, 247], rhythm: [0.3, 0.2, 0.3, 0.2], instrument: 'triangle' },
            mueller: { notes: [175, 196, 220, 247], rhythm: [0.25, 0.25, 0.25, 0.25], instrument: 'square' },
            frank: { notes: [294, 330, 349, 392], rhythm: [0.2, 0.3, 0.2, 0.3], instrument: 'sine' },
            gertrud: { notes: [349, 392, 440, 349], rhythm: [0.25, 0.2, 0.25, 0.3], instrument: 'sine' },
            heinrich: { notes: [440, 349, 294, 262], rhythm: [0.2, 0.2, 0.3, 0.3], instrument: 'triangle' },
            blitz: { notes: [523, 587, 659, 523], rhythm: [0.1, 0.1, 0.1, 0.2], instrument: 'sine' }
        };
    }

    playCharacterMotif(characterId) {
        if (!this.ctx || this.isMuted) return;
        const motif = this.characterMotifs[characterId];
        if (!motif) return;

        const now = this.ctx.currentTime;
        let timeOffset = 0;

        for (let i = 0; i < motif.notes.length; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = motif.instrument || 'sine';
            osc.frequency.value = motif.notes[i];

            gain.gain.setValueAtTime(0, now + timeOffset);
            gain.gain.linearRampToValueAtTime(0.15, now + timeOffset + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + timeOffset + motif.rhythm[i]);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + motif.rhythm[i] + 0.1);

            timeOffset += motif.rhythm[i];
        }
    }

    // ============ موسیقی پویا ============
    playMusic(type) {
        if (!this.ctx || this.isMuted) return;

        // قطع موسیقی قبلی
        this.stopMusic();

        switch (type) {
            case 'battle':
                this.startBattleMusic();
                break;
            case 'victory':
                this.startVictoryMusic();
                break;
            case 'defeat':
                this.startDefeatMusic();
                break;
            case 'night':
                this.startNightMusic();
                break;
            case 'tense':
                this.startTenseMusic();
                break;
            default:
                this.startAmbientMusic();
        }
    }

    stopMusic() {
        for (const node of this.musicNodes) {
            try {
                node.oscillator?.stop();
                node.oscillator?.disconnect();
            } catch (e) { /* ignore */ }
        }
        this.musicNodes = [];
    }

    startBattleMusic() {
        // ضربان درام + باس
        const now = this.ctx.currentTime;

        // باس
        for (let i = 0; i < 8; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 55 + i * 10;
            gain.gain.setValueAtTime(0, now + i * 0.5);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.5 + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.5 + 0.4);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + i * 0.5);
            osc.stop(now + i * 0.5 + 0.5);
            this.musicNodes.push({ oscillator: osc, gain });
        }

        // ضربان
        for (let i = 0; i < 16; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = 120;
            gain.gain.setValueAtTime(0.15, now + i * 0.25);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.25 + 0.05);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + i * 0.25);
            osc.stop(now + i * 0.25 + 0.1);
            this.musicNodes.push({ oscillator: osc, gain });
        }
    }

    startVictoryMusic() {
        // ترومپت پیروزی - ملودی ساده
        const notes = [523, 659, 784, 1047, 784, 1047];
        const now = this.ctx.currentTime;
        for (let i = 0; i < notes.length; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = notes[i];
            gain.gain.setValueAtTime(0.15, now + i * 0.3);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.3 + 0.25);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + i * 0.3);
            osc.stop(now + i * 0.3 + 0.3);
            this.musicNodes.push({ oscillator: osc, gain });
        }
    }

    startDefeatMusic() {
        // سکوت + صدای باد
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 80;
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 4);
        this.musicNodes.push({ oscillator: osc, gain, filter });
    }

    startNightMusic() {
        // ویولون تنها
        const now = this.ctx.currentTime;
        const notes = [294, 330, 349, 392, 349, 330, 294, 262];
        for (let i = 0; i < notes.length; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = notes[i];
            gain.gain.setValueAtTime(0.1, now + i * 0.8);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.8 + 0.7);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now + i * 0.8);
            osc.stop(now + i * 0.8 + 0.8);
            this.musicNodes.push({ oscillator: osc, gain });
        }
    }

    startTenseMusic() {
        // لرزش ویولن (تنش)
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 200;
        lfo.type = 'sine';
        lfo.frequency.value = 4;
        lfoGain.gain.value = 30;

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.06, now);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 5);
        lfo.stop(now + 5);
        this.musicNodes.push({ oscillator: osc, gain, lfo });
    }

    startAmbientMusic() {
        // پد ملایم
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = 130;
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        gain.gain.setValueAtTime(0.05, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 10);
        this.musicNodes.push({ oscillator: osc, gain });
    }

    // ============ افکت‌های صوتی ============
    playSFX(type) {
        if (!this.ctx || this.isMuted) return;

        switch (type) {
            case 'gunshot':
                this.playGunshot();
                break;
            case 'explosion':
                this.playExplosion();
                break;
            case 'tank_move':
                this.playTankMove();
                break;
            case 'stuka_siren':
                this.playStukaSiren();
                break;
            case 'radio_static':
                this.playRadioStatic();
                break;
            case 'bell':
                this.playChurchBell();
                break;
            case 'heartbeat':
                this.playHeartbeat();
                break;
            case 'footstep_snow':
                this.playFootstepSnow();
                break;
        }
    }

    playGunshot() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.08);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playExplosion() {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 1.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.3));
        }

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.linearRampToValueAtTime(50, now + 1);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        source.start(now);
        source.stop(now + 1.5);
    }

    playTankMove() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 40;
        lfo.type = 'square';
        lfo.frequency.value = 6;
        lfoGain.gain.value = 10;

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 2);
        lfo.stop(now + 2);
    }

    playStukaSiren() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.8);
        osc.frequency.linearRampToValueAtTime(700, now + 1.6);
        osc.frequency.linearRampToValueAtTime(200, now + 2.5);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 3);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 3);
    }

    playRadioStatic() {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        source.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 2;

        gain.gain.setValueAtTime(0.15, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.radioGain);
        source.start(now);
        source.stop(now + 2);
    }

    playChurchBell() {
        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 528 + i * 50;
            gain.gain.setValueAtTime(0.15, now + i * 1.5);
            gain.gain.linearRampToValueAtTime(0, now + i * 1.5 + 1.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 1.5);
            osc.stop(now + i * 1.5 + 1.5);
        }
    }

    playHeartbeat() {
        const now = this.ctx.currentTime;
        for (let i = 0; i < 4; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 60;
            gain.gain.setValueAtTime(0.2, now + i * 0.8);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.8 + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.8);
            osc.stop(now + i * 0.8 + 0.2);
        }
    }

    playFootstepSnow() {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
        }

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        source.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        gain.gain.setValueAtTime(0.08, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        source.start(now);
        source.stop(now + 0.3);
    }

    // ============ صدای محیط ============
    startAmbient() {
        if (!this.ctx) return;

        // باد ملایم
        this.createWindAmbient();
    }

    createWindAmbient() {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.03 * Math.sin(i / 1000);
        }

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        source.buffer = buffer;
        source.loop = true;
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        gain.gain.setValueAtTime(0.1, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientGain);
        source.start(now);
        this.ambientNodes.push({ source, gain });
    }

    updateAmbient(weather) {
        if (!this.ctx) return;

        // تنظیم صدای محیط بر اساس آب‌وهوا
        let ambientVolume = 0.1;
        switch (weather) {
            case 'sturm':
                ambientVolume = 0.3;
                break;
            case 'regen':
                ambientVolume = 0.2;
                break;
            case 'schnee':
                ambientVolume = 0.05;
                break;
        }

        for (const node of this.ambientNodes) {
            node.gain.gain.linearRampToValueAtTime(ambientVolume, this.ctx.currentTime + 0.5);
        }
    }

    // ============ رادیو ============
    playRadio(station) {
        if (!this.ctx || this.isMuted) return;

        this.stopRadio();

        const now = this.ctx.currentTime;

        // استاتیک پس‌زمینه
        const bufferSize = this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.05;
        }

        const staticSource = this.ctx.createBufferSource();
        const staticGain = this.ctx.createGain();
        staticSource.buffer = buffer;
        staticSource.loop = true;
        staticGain.gain.setValueAtTime(0.06, now);
        staticSource.connect(staticGain);
        staticGain.connect(this.radioGain);
        staticSource.start(now);
        this.radioNodes.push({ source: staticSource, gain: staticGain });

        // پیام رادیو (تبدیل متن به تن با فرکانس‌های مختلف)
        const messageOsc = this.ctx.createOscillator();
        const messageGain = this.ctx.createGain();
        messageOsc.type = 'sine';

        // شبیه‌سازی صدای صحبت با تغییر فرکانس
        const baseFreq = 300;
        const now2 = this.ctx.currentTime;
        for (let i = 0; i < 10; i++) {
            messageOsc.frequency.setValueAtTime(baseFreq + Math.random() * 200, now2 + i * 0.3);
        }

        messageGain.gain.setValueAtTime(0.08, now2);
        messageGain.gain.linearRampToValueAtTime(0, now2 + 3);

        messageOsc.connect(messageGain);
        messageGain.connect(this.radioGain);
        messageOsc.start(now2);
        messageOsc.stop(now2 + 3);
        this.radioNodes.push({ source: messageOsc, gain: messageGain });
    }

    stopRadio() {
        for (const node of this.radioNodes) {
            try {
                node.source?.stop();
                node.source?.disconnect();
            } catch (e) { /* ignore */ }
        }
        this.radioNodes = [];
    }

    // ============ سکوت هنری ============
    triggerSilence(duration = 5) {
        this.silenceTimer = duration * 60; // تبدیل به فریم
        this.isSilenceActive = true;

        // کاهش تدریجی تمام صداها
        if (this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.linearRampToValueAtTime(0.01, now + 1);
        }
    }

    updateSilence() {
        if (!this.isSilenceActive) return;

        this.silenceTimer--;
        if (this.silenceTimer <= 0) {
            this.isSilenceActive = false;
            if (this.ctx) {
                const now = this.ctx.currentTime;
                this.masterGain.gain.linearRampToValueAtTime(1, now + 1);
            }
        }
    }

    // ============ کنترل‌ها ============
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(
                this.isMuted ? 0 : 1,
                this.ctx.currentTime + 0.3
            );
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.ctx) {
            this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, this.ctx.currentTime + 0.2);
        }
    }

    setSFXVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        if (this.ctx) {
            this.sfxGain.gain.linearRampToValueAtTime(this.sfxVolume, this.ctx.currentTime + 0.2);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}
