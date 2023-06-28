import { expect, test, testSuite } from '../../../js/SimpleUnitTest/SimpleUnitTest.mjs'
import { IgnoreIntraWordQuotationMark } from '../../../js/normalizers/ParserNormalizer/IgnoreIntraWordQuotationMark.mjs'


const singleQuotationMarkRight = '\u2019'
const singleQuotationMarkLeft = '\u2018'
const doubleQuotationMarkRight =  '\u201d'

testSuite('IgnoreIntraWordQuotationMark', () => {

  test('Applicability', () => {
    let normalizer = new IgnoreIntraWordQuotationMark()
    expect(normalizer.isApplicable('test', 'la')).toBeFalse()
    expect(normalizer.isApplicable('test', 'ar')).toBeFalse()
    expect(normalizer.isApplicable('test', 'he')).toBeFalse()
    expect(normalizer.isApplicable( `t${singleQuotationMarkRight}est`, 'he')).toBeTrue()
  })

  test('Strings', () => {
    let normalizer = new IgnoreIntraWordQuotationMark()
    let str
    let result
    let context


    context = 'String without quotation marks'
    str = `test`
    result = normalizer.normalizeString(str, 'he')
    expect(result.length, context).toBe(0)


    context = 'String with with inner quotation mark, no punctuation'
    str = `t${singleQuotationMarkRight}est`
    result = normalizer.normalizeString(str, 'he')
    expect(result.length, context).toBe(1)
    expect(result[0].normalizedText, context).toBeAStringEqualTo('test')
    expect(result[0].text, context).toBeAStringEqualTo(str)

    context = 'String with inner and outer quotation marks'
    str = `t${singleQuotationMarkRight}est${singleQuotationMarkLeft}`
    result = normalizer.normalizeString(str, 'he')
    expect(result.length, context).toBe(2)
    expect(result[0].text, context).toBeAStringEqualTo( `t${singleQuotationMarkRight}est`)
    expect(result[0].normalizedText, context).toBe('test')
    expect(result[1].text, context).toBeAStringEqualTo( `${singleQuotationMarkLeft}`)

    context = 'String with inner QM and punctuation at the end'
    str = `t${singleQuotationMarkRight}est.`
    result = normalizer.normalizeString(str, 'he')
    expect(result.length, context).toBe(2)
    expect(result[0].text, context).toBe( `t${singleQuotationMarkRight}est`)
    expect(result[0].normalizedText, context).toBe('test')
    expect(result[1].text, context).toBe('.')

    context = 'String with inner and outer QMs and punctuation at the end'
    str = `t${singleQuotationMarkRight}est${singleQuotationMarkLeft}.`
    result = normalizer.normalizeString(str, 'he')
    expect(result.length, context).toBe(3)
    expect(result[0].text, context).toBe( `t${singleQuotationMarkRight}est`)
    expect(result[0].normalizedText, context).toBe('test')
    expect(result[1].text, context).toBe(singleQuotationMarkLeft)
    expect(result[2].text, context).toBe('.')



  })

})

