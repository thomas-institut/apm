import {BidiDisplayOrder, IntrinsicTextDirection} from "@/lib/Typesetter2/Bidi/BidiDisplayOrder";
import {isAllUpperCase, isWhiteSpace} from "@/toolbox/Util";
import {TypesetterItem} from "@/lib/Typesetter2/TypesetterItem";
import {TextBox} from "@/lib/Typesetter2/TextBox";
import {ItemArrayWithBidiOrderInfo} from "@/lib/Typesetter2/LineBreaker/FirstFitLineBreaker";
import {createItemArrayFromString} from "@/lib/Typesetter2/ItemArrayFromString";


/**
 * Returns a fake text direction for the given string:
 * - if the string is empty, returns ''
 * - if the string is a number, returns 'en'
 * - if the string is all uppercase, returns 'rtl'
 * - otherwise, returns 'ltr'
 * @param someString
 */
export function getFakeStringTextDirection(someString: string) : IntrinsicTextDirection {
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

/**
 * Applies the bidi order algorithm to a given array using fake text direction information"
 * - if a item's text is empty, text direction is neutral
 * - if a item's text is a number, text direction is 'en' (European number)
 * - if a item's text is all uppercase, text direction is 'rtl'
 * - otherwise, text direction is 'ltr'
 *
 * @param itemArray
 * @param defaultTextDirection
 */
export function getFakeBidiOrder(itemArray: TypesetterItem[], defaultTextDirection: string) {
  return BidiDisplayOrder.getDisplayOrder<TypesetterItem>(itemArray, defaultTextDirection, (item) => {
    if (!(item instanceof TextBox)) {
      return '';
    }
    return getFakeStringTextDirection(item.getText());
  });
}


export function getFakeItemArrayWithBidiInfoFromString(text: string, defaultTextDirection: string = 'ltr') : ItemArrayWithBidiOrderInfo {
  const itemArray = createItemArrayFromString(text);
  return {
    itemArray: itemArray,
    bidiOrderInfoArray: getFakeBidiOrder(itemArray, defaultTextDirection)
  }
}