import { LanguageDetector } from '@/toolbox/LanguageDetector'
import { describe, expect, test } from 'vitest'


describe('LanguageDetector', () => {
  test('Simple Strings', () => {
    let ld = new LanguageDetector('la')

    expect( ld.detectLang('Roma')).toBe('la')
    expect( ld.detectLang('1971')).toBe('la')
    expect( ld.detectLang('1971.')).toBe('la')
    expect( ld.detectLang('גשגכש')).toBe('he')
    expect( ld.detectLang('גשגכש.')).toBe('he')
    expect( ld.detectLang('شيبشسيب')).toBe('ar')
    expect( ld.detectLang('شيبشسيب.')).toBe('ar')

    ld.setDefaultLang('he')
    expect( ld.detectLang('Roma')).toBe('la')
    expect( ld.detectLang('1971')).toBe('he')
    expect( ld.detectLang('1971.')).toBe('he')
    expect( ld.detectLang('גשגכש')).toBe('he')
    expect( ld.detectLang('גשגכש.')).toBe('he')
    expect( ld.detectLang('شيبشسيب')).toBe('ar')
    expect( ld.detectLang('شيبشسيب.')).toBe('ar')

    ld.setDefaultLang('ar')
    expect( ld.detectLang('Roma')).toBe('la')
    expect( ld.detectLang('1971')).toBe('ar')
    expect( ld.detectLang('1971.')).toBe('ar')
    expect( ld.detectLang('גשגכש')).toBe('he')
    expect( ld.detectLang('גשגכש.')).toBe('he')
    expect( ld.detectLang('شيبشسيب')).toBe('ar')
    expect( ld.detectLang('شيبشسيب.')).toBe('ar')
  })
});


