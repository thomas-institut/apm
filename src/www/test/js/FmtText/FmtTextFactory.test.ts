
import { FmtTextFactory } from '@/FmtText/FmtTextFactory'
import * as FmtTextTokenType from '@/FmtText/FmtTextTokenType'
import { FmtTextUtil } from '@/FmtText/FmtTextUtil'
import { describe, expect, it } from 'vitest'

const singleWordText = 'someText'
const word1 = 'someWord'
const word2 = 'otherWord'

describe('FmtTextFactory', ()=> {
    it("should build from string", ()=>{

      let text1 = FmtTextFactory.fromAnything(singleWordText)
      expect(Array.isArray(text1)).toBe(true)
      expect(text1.length).toBe(1)
      expect(FmtTextUtil.tokenGetPlainText(text1[0])).toBe(singleWordText)

      let text2 = FmtTextFactory.fromAnything(`${word1} ${word2}`)
      expect(Array.isArray(text1)).toBe(true)
      expect(text2.length).toBe(3)
      expect(FmtTextUtil.tokenGetPlainText(text2[0])).toBe(word1)
      expect(FmtTextUtil.tokenGetPlainText(text2[1])).toBe(' ')
      expect(text2[1].type).toBe(FmtTextTokenType.GLUE)
      expect(FmtTextUtil.tokenGetPlainText(text2[2])).toBe(word2)

      expect(FmtTextFactory.fromAnything('').length).toBe(0)
    })

  it('should build from array', () => {
    expect(FmtTextFactory.fromAnything([]).length).toBe(0)

    let text1 = FmtTextFactory.fromAnything([ word1, ' ', { type: FmtTextTokenType.TEXT, text: word2}])
    expect(Array.isArray(text1)).toBe(true)
    expect(text1.length).toBe(3)
    expect(FmtTextUtil.tokenGetPlainText(text1[0])).toBe(word1)
    expect(FmtTextUtil.tokenGetPlainText(text1[1])).toBe(' ')
    expect(text1[1].type).toBe(FmtTextTokenType.GLUE)
    expect(FmtTextUtil.tokenGetPlainText(text1[2])).toBe(word2)

    let text2 = FmtTextFactory.fromAnything([ `${word1} `, { type: FmtTextTokenType.TEXT, text: word2}])
    expect(Array.isArray(text2)).toBe(true)
    expect(text2.length).toBe(3)
    expect(FmtTextUtil.tokenGetPlainText(text2[0])).toBe(word1)
    expect(FmtTextUtil.tokenGetPlainText(text2[1])).toBe(' ')
    expect(text2[1].type).toBe(FmtTextTokenType.GLUE);
    expect(FmtTextUtil.tokenGetPlainText(text2[2])).toBe(word2)
  })

})

