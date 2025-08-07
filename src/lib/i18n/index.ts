import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

// Language configuration type
interface LanguageConfig {
  name: string;
  flag: string;
  rtl: boolean;
}

// Translation parameters type
interface TranslationParams {
  [key: string]: string | number;
  count?: number;
}

// Translation value type
type TranslationValue = string | { [key: string]: string };

// Translations object type
interface Translations {
  [key: string]: TranslationValue | Translations;
}

// Available languages
export const languages: Record<string, LanguageConfig> = {
  en: { name: 'English', flag: '🇺🇸', rtl: false },
  es: { name: 'Español', flag: '🇪🇸', rtl: false },
  fr: { name: 'Français', flag: '🇫🇷', rtl: false },
  de: { name: 'Deutsch', flag: '🇩🇪', rtl: false },
  it: { name: 'Italiano', flag: '🇮🇹', rtl: false },
  pt: { name: 'Português', flag: '🇧🇷', rtl: false },
  ru: { name: 'Русский', flag: '🇷🇺', rtl: false },
  ja: { name: '日本語', flag: '🇯🇵', rtl: false },
  ko: { name: '한국어', flag: '🇰🇷', rtl: false },
  zh: { name: '中文', flag: '🇨🇳', rtl: false },
  ar: { name: 'العربية', flag: '🇸🇦', rtl: true },
  he: { name: 'עברית', flag: '🇮🇱', rtl: true }
};

// Default fallback language
const DEFAULT_LANGUAGE = 'en';

// Get browser language or stored preference
function getInitialLanguage(): string {
  if (browser) {
    // Check localStorage first
    const stored = localStorage.getItem('notevault-language');
    if (stored && languages[stored]) {
      return stored;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (languages[browserLang]) {
      return browserLang;
    }
  }
  
  return DEFAULT_LANGUAGE;
}

// Current language store
export const currentLanguage: Writable<string> = writable(getInitialLanguage());

// Translations cache
const translationsCache = new Map<string, Translations>();

// Load translations for a language
async function loadTranslations(lang: string): Promise<Translations> {
  if (translationsCache.has(lang)) {
    return translationsCache.get(lang)!;
  }
  
  try {
    // Dynamic import of translation files
    const translations = await import(`./locales/${lang}.js`);
    const data = translations.default || translations;
    translationsCache.set(lang, data);
    return data;
  } catch (error) {
    console.warn(`Failed to load translations for ${lang}, falling back to ${DEFAULT_LANGUAGE}`);
    
    if (lang !== DEFAULT_LANGUAGE) {
      return loadTranslations(DEFAULT_LANGUAGE);
    }
    
    // Return empty object as ultimate fallback
    return {};
  }
}

// Current translations store
export const translations: Writable<Translations> = writable({});

// Load translations when language changes
currentLanguage.subscribe(async (lang) => {
  const data = await loadTranslations(lang);
  translations.set(data);
  
  // Save to localStorage
  if (browser) {
    localStorage.setItem('notevault-language', lang);
    
    // Update document language and direction
    document.documentElement.lang = lang;
    document.documentElement.dir = languages[lang]?.rtl ? 'rtl' : 'ltr';
  }
});

// Translation function type
type TranslationFunction = (key: string, params?: TranslationParams, fallback?: string) => string;

// Translation function
export const t: Readable<TranslationFunction> = derived(
  [currentLanguage, translations],
  ([$currentLanguage, $translations]) => {
    return (key: string, params: TranslationParams = {}, fallback: string = key): string => {
      // Get nested translation value
      const value = getNestedValue($translations, key);
      
      if (value === undefined) {
        console.warn(`Translation missing for key: ${key} (${$currentLanguage})`);
        return fallback;
      }
      
      // Handle pluralization
      if (typeof value === 'object' && value !== null) {
        const count = params.count;
        if (count !== undefined) {
          const pluralKey = getPluralKey(count, $currentLanguage);
          const pluralValue = value[pluralKey] || value.other || value.one || fallback;
          return interpolate(pluralValue, params);
        }
      }
      
      // Handle string interpolation
      if (typeof value === 'string') {
        return interpolate(value, params);
      }
      
      return fallback;
    };
  }
);

// Get nested object value by dot notation
function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((current, part) => current?.[part], obj);
}

// Simple string interpolation
function interpolate(str: string, params: TranslationParams): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

// Plural rule function type
type PluralRule = (n: number) => string;

// Get plural key based on language rules
function getPluralKey(count: number, language: string): string {
  // Simplified pluralization rules
  const pluralRules: Record<string, PluralRule> = {
    en: (n) => n === 1 ? 'one' : 'other',
    es: (n) => n === 1 ? 'one' : 'other',
    fr: (n) => n <= 1 ? 'one' : 'other',
    de: (n) => n === 1 ? 'one' : 'other',
    it: (n) => n === 1 ? 'one' : 'other',
    pt: (n) => n === 1 ? 'one' : 'other',
    ru: (n) => {
      if (n % 10 === 1 && n % 100 !== 11) return 'one';
      if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'few';
      return 'many';
    },
    ja: () => 'other',
    ko: () => 'other',
    zh: () => 'other',
    ar: (n) => {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (n % 100 >= 3 && n % 100 <= 10) return 'few';
      if (n % 100 >= 11) return 'many';
      return 'other';
    },
    he: (n) => {
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (n % 10 === 0 && n !== 0) return 'many';
      return 'other';
    }
  };
  
  const rule = pluralRules[language] || pluralRules.en;
  return rule(count);
}

