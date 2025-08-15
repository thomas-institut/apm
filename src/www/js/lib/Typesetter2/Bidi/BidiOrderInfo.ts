import {IntrinsicTextDirection} from "./BidiDisplayOrder.js";

export class BidiOrderInfo {
  /**
   * The index of the item in the original item array
   */
  inputIndex: number = -1;
  /**
   * The display position of the item.
   * Position 0 is the first position in the paragrpah
   */
  displayOrder: number = -1;
  /**
   *  The item's intrinsic text direction. One of:
   *   'en' : European numbers  (also for numerical strings such as '1.9' or '1,923,234.25')
   *   'rtl' :  right to left text
   *   'ltr' :  left to right text
   *   '' : neutral text (e.g., whitespace and punctuation)
   */
  intrinsicTextDirection: IntrinsicTextDirection = '';
  /**
   * The item's actual text direction that should be used for display: 'ltr' or 'rtl'
   */
  textDirection: string = '';
  /**
   * The item's embedding level according to the standard bidi algorithm:
   *
   *  - level 0 is always un-embedded LTR text.
   *  - level 1 is RTL text embedded into LTR text or un-embedded RTL text in a paragraph without LTR text
   *  - level 2 is LTR text embedded into level 1 RTL text
   *  - level 3 is RTL text embedded into level 2 LTR text
   *
   * and so on for deeper levels.  Even levels are always LTR text and odd levels are always RTL.
   *
   * Text usually only has at most levels 0 and 1. Deeper levels are only necessary when explicit embedding characters
   * are used.
   */
  embeddingLevel: number = -1;
}
