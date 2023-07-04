import { expect, test, testSuite } from '../../../js/SimpleUnitTest/SimpleUnitTest.mjs'
import { isAllUpperCase, isWhiteSpace } from '../../../js/toolbox/Util.mjs'
import { BidiDisplayOrder } from '../../../js/Typesetter2/BidiDisplayOrder.mjs'


testSuite('Bidi Display Order', () => {
  test('Unidirectional Strings', () => {

    let testItems
    let result

    testItems = [ 'This', ' ', 'is', ' ', 'a', ' ', 'test', ' ']
    result = BidiDisplayOrder.getDisplayOrder(testItems, 'ltr', getStringTextDirectionCapsFake)
    expect(result, 'Simple LTR text').toBeOfLength(testItems.length)
    for (let i = 0; i < testItems.length; i++) {
      let resultItem = result[i]
      let context = `Simple RTL text, item ${i}`
      expect(resultItem.inputIndex,context ).toBe(i)
      expect(resultItem.textDirection,context).toBe('ltr')
    }

    testItems = [ 'THIS', ' ', 'IS', ' ', 'A', ' ', 'TEST', ' ']
    result = BidiDisplayOrder.getDisplayOrder(testItems, 'rtl', getStringTextDirectionCapsFake)
    expect(result, 'Simple RTL text').toBeOfLength(testItems.length)
    for (let i = 0; i < testItems.length; i++) {
      let resultItem = result[i]
      let context = `Simple RTL text, item ${i}`
      expect(resultItem.inputIndex,context ).toBe(i)
      expect(resultItem.textDirection,context).toBe('rtl')
    }
  })

  test('Bidirectional Strings', () => {
    let testItems
    let result
    let expectedOrder
    let expectedDirections
    let context


    context = 'Bidi text mostly LTR'
    testItems = [ 'New', ' ', 'car', ' ', 'is', ' ', 'SAYYYARA', ' ', 'YADIDA', ' ', 'in', ' ', 'Arabic']
    result = BidiDisplayOrder.getDisplayOrder(testItems, 'ltr', getStringTextDirectionCapsFake)
    expect(result, context).toBeOfLength(testItems.length)
    expectedOrder = [ 0, 1, 2, 3, 4, 5, 8, 7, 6, 9, 10, 11, 12]
    expectedDirections = [ 'ltr', 'ltr','ltr','ltr','ltr', 'ltr', 'rtl','rtl','rtl','ltr','ltr','ltr', 'ltr']
    expectResults(context, result, expectedOrder, expectedDirections)


    context = 'Bidi text mostly LTR with numbers'
    testItems = [ 'a', ' ', '1980', ' ', 'new', ' ', 'car', ' ', 'is', ' ', 'AL-SAYYYARA', ' ', 'AL-YADIDA', ' ', '1980', ' ', 'in', ' ', 'Arabic']
    result = BidiDisplayOrder.getDisplayOrder(testItems, '', getStringTextDirectionCapsFake)
    expect(result, context).toBeOfLength(testItems.length)
    expectedOrder = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,  14, 13, 12, 11, 10, 15, 16, 17, 18]
    expectedDirections = [ 'ltr', 'ltr','ltr','ltr','ltr', 'ltr', 'ltr','ltr','ltr','ltr','rtl','rtl','rtl', 'rtl', 'rtl','ltr','ltr','ltr', 'ltr']
    expectResults(context, result, expectedOrder, expectedDirections)

    context = 'Bidi text mostly RTL with numbers'
    testItems = [ 'A', ' ', '1980', ' ', 'NEW', ' ', 'CAR', ' ', 'IS', ' ', 'sayyara', ' ', 'yadida', ' ', '1980', ' ', 'IN', ' ', 'ARABIC']
    result = BidiDisplayOrder.getDisplayOrder(testItems, '', getStringTextDirectionCapsFake)
    expect(result, context).toBeOfLength(testItems.length)
    expectedOrder = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 13, 12, 11, 10, 15, 16, 17, 18, 19]
    expectedDirections = [ 'rtl', 'rtl','rtl','rtl','rtl','rtl','rtl','rtl','rtl','rtl','ltr','ltr','ltr','ltr','ltr','rtl','rtl','rtl','rtl', 'rtl']
    expectResults(context, result, expectedOrder, expectedDirections)
  })
})

function expectResults(context, result, expectedOrder, expectedDirections ) {
  for(let i = 0; i < result.length; i++) {
    let resultItem = result[i]
    let itemContext = `${context}, result item ${i}`
    expect(resultItem.inputIndex,itemContext).toBe(expectedOrder[i])
    expect(resultItem.textDirection,itemContext).toBe(expectedDirections[i])
  }

}

/**
 * Helper function: all caps text is RTL, anything that starts with number is European Number
 * @param someString
 */
function getStringTextDirectionCapsFake( someString) {
  if (isWhiteSpace(someString)) {
    return ''
  }
  if (/[0-9]/.test(someString.charAt(0))) {
    return 'en'
  }
  if (/^[A-Za-z]/.test(someString)) {
    if (isAllUpperCase(someString)) {
      return 'rtl'
    } else {
      return 'ltr'
    }
  }
  return ''
}