// Change language
export function setLanguage(lang: string): void {
  if (languages[lang]) {
    currentLanguage.set(lang);
  } else {
    console.warn(`Language ${lang} is not supported`);
  }
}

// Get current language info
export const currentLanguageInfo: Readable<LanguageConfig> = derived(
  currentLanguage,
  ($currentLanguage) => languages[$currentLanguage] || languages[DEFAULT_LANGUAGE]
);

// Check if current language is RTL
export const isRTL: Readable<boolean> = derived(
  currentLanguageInfo,
  ($currentLanguageInfo) => $currentLanguageInfo.rtl
);

// Date/time formatting utilities
export const formatters = derived(
  currentLanguage,
  ($currentLanguage) => ({
    // Date formatter
    date: (date: Date, options: Intl.DateTimeFormatOptions = {}) => {
      if (!browser) return date.toString();
      
      const defaultOptions: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      
      return new Intl.DateTimeFormat($currentLanguage, { 
        ...defaultOptions, 
        ...options 
      }).format(date);
    },
    
    // Time formatter
    time: (date: Date, options: Intl.DateTimeFormatOptions = {}) => {
      if (!browser) return date.toString();
      
      const defaultOptions: Intl.DateTimeFormatOptions = { 
        hour: '2-digit', 
        minute: '2-digit' 
      };
      
      return new Intl.DateTimeFormat($currentLanguage, { 
        ...defaultOptions, 
        ...options 
      }).format(date);
    },
    
    // Number formatter
    number: (number: number, options: Intl.NumberFormatOptions = {}) => {
      if (!browser) return number.toString();
      
      return new Intl.NumberFormat($currentLanguage, options).format(number);
    },
    
    // Currency formatter
    currency: (amount: number, currency = 'USD', options: Intl.NumberFormatOptions = {}) => {
      if (!browser) return `${currency} ${amount}`;
      
      return new Intl.NumberFormat($currentLanguage, {
        style: 'currency',
        currency,
        ...options
      }).format(amount);
    },
    
    // Relative time formatter
    relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit = 'second') => {
      if (!browser) return `${value} ${unit}${value !== 1 ? 's' : ''} ago`;
      
      try {
        return new Intl.RelativeTimeFormat($currentLanguage, {
          numeric: 'auto'
        }).format(value, unit);
      } catch (error) {
        return `${value} ${unit}${value !== 1 ? 's' : ''} ago`;
      }
    }
  })
);

// Translation validation result type
interface ValidationResult {
  missing: string[];
  extra: string[];
}

// Translation validation (for development)
export function validateTranslations(
  baseTranslations: Translations, 
  targetTranslations: Translations, 
  language: string
): ValidationResult {
  const missing: string[] = [];
  const extra: string[] = [];
  
  function checkKeys(base: any, target: any, path = '') {
    for (const key in base) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in target)) {
        missing.push(currentPath);
      } else if (typeof base[key] === 'object' && typeof target[key] === 'object') {
        checkKeys(base[key], target[key], currentPath);
      }
    }
    
    for (const key in target) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in base)) {
        extra.push(currentPath);
      }
    }
  }
  
  checkKeys(baseTranslations, targetTranslations);
  
  if (missing.length > 0 || extra.length > 0) {
    console.group(`Translation validation for ${language}`);
    if (missing.length > 0) {
      console.warn('Missing translations:', missing);
    }
    if (extra.length > 0) {
      console.warn('Extra translations:', extra);
    }
    console.groupEnd();
  }
  
  return { missing, extra };
}

// Export commonly used translation keys as constants
export const COMMON_KEYS = {
  // Actions
  SAVE: 'actions.save',
  CANCEL: 'actions.cancel',
  DELETE: 'actions.delete',
  EDIT: 'actions.edit',
  CREATE: 'actions.create',
  CLOSE: 'actions.close',
  
  // Navigation
  HOME: 'navigation.home',
  DASHBOARD: 'navigation.dashboard',
  SETTINGS: 'navigation.settings',
  PROFILE: 'navigation.profile',
  
  // Common
  LOADING: 'common.loading',
  ERROR: 'common.error',
  SUCCESS: 'common.success',
  WARNING: 'common.warning',
  
  // Time
  NOW: 'time.now',
  TODAY: 'time.today',
  YESTERDAY: 'time.yesterday',
  TOMORROW: 'time.tomorrow'
} as const;

export default {
  t,
  currentLanguage,
  currentLanguageInfo,
  isRTL,
  formatters,
  setLanguage,
  languages,
  COMMON_KEYS
};