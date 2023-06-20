import { TextBoxFactory } from '../../../js/Typesetter2/TextBoxFactory.mjs'
import { FontConversions } from '../../../js/Typesetter2/FontConversions.mjs'
import { expect, test, testSuite } from '../../../js/SimpleUnitTest/SimpleUnitTest.mjs'
import { TextBox } from '../../../js/Typesetter2/TextBox.mjs'

const emptyFontConversionsDef = []

testSuite('Font Conversion Test', () =>{
   test('Empty Match', () => {
      let item = TextBoxFactory.simpleText('test')
      let fontFamily = item.getFontFamily()
      let fontWeight = item.getFontWeight()
      let fontStyle = item.getFontStyle()
      let convertedItem = FontConversions.applyFontConversions(item, emptyFontConversionsDef)
      expect(convertedItem).toBeInstanceOf(TextBox)
      expect(convertedItem.text).toBeAStringEqualTo(item.text)
      expect(convertedItem.getFontFamily()).toBeAStringEqualTo(fontFamily)
      expect(convertedItem.getFontWeight()).toBeAStringEqualTo(fontWeight)
      expect(convertedItem.getFontStyle()).toBeAStringEqualTo(fontStyle)
   })

   test('Bold Match', ()=>{
      let item = TextBoxFactory.simpleText('test', { fontWeight: 'bold'})
      const fakeFontFamily = 'FakeFont'
      let fontConvDef = { from: {fontWeight: 'bold'}, to: { fontFamily: fakeFontFamily, fontWeight: ''}}
      let fontStyle = item.getFontStyle()
      let convertedItem = FontConversions.applyFontConversions(item, [ fontConvDef])
      expect(convertedItem).toBeInstanceOf(TextBox)
      expect(convertedItem.text).toBeAStringEqualTo(item.text)
      expect(convertedItem.getFontFamily()).toBeAStringEqualTo(fakeFontFamily)
      expect(convertedItem.getFontWeight()).toBeAStringEqualTo('')
      expect(convertedItem.getFontStyle()).toBeAStringEqualTo(fontStyle)
   })
})
