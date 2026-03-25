import {describe, expect, it} from "vitest";
import {hyphenateTextBoxes} from "@/lib/Typesetter2/Hyphenator/HyphenateTextBoxes";
import {createItemArrayFromString} from "@/lib/Typesetter2/ItemArrayFromString";
import {getFakeBidiOrder, getFakeItemArrayWithBidiInfoFromString} from "./FakeStringTextDirection";
import {TextBox} from "@/lib/Typesetter2/TextBox";
import {ItemArrayWithBidiOrderInfo} from "@/lib/Typesetter2/LineBreaker/FirstFitLineBreaker";
import {Glue} from "@/lib/Typesetter2/Glue";
import {isAllUpperCase} from "@/toolbox/Util";


describe('HyphenateTextBoxes', () => {
  it('should handle trivial cases', () => {


    expect(hyphenateTextBoxes({
      itemArrayWithBidiInfo: {itemArray: [], bidiOrderInfoArray: []}, hyphenationLanguages: []
    })).toEqual({
      itemArray: [], bidiOrderInfoArray: []
    });
  });

  it('should be transparent when no hyphenation is needed', () => {
    const TestString = 'This is a test string that should not be hyphenated.';
    const info = getFakeItemArrayWithBidiInfoFromString(TestString);
    expect(hyphenateTextBoxes({
      itemArrayWithBidiInfo: info, hyphenationLanguages: []
    })).toEqual({itemArray: info.itemArray, bidiOrderInfoArray: info.bidiOrderInfoArray});
  });

  it('should be transparent when no hyphenation is actually done', () => {
    const TestString = 'All the words in this string are exceptions from hyphenation';
    const exceptions = TestString.split(' ');
    const itemArray = createItemArrayFromString(TestString).map(item => {
      if (item instanceof TextBox) {
        item.setHyphenation('en');
      }
      return item;
    });
    const bidiOrderInfoArray = getFakeBidiOrder(itemArray, 'ltr');
    expect(hyphenateTextBoxes({
      itemArrayWithBidiInfo: {itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray},
      hyphenationLanguages: ['en'],
      exceptions: exceptions
    })).toEqual({itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray});
  });

  it('should not mess up text direction in LTR text', () => {
    const TestString = 'This is simple ltr text';
    const manualEntries = ['sim-ple'];
    const itemArray = createItemArrayFromString(TestString).map(item => {
      if (item instanceof TextBox) {
        item.setHyphenation('custom');
      }
      return item;
    });
    const bidiOrderInfoArray = getFakeBidiOrder(itemArray, 'ltr');
    const result = hyphenateTextBoxes({
      itemArrayWithBidiInfo: {itemArray, bidiOrderInfoArray},
      hyphenationLanguages: ['custom'],
      manualEntries: manualEntries
    });
    expect(result.itemArray.length).toEqual(itemArray.length + 2);
    expect(result.bidiOrderInfoArray.length).toEqual(bidiOrderInfoArray.length + 2);
    result.bidiOrderInfoArray.forEach((info) => {
      expect(info.displayOrder).toEqual(info.inputIndex);
    });
    expect(itemArrayWithBidiOrderInfoToString(result)).toEqual('This is sim-ple ltr text');
  });

  it('should not mess up text direction in RTL text', () => {
    const TestString = 'THIS IS VERY SIMPLE RTL TEXT';
    const manualEntries = ['sim-ple', 've-ry'];
    const itemArray = createItemArrayFromString(TestString).map(item => {
      if (item instanceof TextBox) {
        item.setHyphenation('custom');
      }
      return item;
    });
    const bidiOrderInfoArray = getFakeBidiOrder(itemArray, 'rtl');
    const result = hyphenateTextBoxes({
      itemArrayWithBidiInfo: {itemArray, bidiOrderInfoArray},
      hyphenationLanguages: ['custom'],
      manualEntries: manualEntries
    });
    expect(result.itemArray.length).toEqual(itemArray.length + 4);
    expect(result.bidiOrderInfoArray.length).toEqual(bidiOrderInfoArray.length + 4);
    result.bidiOrderInfoArray.forEach((info) => {
      expect(info.displayOrder).toEqual(info.inputIndex);
    });
    expect(itemArrayWithBidiOrderInfoToString(result)).toEqual('THIS IS VE-RY SIM-PLE RTL TEXT');
  });

  it('should not mess up text direction in mixed text', () => {
    const TestCases= [
      { testString: 'one TWO THREE', manualEntries: ['o-ne'], expected: 'o-ne THREE TWO' },
      { testString: 'one TWO THREE FOUR one two ONE TWO', manualEntries: ['o-ne'], expected: 'o-ne FOUR THREE TWO o-ne two TWO ONE' },
    ]

    TestCases.forEach(testCase => {
      const testString = testCase.testString;
      const manualEntries = testCase.manualEntries;
      const expected = testCase.expected;
      const itemArray = createItemArrayFromString(testString).map(item => {
        if (item instanceof TextBox && !isAllUpperCase(item.getText())) {
          item.setHyphenation('custom');
        }
        return item;
      });
      const bidiOrderInfoArray = getFakeBidiOrder(itemArray, 'ltr');
      const result = hyphenateTextBoxes({
        itemArrayWithBidiInfo: {itemArray, bidiOrderInfoArray},
        hyphenationLanguages: ['custom'],
        manualEntries: manualEntries
      });
      expect(itemArrayWithBidiOrderInfoToString(result)).toEqual(expected);

    })


  });

  it('should support multiple hyphenation languages', () => {
    const LatinWords = [ 'dominus', 'res', 'gloria'];
    const TestString = 'Latin and English mixed Dominus ONE TWO THREE and res without Gloria';
    const itemArray = createItemArrayFromString(TestString).map(item => {
      if (item instanceof TextBox && !isAllUpperCase(item.getText())) {
        if (LatinWords.includes(item.getText().toLowerCase())) {
          item.setHyphenation('la');
        } else {
          item.setHyphenation('en');
        }
      }
      return item;
    });
    const bidiOrderInfoArray = getFakeBidiOrder(itemArray, 'ltr');
    expect(itemArrayWithBidiOrderInfoToString({itemArray, bidiOrderInfoArray}))
    .toEqual('Latin and English mixed Dominus THREE TWO ONE and res without Gloria');
    const result = hyphenateTextBoxes({
      itemArrayWithBidiInfo: {itemArray, bidiOrderInfoArray},
      hyphenationLanguages: ['en', 'la'],
    });
    expect(itemArrayWithBidiOrderInfoToString(result))
    .toEqual('Latin and Eng-lish mixed Do-mi-nus THREE TWO ONE and res with-out Glo-ria');
  })

});

/**
 * Prints a string representation of an ItemArrayWithBidiOrderInfo using the display order
 * Penalties are shown as hyphens and glue as single spaces
 * @param itemArrayWithBidiOrderInfo
 */
function itemArrayWithBidiOrderInfoToString(itemArrayWithBidiOrderInfo: ItemArrayWithBidiOrderInfo): string {
  return itemArrayWithBidiOrderInfo.bidiOrderInfoArray
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((info) => {
    const item = itemArrayWithBidiOrderInfo.itemArray[info.inputIndex];
    if (item instanceof TextBox) {
      return item.getText();
    }

    if (item instanceof Glue) {
      return ' ';
    }
    return '-';
  }).join('');
}

