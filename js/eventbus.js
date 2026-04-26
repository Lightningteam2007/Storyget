// sturmglanz/js/eventbus.js
// سیستم رویداد متمرکز - Pub/Sub Pattern
'use strict';

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.debugMode = false;
    }

    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push({ callback, context });
        return this;
    }

    once(event, callback, context = null) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        this.onceListeners.get(event).push({ callback, context });
        return this;
    }

    off(event, callback = null) {
        if (!callback) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
            return this;
        }
        if (this.listeners.has(event)) {
            this.listeners.set(event,
                this.listeners.get(event).filter(l => l.callback !== callback)
            );
        }
        if (this.onceListeners.has(event)) {
            this.onceListeners.set(event,
                this.onceListeners.get(event).filter(l => l.callback !== callback)
            );
        }
        return this;
    }

    emit(event, data = {}) {
        if (this.debugMode) {
            console.log(`[EventBus] ${event}`, data);
        }
        if (this.listeners.has(event)) {
            for (const listener of this.listeners.get(event)) {
                try {
                    listener.callback.call(listener.context, data);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for "${event}":`, e);
                }
            }
        }
        if (this.onceListeners.has(event)) {
            const onceList = this.onceListeners.get(event);
            this.onceListeners.delete(event);
            for (const listener of onceList) {
                try {
                    listener.callback.call(listener.context, data);
                } catch (e) {
                    console.error(`[EventBus] Error in once listener for "${event}":`, e);
                }
            }
        }
        if (this.listeners.has('*')) {
            for (const listener of this.listeners.get('*')) {
                try {
                    listener.callback.call(listener.context, { event, data });
                } catch (e) {
                    console.error(`[EventBus] Error in wildcard listener:`, e);
                }
            }
        }
    }

    clear() {
        this.listeners.clear();
        this.onceListeners.clear();
    }

    enableDebug() { this.debugMode = true; }
    disableDebug() { this.debugMode = false; }

    getListenerCount(event) {
        let count = 0;
        if (this.listeners.has(event)) count += this.listeners.get(event).length;
        if (this.onceListeners.has(event)) count += this.onceListeners.get(event).length;
        return count;
    }

    getAllEvents() {
        const events = new Set();
        for (const key of this.listeners.keys()) events.add(key);
        for (const key of this.onceListeners.keys()) events.add(key);
        return Array.from(events);
    }
}

const eventBus = new EventBus();

const GAME_EVENTS = {
    GAME_INITIALIZED: 'gameInitialized',
    GAME_LOADED: 'gameLoaded',
    NEW_TURN: 'newTurn',
    PHASE_CHANGED: 'phaseChanged',
    UNIT_MOVED: 'unitMoved',
    UNIT_CREATED: 'unitCreated',
    UNIT_DESTROYED: 'unitDestroyed',
    UNIT_DAMAGED: 'unitDamaged',
    UNIT_HEALED: 'unitHealed',
    UNIT_PROMOTED: 'unitPromoted',
    COMBAT_OCCURRED: 'combatOccurred',
    AMBUSH_TRIGGERED: 'ambushTriggered',
    ENCIRCLEMENT: 'encirclement',
    WEATHER_CHANGED: 'weatherChanged',
    DAYNIGHT_CHANGED: 'daynightChanged',
    RESOURCES_CHANGED: 'resourcesChanged',
    VICTORY_POINT_CAPTURED: 'victoryPointCaptured',
    CHARACTER_DIED: 'characterDied',
    DIALOGUE_TRIGGERED: 'dialogueTriggered',
    MYSTERY_UNLOCKED: 'mysteryUnlocked',
    POEM_DISPLAYED: 'poemDisplayed',
    MERCY_ACTIVATED: 'mercyActivated',
    GAME_OVER: 'gameOver',
    LOG_ADDED: 'logAdded',
    SAVE_COMPLETED: 'saveCompleted',
    LOAD_COMPLETED: 'loadCompleted',
    SETTINGS_CHANGED: 'settingsChanged',
    OFFLINE_READY: 'offlineReady',
    UPDATE_AVAILABLE: 'updateAvailable'
};
