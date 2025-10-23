import {FullTxItemInterface, NonTokenItemIndex, WitnessTokenInterface} from "@/CtData/CtDataInterface";


/**
 * Returns a list of all the items that do not contribute
 *
 * The returned array contains one element for each token. Each
 * element is itself an array with two keys: 'pre'  and 'post'
 * with the indices of the items that do not contribute tokens that appear immediately before and
 * immediately after the corresponding token. Normally, only the first element
 * of the returned array, that is, the one corresponding to the first token,
 * will potentially have a non-empty 'pre' element.
 *
 *  For example, assume that a witness has the following sequence of items:
 *   0: note mark 1
 *   1: text = 'this is a'
 *   2: note mark 2
 *   3: text = ' witness'
 *   4: note mark 3
 *
 * The tokens are:
 *   0: This
 *   1: WHITESPACE
 *   2: is
 *   3: WHITESPACE
 *   4: a
 *   5: WHITESPACE
 *   6: witness
 *
 * The returned array will be :
 *
 *   0 => [ 'pre' => [ 0 ], 'post' => [] ],
 *   1 => [ 'pre' => [], 'post' => [] ],
 *   2 => [ 'pre' => [], 'post' => [] ],
 *   3 => [ 'pre' => [], 'post' => [] ],
 *   4 => [ 'pre' => [], 'post' => [ 2 ] ],
 *   5 => [ 'pre' => [], 'post' => [] ],
 *   6 => [ 'pre' => [], 'post' => [ 4 ] ]
 *
 * @return array
 */
export function getNonTokenItemIndices(tokens: WitnessTokenInterface[], items: FullTxItemInterface[]): NonTokenItemIndex[] {
  const returnArray: NonTokenItemIndex[] = tokens.map(_t => {
    return {pre: [], post: []};
  });
  let previousTokenMaxItemIndex = -1;
  tokens.forEach((token, tokenIndex) => {
    if (token.sourceItems === undefined) {
      return;
    }
    const sourceItemIndices = getTokenSourceItemIndices(token);
    const tokenMinItemIndex = Math.min(...sourceItemIndices);
    if (tokenMinItemIndex > previousTokenMaxItemIndex + 1) {
      // some items were skipped, namely all between previousTokenMaxItemIndex
      //  and tokenMinItemIndex, non including those two
      for (let j = previousTokenMaxItemIndex + 1; j < tokenMinItemIndex; j++) {
        if (tokenIndex !== 0) {
          // add missing items to the previous token 'post' field
          returnArray[tokenIndex - 1].post.push(j);
        } else {
          // or to the first token 'pre' field
          returnArray[0].pre.push(j);
        }
      }
    }
    previousTokenMaxItemIndex = Math.max(...sourceItemIndices);
  });

  // all tokens are processed, but there might still be items beyond
  // the last item in the tokens
  if (tokens.length !== 0 && items.length !== 0) {
    const maxTokenIndex = tokens.length - 1;
    const maxItemIndex = items.length - 1;

    const lastTokenMaxItemIndex = Math.max(...getTokenSourceItemIndices(tokens[maxTokenIndex]));
    if (maxItemIndex > lastTokenMaxItemIndex) {
      for (let j = lastTokenMaxItemIndex + 1; j <= maxItemIndex; j++) {
        returnArray[maxTokenIndex].post.push(j);
      }
    }
  }

  return returnArray;
}

function getTokenSourceItemIndices(token: WitnessTokenInterface): number[] {
  if (token.sourceItems === undefined) {
    return [];
  }
  return token.sourceItems.map(i => i.index);
}