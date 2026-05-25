import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';
type Currency = 'IDR' | 'USD';
type Language = 'ID' | 'EN';

interface AppContextType {
    theme: Theme;
    toggleTheme: () => void;
    currency: Currency;
    setCurrency: (curr: Currency) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
}

const STORAGE_KEYS = {
    theme: 'travelohi_theme',
    currency: 'travelohi_currency',
    language: 'travelohi_language',
} as const;

function readStorage<T extends string>(key: string, fallback: T, allowed: T[]): T {
    try {
        const val = localStorage.getItem(key) as T | null;
        return val && allowed.includes(val) ? val : fallback;
    } catch {
        return fallback;
    }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() =>
        readStorage<Theme>(STORAGE_KEYS.theme, 'light', ['light', 'dark'])
    );
    const [currency, setCurrencyState] = useState<Currency>(() =>
        readStorage<Currency>(STORAGE_KEYS.currency, 'IDR', ['IDR', 'USD'])
    );
    const [language, setLanguageState] = useState<Language>(() =>
        readStorage<Language>(STORAGE_KEYS.language, 'ID', ['ID', 'EN'])
    );

    const toggleTheme = () => {
        setThemeState((prev) => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem(STORAGE_KEYS.theme, next);
            return next;
        });
    };

    const setCurrency = (curr: Currency) => {
        localStorage.setItem(STORAGE_KEYS.currency, curr);
        setCurrencyState(curr);
    };

    const setLanguage = (lang: Language) => {
        localStorage.setItem(STORAGE_KEYS.language, lang);
        setLanguageState(lang);
    };

    return (
        <AppContext.Provider value={{ theme, toggleTheme, currency, setCurrency, language, setLanguage }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
