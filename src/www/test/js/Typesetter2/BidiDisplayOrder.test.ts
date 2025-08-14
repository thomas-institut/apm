import {BidiDisplayOrder, IntrinsicTextDirection} from '@/lib/Typesetter2/Bidi/BidiDisplayOrder'
import { isAllUpperCase, isWhiteSpace } from '@/toolbox/Util'
import { describe, test, expect } from 'vitest'
import {BidiOrderInfo} from "@/lib/Typesetter2/Bidi/BidiOrderInfo";


interface TestCase {
  context: string,
  testItems: string[],
  defaultTextDirection: "" | "rtl" | "ltr",
  expectedOrder: number[],
  expectedDirections: ("ltr" | "rtl")[]
}
describe('Bidi Display Order', () => {
  test('Unidirectional Strings', () => {
    let testCases: TestCase[] = [
      {
        context:' Simple LTR text',
        testItems:  [ 'This', ' ', 'is', ' ', 'a', ' ', 'test', ' '],
        defaultTextDirection: 'ltr',
        expectedOrder: [...Array(8).keys()],
        expectedDirections: Array(8).fill('ltr')
      },
      {
        context: 'Simple RTL text',
        testItems:  [ 'THIS', ' ', 'IS', ' ', 'A', ' ', 'TEST', ' '],
        defaultTextDirection: 'rtl',
        expectedOrder: [...Array(8).keys()],
        expectedDirections: Array(8).fill('rtl')
      }
    ]

    doTestCases(testCases, getStringTextDirectionCapsFake )
  })

  test('Bidirectional Strings', () => {

    let testCases: TestCase[] = [
      {
        context:'Bidi text mostly LTR',
        testItems: [ 'New', ' ', 'car', ' ', 'is', ' ', 'SAYYYARA', ' ', 'YADIDA', ' ', 'in', ' ', 'Arabic'],
        defaultTextDirection: 'ltr',
        expectedOrder: [ 0, 1, 2, 3, 4, 5, 8, 7, 6, 9, 10, 11, 12],
        expectedDirections: [ 'ltr', 'ltr','ltr','ltr','ltr', 'ltr', 'rtl','rtl','rtl','ltr','ltr','ltr', 'ltr']
      },
      {
        context:'Bidi text mostly LTR with numbers',
        testItems:[ 'a', ' ', '1980', ' ', 'new', ' ', 'car', ' ', 'is', ' ', 'AL-SAYYYARA', ' ', 'AL-YADIDA', ' ', '1980', ' ', 'in', ' ', 'Arabic'],
        defaultTextDirection: '',
        expectedOrder: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,  14, 13, 12, 11, 10, 15, 16, 17, 18],
        expectedDirections: [ 'ltr', 'ltr','ltr','ltr','ltr', 'ltr', 'ltr','ltr','ltr','ltr','rtl','rtl','rtl', 'rtl', 'rtl','ltr','ltr','ltr', 'ltr']
      },
      {
        context:'Bidi text mostly RTL with numbers',
        testItems: [ 'A', ' ', '1980', ' ', 'NEW', ' ', 'CAR', ' ', 'IS', ' ', 'sayyara', ' ', 'yadida', ' ', '1980', ' ', 'IN', ' ', 'ARABIC'],
        defaultTextDirection: '',
        expectedOrder: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 13, 12, 11, 10, 15, 16, 17, 18, 19],
        expectedDirections: [ 'rtl', 'rtl','rtl','rtl','rtl','rtl','rtl','rtl','rtl','rtl','ltr','ltr','ltr','ltr','ltr','rtl','rtl','rtl','rtl', 'rtl']
      }
    ]
    doTestCases(testCases, getStringTextDirectionCapsFake)
  })

  test('Strings with punctuation', () => {
    let testCases: TestCase[] = [
      {
        context: 'Bidi text with punctuation',
        testItems: [ 'the', ' ', 'car', 'SAYYARA', ' ', 'YADIDA', ';', ' ', 'and', ' ', 'more'],
        defaultTextDirection: 'ltr',
        expectedOrder:      [ 0,      1,     2,     5,     4,    3,      6, 7, 8, 9, 10],
        expectedDirections: [ 'ltr', 'ltr', 'ltr', 'rtl', 'rtl', 'rtl', 'ltr', 'ltr', 'ltr', 'ltr', 'ltr']
      },
      {
        context: 'Bidi text with punctuation and numbers',
        testItems:          [ 'the', ' ',   'car', 'SAYYARA',  ' ',  'YADIDA', ' ',    '1980', ';',    ' ', 'and', ' ', 'more'],
        defaultTextDirection: 'ltr',
        expectedOrder:      [  0,     1,     2,     7,          6,     5,       4,      3,      8,      9,     10, 11, 12],
        expectedDirections: [ 'ltr', 'ltr', 'ltr', 'rtl',      'rtl', 'rtl',    'rtl',  'rtl',  'ltr', 'ltr', 'ltr', 'ltr', 'ltr']
      }
    ]
    doTestCases(testCases, getStringTextDirectionCapsFake)
  })

  test('Strings with brackets', () => {
    let testCases: TestCase[] = [
      {
        context: 'Bidi text with brackets LTR (simple)',
        testItems: [ 'the', ' ', '(', 'car', ',', ' ', 'SAYYARA', ')', ' ', 'and', ' ', 'more'],
        defaultTextDirection: 'ltr',
        expectedOrder:      [ 0,      1,     2,     3,     4,    5,      6, 7, 8, 9, 10, 11],
        expectedDirections: [ 'ltr', 'ltr', 'ltr', 'ltr', 'ltr', 'ltr', 'rtl', 'ltr', 'ltr', 'ltr', 'ltr', 'ltr']
      },
      {
        context: 'Bidi text with brackets RTL (simple)',
        testItems: [ 'THE', ' ', '(', 'CAR', ',', ' ', 'sayyara', ')', ' ', 'AND', ' ', 'MORE'],
        defaultTextDirection: 'rtl',
        expectedOrder:      [ 0,      1,     2,     3,     4,    5,      6, 7, 8, 9, 10, 11],
        expectedDirections: [ 'rtl', 'rtl', 'rtl', 'rtl', 'rtl', 'rtl', 'ltr', 'rtl', 'rtl', 'rtl', 'rtl', 'rtl']
      },
      {
        context: 'Bidi text with brackets LTR ',
        testItems: [ 'the', ' ', '(', 'car', ',', ' ', 'SAYYARA', ' ', 'YADIDA', ')', ' ', 'and', ' ', 'more'],
        defaultTextDirection: 'ltr',
        expectedOrder:      [ 0,      1,     2,     3,     4,     5,     8,     7,     6,     9, 10, 11, 12, 13],
        expectedDirections: [ 'ltr', 'ltr', 'ltr', 'ltr', 'ltr', 'ltr', 'rtl', 'rtl', 'rtl', 'ltr', 'ltr', 'ltr', 'ltr', 'ltr']
      },
      {
        context: 'Bidi text with brackets RTL ',
        testItems: [ 'THE', ' ', '(', 'CAR', ',', ' ', 'sayyara', ' ', 'yadida', ')', ' ', 'AND', ' ', 'MORE'],
        defaultTextDirection: 'rtl',
        expectedOrder:      [ 0,      1,     2,     3,     4,     5,     8,     7,     6,     9, 10, 11, 12, 13],
        expectedDirections: [ 'rtl', 'rtl', 'rtl', 'rtl', 'rtl', 'rtl', 'ltr', 'ltr', 'ltr', 'rtl', 'rtl', 'rtl', 'rtl', 'rtl']
      },
    ]
    doTestCases(testCases, getStringTextDirectionCapsFake)
  })
})

function doTestCases(testCaseArray: TestCase[], getItemIntrinsicTextDirection: (s: string) => IntrinsicTextDirection) {
  testCaseArray.forEach( (testCase) => {
    let result = BidiDisplayOrder.getDisplayOrder(testCase.testItems, testCase.defaultTextDirection, getItemIntrinsicTextDirection )
    expect(result, testCase.context).toHaveLength(testCase.testItems.length)
    expectResults(testCase.context, result, testCase.expectedOrder, testCase.expectedDirections)
  })

}

function expectResults(context: string, result: BidiOrderInfo[], expectedOrder: number[], expectedDirections: string[] ) {
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
function getStringTextDirectionCapsFake( someString: string) : IntrinsicTextDirection {
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
  // anything else, e.g. punctuation
  return ''
}