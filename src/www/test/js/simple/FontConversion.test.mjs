import { TextBoxFactory } from '../../../js/Typesetter2/TextBoxFactory.mjs'
import { FontConversions } from '../../../js/Typesetter2/FontConversions.mjs'
import { expect, test, testSuite } from '../../../js/SimpleUnitTest/SimpleUnitTest.mjs'
import { TextBox } from '../../../js/Typesetter2/TextBox.mjs'
import { Glue } from '../../../js/Typesetter2/Glue.mjs'
import { Penalty } from '../../../js/Typesetter2/Penalty.mjs'
import { ItemList } from '../../../js/Typesetter2/ItemList.mjs'

const emptyFontConversionsDef = []
const multipleFontConvDef =[
   {
      from: { fontFamily: 'FreeStuff'}, to: {fontFamily: 'OtherStuff'}
   },
   {
      from: { fontStyle: 'italic'}, to: {fontFamily: 'MyItalic', fontStyle: ''}
   }
  ]

testSuite('FontConversion', () =>{
   test('Non TextBox', () => {
      let items = [ new Glue(), new Penalty(), new ItemList()]
      items.forEach( (item) => {
         expect(FontConversions.applyFontConversions(item, multipleFontConvDef), `Item ${item.constructor.name}`).toBe(item)
      })
   })

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
      const testFont = 'TestFont'
      const fakeBoldFont = 'BoldFont'

      // A matching item
      let item = TextBoxFactory.simpleText('test', { fontFamily: testFont, fontWeight: 'bold'})
      let fontConvDef = { from: {fontWeight: 'bold'}, to: { fontFamily: fakeBoldFont, fontWeight: ''}}
      let fontStyle = item.getFontStyle()
      let defArray = arrayCopy(multipleFontConvDef)
      defArray.push(fontConvDef)
      let convertedItem = FontConversions.applyFontConversions(item, defArray)
      expect(convertedItem).toBeInstanceOf(TextBox)
      expect(convertedItem.text).toBeAStringEqualTo(item.text)
      expect(convertedItem.getFontFamily()).toBeAStringEqualTo(fakeBoldFont)
      expect(convertedItem.getFontWeight()).toBeAStringEqualTo('')
      expect(convertedItem.getFontStyle()).toBeAStringEqualTo(fontStyle)

      // an item that does not match!
      let item2 = TextBoxFactory.simpleText('test', { fontFamily: testFont, fontWeight: ''})
      let convertedItem2 = FontConversions.applyFontConversions(item2, [ fontConvDef])
      expect(convertedItem2.text).toBeAStringEqualTo(item.text)
      expect(convertedItem2.getFontFamily()).toBeAStringEqualTo(testFont)
      expect(convertedItem2.getFontWeight()).toBeAStringEqualTo('')
      expect(convertedItem2.getFontStyle()).toBeAStringEqualTo(fontStyle)
   })

   test( 'Arabic Text', () => {
      let arabicFont = 'MyArabicFont'
      let fontConvDef = { from: {script: 'ar'}, to: { fontFamily: arabicFont}}
      let defArray = arrayCopy(multipleFontConvDef)
      defArray.push(fontConvDef)

      let arabicItem = TextBoxFactory.simpleText('يشسي.', {fontWeight: 'bold'})
      let text = arabicItem.getText()
      let convertedItem = FontConversions.applyFontConversions(arabicItem, defArray)
      expect(convertedItem.getText()).toBeAStringEqualTo(text)
      expect(convertedItem.getFontFamily()).toBeAStringEqualTo(arabicFont)
      expect(convertedItem.getFontWeight()).toBeAStringEqualTo('bold')

      let nonArabicItem = TextBoxFactory.simpleText('latinus')
      text = nonArabicItem.getText()
      let font = nonArabicItem.getFontFamily()
      let weight = nonArabicItem.getFontWeight()
      convertedItem = FontConversions.applyFontConversions(nonArabicItem, defArray)
      expect(convertedItem.getText()).toBeAStringEqualTo(text)
      expect(convertedItem.getFontFamily()).toBeAStringEqualTo(font)
      expect(convertedItem.getFontWeight()).toBeAStringEqualTo(weight)


      nonArabicItem = TextBoxFactory.simpleText('latيشسيبinus')
      text = nonArabicItem.getText()
      font = nonArabicItem.getFontFamily()
      weight = nonArabicItem.getFontWeight()
      convertedItem = FontConversions.applyFontConversions(nonArabicItem, defArray)
      expect(convertedItem.getText()).toBeAStringEqualTo(text)
      expect(convertedItem.getFontFamily()).toBeAStringEqualTo(font)
      expect(convertedItem.getFontWeight()).toBeAStringEqualTo(weight)

   })
})


function arrayCopy(array) {
   let newArray = []
   array.forEach( (e) => { newArray.push(e)})
   return newArray
}