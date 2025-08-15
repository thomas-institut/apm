import { Glue } from '@/lib/Typesetter2/Glue'
import { Penalty } from '@/lib/Typesetter2/Penalty'
import { ItemList } from '@/lib/Typesetter2/ItemList'
import {FontConversionDefinition, FontConversions} from '@/lib/Typesetter2/FontConversions'
import { TextBox } from '@/lib/Typesetter2/TextBox'
import { TextBoxFactory } from '@/lib/Typesetter2/TextBoxFactory'
import { describe, test, expect } from 'vitest'

const emptyFontConversionsDef: FontConversionDefinition[] = []
const multipleFontConvDef: FontConversionDefinition[] =[
  {
    from: { fontFamily: 'FreeStuff'}, to: {fontFamily: 'OtherStuff'}
  },
  {
    from: { fontStyle: 'italic'}, to: {fontFamily: 'MyItalic', fontStyle: ''}
  }
]

describe('FontConversion', () =>{
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
    expect(convertedItem.getText()).toBe(item.getText())
    expect(convertedItem.getFontFamily()).toBe(fontFamily)
    expect(convertedItem.getFontWeight()).toBe(fontWeight)
    expect(convertedItem.getFontStyle()).toBe(fontStyle)
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
    expect(convertedItem.getText()).toBe(item.getText())
    expect(convertedItem.getFontFamily()).toBe(fakeBoldFont)
    expect(convertedItem.getFontWeight()).toBe('')
    expect(convertedItem.getFontStyle()).toBe(fontStyle)

    // an item that does not match!
    let item2 = TextBoxFactory.simpleText('test', { fontFamily: testFont, fontWeight: ''})
    let convertedItem2 = FontConversions.applyFontConversions(item2, [ fontConvDef])
    expect(convertedItem2.getText()).toBe(item.getText())
    expect(convertedItem2.getFontFamily()).toBe(testFont)
    expect(convertedItem2.getFontWeight()).toBe('')
    expect(convertedItem2.getFontStyle()).toBe(fontStyle)
  })

  test( 'Arabic Text', () => {
    let arabicFont = 'MyArabicFont'
    let fontConvDef = { from: {script: 'ar'}, to: { fontFamily: arabicFont}}
    let defArray = arrayCopy(multipleFontConvDef)
    defArray.push(fontConvDef)

    let arabicItem = TextBoxFactory.simpleText('يشسي.', {fontWeight: 'bold'})
    let text = arabicItem.getText()
    let convertedItem = FontConversions.applyFontConversions(arabicItem, defArray)
    expect(convertedItem.getText()).toBe(text)
    expect(convertedItem.getFontFamily()).toBe(arabicFont)
    expect(convertedItem.getFontWeight()).toBe('bold')

    let nonArabicItem = TextBoxFactory.simpleText('latinus')
    text = nonArabicItem.getText()
    let font = nonArabicItem.getFontFamily()
    let weight = nonArabicItem.getFontWeight()
    convertedItem = FontConversions.applyFontConversions(nonArabicItem, defArray)
    expect(convertedItem.getText()).toBe(text)
    expect(convertedItem.getFontFamily()).toBe(font)
    expect(convertedItem.getFontWeight()).toBe(weight)


    nonArabicItem = TextBoxFactory.simpleText('latيشسيبinus')
    text = nonArabicItem.getText()
    font = nonArabicItem.getFontFamily()
    weight = nonArabicItem.getFontWeight()
    convertedItem = FontConversions.applyFontConversions(nonArabicItem, defArray)
    expect(convertedItem.getText()).toBe(text)
    expect(convertedItem.getFontFamily()).toBe(font)
    expect(convertedItem.getFontWeight()).toBe(weight)

  })
})


function arrayCopy(array: any[]) {
  let newArray: any[] = []
  array.forEach( (e) => { newArray.push(e)})
  return newArray
}