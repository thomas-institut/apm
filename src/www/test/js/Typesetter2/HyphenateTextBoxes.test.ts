import {describe, expect, it} from "vitest";
import {hyphenateTextBoxes} from "@/lib/Typesetter2/Hyphenator/HyphenateTextBoxes";
import {createItemArrayFromString} from "@/lib/Typesetter2/ItemArrayFromString";
import {BidiDisplayOrder} from "@/lib/Typesetter2/Bidi/BidiDisplayOrder";
import {getFakeStringTextDirection} from "./FakeStringTextDirection";
import {TypesetterItem} from "@/lib/Typesetter2/TypesetterItem";
import {TextBox} from "@/lib/Typesetter2/TextBox";


describe('HyphenateTextBoxes', () => {
  it('should handle trivial cases', () => {
    expect(hyphenateTextBoxes({itemArray: [], bidiOrderInfoArray: []})).toEqual({
      itemArray: [], bidiOrderInfoArray: []
    });
  });

  it('should be transparent when no hyphenation is needed', () => {
    const TestString = 'This is a test string that should not be hyphenated.';
    const itemArray = createItemArrayFromString(TestString);
    const bidiOrderInfoArray = getBidiOrderInfoForItemArray(itemArray, 'ltr');
    expect(hyphenateTextBoxes({
      itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray
    })).toEqual({itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray});
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
    const bidiOrderInfoArray = getBidiOrderInfoForItemArray(itemArray, 'ltr');
    expect(hyphenateTextBoxes({
      itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray
    }, [], exceptions)).toEqual({itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray});
  });

  it('should not mess up text direction LTR text', () => {
    const TestString = 'This is simple ltr text';
    const manualEntries = ['sim-ple'];
    const itemArray = createItemArrayFromString(TestString).map(item => {
      if (item instanceof TextBox) {
        item.setHyphenation('custom');
      }
      return item;
    });
    const bidiOrderInfoArray = getBidiOrderInfoForItemArray(itemArray, 'ltr');
    const result = hyphenateTextBoxes({itemArray, bidiOrderInfoArray}, manualEntries);
    expect(result.itemArray.length).toEqual(itemArray.length + 2);
    expect(result.bidiOrderInfoArray.length).toEqual(bidiOrderInfoArray.length + 2);
    const displayOrder = result.bidiOrderInfoArray.map(info => info.displayOrder);
    const itemOrder = result.bidiOrderInfoArray.map(info => info.inputIndex);
    expect(displayOrder).toEqual(itemOrder);
  });

  it('should not mess up text direction RTL text', () => {
    const TestString = 'THIS very simple TEXT simple TEXT';
    const manualEntries = ['sim-ple', 've-ry'];
    const itemArray = createItemArrayFromString(TestString).map(item => {
      if (item instanceof TextBox) {
        item.setHyphenation('custom');
      }
      return item;
    });
    const bidiOrderInfoArray = getBidiOrderInfoForItemArray(itemArray, 'rtl');
    console.log(`Original bidiOrderInfoArray`, bidiOrderInfoArray);
    const result = hyphenateTextBoxes({itemArray, bidiOrderInfoArray}, manualEntries);
    expect(result.itemArray.length).toEqual(itemArray.length + 6);
    expect(result.bidiOrderInfoArray.length).toEqual(bidiOrderInfoArray.length + 6);
    const displayOrder = result.bidiOrderInfoArray.map(info => info.displayOrder);
    console.log(`Result bidiOrderInfoArray`, result.bidiOrderInfoArray);
    const itemOrder = result.bidiOrderInfoArray.map(info => info.inputIndex);
    expect(displayOrder).toEqual(itemOrder);
  });

});


function getBidiOrderInfoForItemArray(itemArray: TypesetterItem[], defaultTextDirection: string) {
  return BidiDisplayOrder.getDisplayOrder<TypesetterItem>(itemArray, defaultTextDirection, (item) => {
    if (!(item instanceof TextBox)) {
      return '';
    }
    return getFakeStringTextDirection(item.getText());
  });
}