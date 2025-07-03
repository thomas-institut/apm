import { describe, expect, it } from 'vitest'
import { FmtTextFactory } from '../../js/FmtText/FmtTextFactory.mjs'
import * as FmtTextTokenType from '../../js/FmtText/FmtTextTokenType.mjs'

const singleWordText = 'someText'
const word1 = 'someWord'
const word2 = 'otherWord'

describe('FmtTextFactory', ()=> {
    it("should build from string", ()=>{

      let text1 = FmtTextFactory.fromAnything(singleWordText)
      expect(Array.isArray(text1)).toBe(true)
      expect(text1.length).toBe(1)
      expect(text1[0].getPlainText()).toBe(singleWordText)

      let text2 = FmtTextFactory.fromAnything(`${word1} ${word2}`)
      expect(Array.isArray(text1)).toBe(true)
      expect(text2.length).toBe(3)
      expect(text2[0].getPlainText()).toBe(word1)
      expect(text2[1].getPlainText()).toBe(' ')
      expect(text2[1].type).toBe(FmtTextTokenType.GLUE)
      expect(text2[2].getPlainText()).toBe(word2)

      expect(FmtTextFactory.fromAnything('').length).toBe(0)
    })

  it('should build from array', () => {
    expect(FmtTextFactory.fromAnything([]).length).toBe(0)

    let text1 = FmtTextFactory.fromAnything([ word1, ' ', { type: FmtTextTokenType.TEXT, text: word2}])
    console.log(text1)
    expect(Array.isArray(text1)).toBe(true)
    expect(text1.length).toBe(3)
    expect(text1[0].getPlainText()).toBe(word1)
    expect(text1[1].getPlainText()).toBe(' ')
    expect(text1[1].type).toBe(FmtTextTokenType.GLUE)
    expect(text1[2].getPlainText()).toBe(word2)

    let text2 = FmtTextFactory.fromAnything([ `${word1} `, { type: FmtTextTokenType.TEXT, text: word2}])
    console.log(text2)
    expect(Array.isArray(text2)).toBe(true)
    expect(text2.length).toBe(3)
    expect(text2[0].getPlainText()).toBe(word1)
    expect(text2[1].getPlainText()).toBe(' ')
    expect(text2[1].type).toBe(FmtTextTokenType.GLUE)
    expect(text2[2].getPlainText()).toBe(word2)
  })

})

