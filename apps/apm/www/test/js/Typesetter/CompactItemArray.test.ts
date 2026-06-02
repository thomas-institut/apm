import {describe, expect, it} from "vitest";
import {getFakeBidiOrder, getFakeItemArrayWithBidiInfoFromString} from "./FakeStringTextDirection";
import {compactItemArray} from "@/lib/Typesetter/Compactor/CompactItemArray";
import {TextBox} from "@/lib/Typesetter/TextBox";
import {MergedItem, SourceItems} from "@/lib/Typesetter/MetadataKey";
import {ObjectFactory} from "@/lib/Typesetter/ObjectFactory";
import {TypesetterItem} from "@/lib/Typesetter/TypesetterItem";
import {createItemArrayFromString} from "@/lib/Typesetter/ItemArrayFromString";
import {ItemArrayWithBidiOrderInfo} from "@/lib/Typesetter/LineBreaker/FirstFitLineBreaker";

interface CompactTestCaseData {
  testStrings: string[];
  expectedTextBoxes: string[];
}

describe('Compact Item Array', () => {
  it('should compact text', () => {
    const TestCases: CompactTestCaseData[] = [
      {testStrings: ['A simple string', '.', '.'], expectedTextBoxes: ['A', 'simple', 'string..']},
    ];

    TestCases.forEach(tc => {
      const {testStrings, expectedTextBoxes} = tc;
      const itemArray: TypesetterItem[] =[];
      testStrings.forEach(testString => {
        itemArray.push(...createItemArrayFromString(testString));
      })
      const info:ItemArrayWithBidiOrderInfo = {itemArray, bidiOrderInfoArray: getFakeBidiOrder(itemArray, 'ltr')};
      const compacted = compactItemArray(info);
      const textArray = compacted.itemArray
      .filter(item => item instanceof TextBox)
      .map(tb => tb.getText());
      expect(textArray).toEqual(expectedTextBoxes);
      // check that source items are all non-merged items
      compacted.itemArray.forEach(item => {
        if (item.hasMetadata(MergedItem)) {
          const sourceItems = (item.getMetadata(SourceItems) as object[])
          .map(si  => ObjectFactory.fromObject(si))
          .map(si => expect(si.hasMetadata(MergedItem)).toBe(false));
        }
      });
    });
  });

  it('should preserve metadata in source items', () => {
    const TestStrings = ['This is', 'a test string', 'with metadata'];
    const TestMetadataKey = 'MyData';
    let itemArray: TypesetterItem[] = [];
    TestStrings.forEach(testString => {
      itemArray.push(...createItemArrayFromString(testString));
    })

    itemArray = itemArray.map((item, index) => {
      item.addMetadata(TestMetadataKey, index);
      return item;
    });
    const info: ItemArrayWithBidiOrderInfo = { itemArray: itemArray, bidiOrderInfoArray: getFakeBidiOrder(itemArray, 'ltr')};

    const compacted = compactItemArray(info);

    compacted.itemArray.forEach( (item, index) => {
      if (item.hasMetadata(MergedItem)) {
        // expect(item.hasMetadata(TestMetadataKey)).toBe(false);
        (item.getMetadata(SourceItems) as object[]).map( si => ObjectFactory.fromObject(si) ).forEach( si => {
          expect(si.hasMetadata(TestMetadataKey)).toBe(true);
        })
      } else {
        expect(item.hasMetadata(TestMetadataKey)).toBe(true);
      }
    })
  })
});