import {IntrinsicTextDirection} from "@/lib/Typesetter2/Bidi/BidiDisplayOrder";
import {isAllUpperCase, isWhiteSpace} from "@/toolbox/Util";


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