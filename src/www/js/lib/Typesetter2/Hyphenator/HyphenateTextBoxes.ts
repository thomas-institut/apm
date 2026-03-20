// noinspection ES6PreferShortImport

import {ItemArrayWithBidiOrderInfo} from "../LineBreaker/FirstFitLineBreaker.js";
import {TypesetterItem} from "../TypesetterItem.js";
import {BidiOrderInfo} from "../Bidi/BidiOrderInfo.js";
import {TextBox} from "../TextBox.js";
import {hyphenate} from "../Hyphenator/Hyphenator.js";
import {TextBoxFactory} from "../TextBoxFactory.js";
import {deepCopy} from "../../../toolbox/Util.js";
import * as MetadataKey from '../MetadataKey.js';
import {GoodPointForBreak, Penalty} from "../Penalty.js";
import {ObjectFactory} from "@/lib/Typesetter2/ObjectFactory";

interface HyphenationNode {
  itemIndex: number;
  originalItem: TypesetterItem;
  originalBidiOrderInfo: BidiOrderInfo;
  hyphenatedItems: TypesetterItem[];
}

export function hyphenateTextBoxes(itemArrayWithBidiInfo: ItemArrayWithBidiOrderInfo, manualEntries: string[] = [], exceptions: string[] = []): ItemArrayWithBidiOrderInfo {
  const debug = true;
  const {itemArray, bidiOrderInfoArray} = itemArrayWithBidiInfo;

  //  check if there is anything to hyphenate before doing anything
  let hyphenationNeeded = false;
  for(let i = 0; i < itemArray.length; i++) {
    const item = itemArray[i];
    if (item instanceof TextBox && item.getHyphenation() !== null) {
      hyphenationNeeded = true;
      break;
    }
  }
  if (!hyphenationNeeded) {
    // debug && console.log('No hyphenation needed');
    return itemArrayWithBidiInfo;
  }

  let hyphenationActuallyDone = false;

  // first, create a hyphenation tree
  const hyphenationTree: HyphenationNode[] = itemArray.map((item, itemIndex) => {
    const newItem = ObjectFactory.fromObject(item.getExportObject()) as TypesetterItem;
    newItem.addMetadata(MetadataKey.ItemIndexBeforeHyphenation, itemIndex);
    const defaultNode = {
      itemIndex: itemIndex,
      originalItem: item,
      originalBidiOrderInfo: bidiOrderInfoArray[itemIndex],
      hyphenatedItems: [newItem],
    };

    if (!(item instanceof TextBox)) {
      return defaultNode;
    }
    const itemHyphenation = item.getHyphenation();
    if (itemHyphenation === null) {
      return defaultNode;
    }

    // so, we need to hyphenate
    const syllables = hyphenate(item.getText(), itemHyphenation, manualEntries, exceptions);
    const numSyllables = syllables.length;
    if (numSyllables === 0) {
      console.error(`hyphenate() returned an empty array for ${item.getText()}`);
      return defaultNode;
    }
    if (numSyllables === 1) {
      return defaultNode;
    }
    // debug && console.log(`Hyphenating text box '${item.getText()}' with ${numSyllables} syllables`, syllables);
    hyphenationActuallyDone = true;
    const newItems: (TextBox | Penalty)[] = [];
    for (let syllableIndex = 0; syllableIndex < syllables.length; syllableIndex++) {
      const newTextBox = TextBoxFactory.clone(item);
      newTextBox.addMetadata(MetadataKey.SplitInSyllablesItem, true);
      newTextBox.addMetadata(MetadataKey.SyllableIndex, syllableIndex);
      newTextBox.addMetadata(MetadataKey.SyllableCount, numSyllables);
      newTextBox.addMetadata(MetadataKey.OriginalText, syllables[syllableIndex]);
      newTextBox.addMetadata(MetadataKey.ItemIndexBeforeHyphenation, itemIndex);
      newTextBox.setText(syllables[syllableIndex]);
      newItems.push(newTextBox);
      if (syllableIndex < numSyllables - 1) {
        const hyphenPenalty = createHyphenPenalty();
        hyphenPenalty.addMetadata(MetadataKey.ItemIndexBeforeHyphenation, itemIndex);
        hyphenPenalty.addMetadata(MetadataKey.SyllableIndex, syllableIndex);
        hyphenPenalty.addMetadata(MetadataKey.SyllableCount, numSyllables);
        newItems.push(hyphenPenalty);
      }
    }
    defaultNode.hyphenatedItems = newItems;
    return defaultNode;
  });

  // if no hyphenation was actually done, return the original item array
  if (!hyphenationActuallyDone) {
    // debug && console.log('No hyphenation actually done');
    return itemArrayWithBidiInfo;
  }

  // then, create the item array by traversing the tree in the order of the original array
  // capture the new start index of the hyphenated items
  const newItemArray: TypesetterItem[] = [];
  const newIndices: number[] = [];
  let currentIndex = 0;
  hyphenationTree.forEach((node) => {
    newIndices.push(currentIndex);
    node.hyphenatedItems.forEach((item) => {
      newItemArray.push(item);
      currentIndex++;
    });
  });

  // finally, create the bidi order info array by traversing the tree in the bidi order
  let currentDisplayOrder = 0;
  const hyphenatedBidiOrderInfoArray: BidiOrderInfo[] = [];
  const displayOrder = bidiOrderInfoArray.map( info => info.displayOrder);
  displayOrder.forEach((_displayOrder, nodeIndex) => {
    const node = hyphenationTree[nodeIndex];
    node.hyphenatedItems.forEach((_nodeItem, nodeItemIndex) => {
      const newBidiOrderInfo = deepCopy(node.originalBidiOrderInfo);
      newBidiOrderInfo.displayOrder = currentDisplayOrder;
      newBidiOrderInfo.inputIndex = newIndices[nodeIndex] + nodeItemIndex;
      hyphenatedBidiOrderInfoArray.push(newBidiOrderInfo);
      currentDisplayOrder++;
    })
  });
  const orderedBidiOrderInfoArray = hyphenatedBidiOrderInfoArray.sort((a, b) => a.inputIndex - b.inputIndex);

  return {itemArray: newItemArray, bidiOrderInfoArray: orderedBidiOrderInfoArray};
}

function createHyphenPenalty(): Penalty {
  return (new Penalty()).setPenalty(GoodPointForBreak).setItemToInsert(TextBoxFactory.simpleText('-'));
}