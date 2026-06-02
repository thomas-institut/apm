// noinspection ES6PreferShortImport

import {BidiOrderInfoArray} from "../Bidi/BidiOrderInfoArray.js";
import {TypesetterItem} from "../TypesetterItem.js";
import {BidiOrderInfo} from "../Bidi/BidiOrderInfo.js";
import {TextBox} from "../TextBox.js";
import {ObjectFactory} from "../ObjectFactory.js";
import * as MetadataKey from "../MetadataKey.js";
import {ItemArrayWithBidiOrderInfo} from "../LineBreaker/FirstFitLineBreaker.js";


const debug = false;

/**
 * Compacts an item array by doing all possible merges of text boxes with the
 * same formatting and text direction.
 */
export function compactItemArray(itemArrayWithBidiOrderInfo: ItemArrayWithBidiOrderInfo): ItemArrayWithBidiOrderInfo {
  let {itemArray, bidiOrderInfoArray} = itemArrayWithBidiOrderInfo;
  if (itemArray.length === 0) {
    return {itemArray: [], bidiOrderInfoArray: []};
  }

  if (itemArray.length === 1) {
    // this means that there was only 1 item in the item array
    return {itemArray: itemArray, bidiOrderInfoArray: bidiOrderInfoArray};
  }
  debug && console.log(`Compacting item array`);
  debug && console.log(`Original bidiOrder`);
  debug && console.log(bidiOrderInfoArray);
  let levelInfoArray = BidiOrderInfoArray.getLevelInfoFromBidiOrderInfoArray(bidiOrderInfoArray);
  let defaultTextDirection = BidiOrderInfoArray.detectDefaultTextDirectionFromLevelInfoArray(levelInfoArray, bidiOrderInfoArray);

  debug && console.log(`Default text direction is '${defaultTextDirection}'`);
  let newItemArray: TypesetterItem[] = [];
  let newBidiOrderInfoArray: BidiOrderInfo[] = [];
  let lastIndex = -1;
  levelInfoArray.forEach((levelInfo, index) => {
    debug && console.log(`Processing level info ${index}`);
    debug && console.log(levelInfo);
    let levelItemArray = [];
    for (let i = levelInfo.start; i <= levelInfo.end; i++) {
      levelItemArray.push(itemArray[i]);
    }
    let compactedLevelRun = compactLevelItemArray(levelItemArray);
    debug && console.log(`Original level run has ${levelItemArray.length} items, compacted has ${compactedLevelRun.length}`);
    newItemArray.push(...compactedLevelRun);
    let newLevelStartIndex = lastIndex + 1;
    let newLevelEndIndex = lastIndex + compactedLevelRun.length;

    for (let i = 0; i < compactedLevelRun.length; i++) {
      let newBidiOrderInfo: BidiOrderInfo = {
        inputIndex: -1, displayOrder: -1, intrinsicTextDirection: '', textDirection: '', embeddingLevel: -1
      };
      newBidiOrderInfo.textDirection = levelInfo.textDirection;
      newBidiOrderInfo.inputIndex = newLevelStartIndex + i;
      newBidiOrderInfo.embeddingLevel = levelInfo.level;
      if (levelInfo.textDirection === defaultTextDirection) {
        newBidiOrderInfo.displayOrder = newLevelStartIndex + i;
      } else {
        newBidiOrderInfo.displayOrder = newLevelEndIndex - i;
      }
      // note that intrinsicTextDirection is not set in the newBidiOrderInfo object
      // this should not be a problem because that information is not needed for display
      newBidiOrderInfoArray.push(newBidiOrderInfo);
    }
    lastIndex = newLevelEndIndex;
  });
  debug && console.log(`New item array`);
  debug && console.log(newItemArray);
  return {itemArray: newItemArray, bidiOrderInfoArray: newBidiOrderInfoArray};
}

/**
 *
 * @param {TypesetterItem[]}itemArray
 * @return {*}
 */
function compactLevelItemArray(itemArray: TypesetterItem[]): TypesetterItem[] {
  return itemArray.reduce((currentArray: TypesetterItem[], item: TypesetterItem) => {
    if (currentArray.length === 0) {
      return [item];
    }
    let lastItem = currentArray.pop();
    if (lastItem === undefined) {
      throw new Error(`lastItem is undefined`);
    }
    let mergedArray = mergeItemWithNext(lastItem, item);
    currentArray.push(...mergedArray);
    return currentArray;
  }, []);
}

/**
 * Tries to merge an item with another item, for example,
 * two text boxes with the same font descriptions.
 *
 * Returns an array of items with 1 item if there was
 * a merge or with 2 item if no merge was possible
 * @param {TypesetterItem}item
 * @param {TypesetterItem}nextItem
 * @return {TypesetterItem[]}
 * @private
 */
function mergeItemWithNext(item: TypesetterItem, nextItem: TypesetterItem): TypesetterItem[] {
  if (item.constructor.name !== nextItem.constructor.name) {
    // no merge possible between two items of different class
    //debug && console.log(`Cannot merge ${item.constructor.name} with ${nextItem.constructor.name}`)
    return [item, nextItem];
  }
  // merging only text boxes for now
  if (item instanceof TextBox && nextItem instanceof TextBox) {
    // debug && console.log(`Trying to merge two text boxes: '${item.getText()}' + '${nextItem.getText()}'`)
    if (item.getFontFamily() !== nextItem.getFontFamily()) {
      // debug && console.log(`... not the same font family: '${item.getFontFamily()}' !== '${nextItem.getFontFamily()}'`)
      return [item, nextItem];
    }
    if (item.getFontSize() !== nextItem.getFontSize()) {
      // debug && console.log(`... not the same font size`)
      return [item, nextItem];
    }
    if (item.getFontWeight() !== nextItem.getFontWeight()) {
      // debug && console.log(`... not the same font weight`)
      return [item, nextItem];
    }
    if (item.getFontStyle() !== nextItem.getFontStyle()) {
      // debug && console.log(`... not the same font style`)
      return [item, nextItem];
    }
    if (item.getTextDirection() !== nextItem.getTextDirection()) {
      debug && console.log(`... not the same text direction`);
      return [item, nextItem];
    }
    // debug && console.log(`...font specs are equal, merging`)
    // creating a new object so that the original object is not changed
    let newItem = ObjectFactory.fromObject(item.getExportObject()) as TextBox;

    newItem.addMetadata(MetadataKey.MergedItem, true);
    newItem.setTextDirection(item.getTextDirection());
    newItem.setText(item.getText() + nextItem.getText());

    // Save source items in metadata:
    const sourceItems: object[] = [];
    if (item.getMetadata(MetadataKey.SourceItems) !== undefined) {
      const itemSourceItems = item.getMetadata(MetadataKey.SourceItems) as object[];
      sourceItems.push(...itemSourceItems);
    } else {
      sourceItems.push(item.getExportObject());
    }
    if (nextItem.getMetadata(MetadataKey.SourceItems) !== undefined) {
      const nextItemSourceItems = nextItem.getMetadata(MetadataKey.SourceItems) as object[];
      sourceItems.push(...nextItemSourceItems);
    } else {
      sourceItems.push(nextItem.getExportObject());
    }
    newItem.addMetadata(MetadataKey.SourceItems, sourceItems);

    return [newItem];
  }
  // other than text boxes
  return [item, nextItem];
}