import {TypesetterItem} from "./TypesetterItem.js";
import {TextBoxFactory} from "@/lib/Typesetter/TextBoxFactory";
import {Glue} from "@/lib/Typesetter/Glue";


/**
 * Creates an item array from a string converting all words into text boxes
 * and all spaces into Glue
 */
export function createItemArrayFromString(str: string, spaceWidth: number = 12): TypesetterItem[] {

  const words = str.split(' ');
  const itemArray: TypesetterItem[] = [];

  for(let i = 0; i < words.length; i++) {
    itemArray.push(TextBoxFactory.simpleText(words[i]));
    if (i < words.length - 1) {
      itemArray.push(new Glue(spaceWidth))
    }
  }
  return itemArray;
}