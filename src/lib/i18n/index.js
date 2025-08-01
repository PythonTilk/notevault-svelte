import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Available languages
export const languages = {
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
function getInitialLanguage() {
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
export const currentLanguage = writable(getInitialLanguage());

// Translations cache
const translationsCache = new Map();

// Load translations for a language
async function loadTranslations(lang) {
  if (translationsCache.has(lang)) {
    return translationsCache.get(lang);
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
export const translations = writable({});

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

// Translation function
export const t = derived(
  [currentLanguage, translations],
  ([$currentLanguage, $translations]) => {
    return (key, params = {}, fallback = key) => {
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
function getNestedValue(obj, key) {
  return key.split('.').reduce((current, part) => current?.[part], obj);
}

// Simple string interpolation
function interpolate(str, params) {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

// Get plural key based on language rules
function getPluralKey(count, language) {
  // Simplified pluralization rules
  const pluralRules = {
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
export function setLanguage(lang) {
  if (languages[lang]) {
    currentLanguage.set(lang);
  } else {
    console.warn(`Language ${lang} is not supported`);
  }
}

// Get current language info
export const currentLanguageInfo = derived(
  currentLanguage,
  ($currentLanguage) => languages[$currentLanguage] || languages[DEFAULT_LANGUAGE]
);

// Check if current language is RTL
export const isRTL = derived(
  currentLanguageInfo,
  ($currentLanguageInfo) => $currentLanguageInfo.rtl
);

// Date/time formatting utilities
export const formatters = derived(
  currentLanguage,
  ($currentLanguage) => ({
    // Date formatter
    date: (date, options = {}) => {
      if (!browser) return date.toString();
      
      const defaultOptions = { 
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
    time: (date, options = {}) => {
      if (!browser) return date.toString();
      
      const defaultOptions = { 
        hour: '2-digit', 
        minute: '2-digit' 
      };
      
      return new Intl.DateTimeFormat($currentLanguage, { 
        ...defaultOptions, 
        ...options 
      }).format(date);
    },
    
    // Number formatter
    number: (number, options = {}) => {
      if (!browser) return number.toString();
      
      return new Intl.NumberFormat($currentLanguage, options).format(number);
    },
    
    // Currency formatter
    currency: (amount, currency = 'USD', options = {}) => {
      if (!browser) return `${currency} ${amount}`;
      
      return new Intl.NumberFormat($currentLanguage, {
        style: 'currency',
        currency,
        ...options
      }).format(amount);
    },
    
    // Relative time formatter
    relativeTime: (value, unit = 'second') => {
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

// Translation validation (for development)
export function validateTranslations(baseTranslations, targetTranslations, language) {
  const missing = [];
  const extra = [];
  
  function checkKeys(base, target, path = '') {
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
};

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