import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

export async function setToken(key, value) {
    if (isNative) {
        await Preferences.set({ key, value });
    } else {
        localStorage.setItem(key, value);
    }
}

export async function getToken(key) {
    if (isNative) {
        const { value } = await Preferences.get({ key });
        if (value !== null) return value;
        // Migração: se havia token em localStorage (versão antiga), move pro Preferences
        const legacy = localStorage.getItem(key);
        if (legacy !== null) {
            await Preferences.set({ key, value: legacy });
            localStorage.removeItem(key);
            return legacy;
        }
        return null;
    }
    return localStorage.getItem(key);
}

export async function removeToken(key) {
    if (isNative) {
        await Preferences.remove({ key });
    } else {
        localStorage.removeItem(key);
    }
}
