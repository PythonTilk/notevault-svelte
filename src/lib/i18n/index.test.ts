import { describe, it, expect, vi } from 'vitest';
import { get } from 'svelte/store';
import { languages, setLanguage, currentLanguage } from './index';

describe('i18n Module', () => {
  it('should have all expected languages', () => {
    expect(languages).toHaveProperty('en');
    expect(languages).toHaveProperty('es');
    expect(languages).toHaveProperty('fr');
    expect(languages).toHaveProperty('de');
    expect(languages.en.name).toBe('English');
    expect(languages.ar.rtl).toBe(true);
  });

  it('should set language correctly', () => {
    setLanguage('es');
    expect(get(currentLanguage)).toBe('es');
  });

  it('should warn about unsupported languages', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    setLanguage('invalid');
    expect(consoleSpy).toHaveBeenCalledWith('Language invalid is not supported');
    
    consoleSpy.mockRestore();
  });

  it('should handle RTL languages correctly', () => {
    expect(languages.ar.rtl).toBe(true);
    expect(languages.he.rtl).toBe(true);
    expect(languages.en.rtl).toBe(false);
  });
});