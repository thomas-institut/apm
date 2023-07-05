import { expect, test, testSuite } from '../../../js/SimpleUnitTest/SimpleUnitTest.mjs'
import { LanguageDetector } from '../../../js/toolbox/LanguageDetector.mjs'


testSuite('Language Detector', () => {

  test('Simple Strings', () => {
    let ld = new LanguageDetector({defaultLang: 'la'})

    expect( ld.detectLang('Roma')).toBeAStringEqualTo('la')
    expect( ld.detectLang('1971')).toBeAStringEqualTo('la')
    expect( ld.detectLang('1971.')).toBeAStringEqualTo('la')
    expect( ld.detectLang('גשגכש')).toBeAStringEqualTo('he')
    expect( ld.detectLang('גשגכש.')).toBeAStringEqualTo('he')
    expect( ld.detectLang('شيبشسيب')).toBeAStringEqualTo('ar')
    expect( ld.detectLang('شيبشسيب.')).toBeAStringEqualTo('ar')

    ld.setDefaultLang('he')
    expect( ld.detectLang('Roma')).toBeAStringEqualTo('la')
    expect( ld.detectLang('1971')).toBeAStringEqualTo('he')
    expect( ld.detectLang('1971.')).toBeAStringEqualTo('he')
    expect( ld.detectLang('גשגכש')).toBeAStringEqualTo('he')
    expect( ld.detectLang('גשגכש.')).toBeAStringEqualTo('he')
    expect( ld.detectLang('شيبشسيب')).toBeAStringEqualTo('ar')
    expect( ld.detectLang('شيبشسيب.')).toBeAStringEqualTo('ar')

    ld.setDefaultLang('ar')
    expect( ld.detectLang('Roma')).toBeAStringEqualTo('la')
    expect( ld.detectLang('1971')).toBeAStringEqualTo('ar')
    expect( ld.detectLang('1971.')).toBeAStringEqualTo('ar')
    expect( ld.detectLang('גשגכש')).toBeAStringEqualTo('he')
    expect( ld.detectLang('גשגכש.')).toBeAStringEqualTo('he')
    expect( ld.detectLang('شيبشسيب')).toBeAStringEqualTo('ar')
    expect( ld.detectLang('شيبشسيب.')).toBeAStringEqualTo('ar')
  })

  test('Direction Detection', () => {
    let ld = new LanguageDetector({defaultLang: 'la'})

    expect( ld.detectTextDirection('')).toBeAStringEqualTo('')
    expect( ld.detectTextDirection(' ')).toBeAStringEqualTo('')
    expect( ld.detectTextDirection("\t\n ")).toBeAStringEqualTo('')
    expect( ld.detectTextDirection('... ')).toBeAStringEqualTo('')
    expect( ld.detectTextDirection('Roma')).toBeAStringEqualTo('ltr')
    expect( ld.detectTextDirection('1971')).toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('1971.')).toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('65,')).toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('5:')).toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('(5)'), 'Number in round brackets').toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('5f.'), 'Number ending in period').toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('[5.5]'), 'Decimal in brackets').toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('[5.5.a]'), 'Decimal in brackets').toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('(115ב,'), `Oded's string 1: '(115ב,'`).toBeAStringEqualTo('en')
    expect( ld.detectTextDirection('גשגכש')).toBeAStringEqualTo('rtl')
    expect( ld.detectTextDirection('גשגכש.')).toBeAStringEqualTo('rtl')
    expect( ld.detectTextDirection('شيبشسيب')).toBeAStringEqualTo('rtl')
    expect( ld.detectTextDirection('شيبشسيب.')).toBeAStringEqualTo('rtl')

  })
})