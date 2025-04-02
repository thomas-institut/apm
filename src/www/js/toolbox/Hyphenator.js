

class Hyphenator {

  /**
   *
   * @param {HyphenationPattern[]}patterns
   */
  constructor(patterns) {
    this.patterns = patterns;
    this.debug = false;
  }


  /**
   * Returns an array of strings with the syllables of the given word
   *
   * For example, the word 'Nájera' may return `[ 'Ná', 'je', 'ra']` if
   * the hyphenator was created with correct Spanish hyphenation patterns
   *
   * @param {string}word
   * @return {string[]}
   */
  getSyllables(word) {
    //
    // Very explicit implementation: can be optimized a lot by using a Trie
    // structure and by not saving intermediate values in arrays.
    // However, for now APM only hyphenates Latin using modern (a.k.a. Italian)
    // hyphenation patterns, which are only around 300 in total. Classical
    // Latin has about 26000 patterns. If that were to be used then it would
    // make more sense to spend time optimizing this function
    word = `.${word}.`;
    let charArray = word.split('');

    // 1. get all matching patterns for all substrings
    // (using brute force now, the elegant, fast solution involves
    // building a Trie with the patterns)
    let matchingPatterns = [];
    for (let i = 0; i < charArray.length; i++) {
      matchingPatterns.push(this.getPatternMatches(charArray, i));
    }
    if (this.debug) {
      console.group(`Matching patterns for '${word}'`);
      matchingPatterns.forEach((matchingPatternArray, i) => {
       console.log(`${i}: ${matchingPatternArray.map((pattern) => { return pattern.toString();}).join(', ')}`);
      });
      console.groupEnd();
    }

    // 2. Collect all pre- and post-weights from the matching patterns
    let weights = [];
    for (let i = 0; i < charArray.length; i++) {
      weights.push({ pre:[], post:[]});
    }
    for (let i = 0; i < charArray.length; i++) {

      matchingPatterns[i].forEach(matchingPattern => {
        matchingPattern.getNodes().forEach( (node, nodeIndex) => {
          weights[nodeIndex+i].pre.push(node.pre);
          weights[nodeIndex+i].post.push(node.post);
        });
      });
    }
    this.debug && console.log(`Weights`, weights);

    // 3. Calculate max post weight for every character in the original word and
    // cut a syllable when that weight is odd
    let currentSyllableStart = 1;
    let syllables = [];

    for (let i = 1; i < charArray.length-1; i++) {
      let pw = weights[i].post;
      if (i < charArray.length - 1) {
        pw.push(...weights[i + 1].pre);
      }
      let maxWeight = pw.length === 0 ? 0 : Math.max(...pw);
      if (maxWeight % 2 === 1) {
        // syllables.push({
        //   text: charArray.slice(currentSyllableStart, i+1).join(''),
        //   weight: maxWeight
        // });
        syllables.push(charArray.slice(currentSyllableStart, i+1).join(''));
        currentSyllableStart = i+1;
      }
    }
    if (currentSyllableStart < charArray.length-1) {
      // syllables.push({
      //   text: charArray.slice(currentSyllableStart, charArray.length-1).join(''),
      //   weight: 0
      // });
      syllables.push(charArray.slice(currentSyllableStart, charArray.length-1).join(''));
    }



    return syllables;
  }

  /**
   * Returns all the patterns that match the given character array
   * starting from a certain startIndex
   * @param {string[]}charArray
   * @param {number}startIndex
   */
  getPatternMatches(charArray, startIndex) {
    return this.patterns.filter(pattern => {
      return pattern.matchArray(charArray, startIndex);
    });
  }

  /**
   *
   * @param {string}patternFileContents
   * @return {HyphenationPattern[]}
   */
  static getPatternsFromFile(patternFileContents) {
    return patternFileContents.split('\n').filter( (line) => {
      return line.charAt(0) !== '#'
    }).map( (textPattern) => {
      return getPatternFromString(textPattern);
    }).filter( (pattern) => {
      return pattern.getLength() !== 0;
    });
  }
}

class HyphenationNode {

  /**
   *
   * @param {string} char
   * @param {number}pre
   * @param {number}post
   */
  constructor(char, pre = 0, post = 0) {
    this.char = char;
    this.pre = pre;
    this.post = post;
  }

  toString() {
    let pre = this.pre === 0 ? '' : this.pre;
    let post = this.post === 0 ? '' : this.post;
    return `${pre}${this.char}${post}`;
  }
}

class HyphenationPattern {
  /**
   *
   * @param {HyphenationNode[]} nodes
   */
  constructor(nodes) {
    this.nodes = nodes;
  }

  getNodes() {
    return this.nodes;
  }

  getLength() {
    return this.nodes.length;
  }

  toString() {
    return `${this.nodes.map( (node) => {return node.toString();}).join('')}`;
  }

  /**
   * Returns true if the characters between startIndex and endIndex of the
   * given string match the pattern.
   *
   * A match occurs when all the characters in the pattern are present in the
   * exact same order in the string starting from startIndex.
   *
   * If endIndex is less than zero, less than the start index or greater than the
   * length of the string, characters will  be matched until the end of the string.
   *
   * @param {string}someString
   * @param {number}startIndex
   * @param {number}endIndex
   * @returns {boolean}
   */
  matchString(someString, startIndex= 0, endIndex = -1) {
    let charArray = someString.split('');
    return this.matchArray(charArray, startIndex, endIndex);
  }

  /**
   * Returns true if the characters between startIndex and endIndex of the
   * given character array match the pattern.
   *
   * A match occurs when all the characters in the pattern are present in the
   * exact same order in the array starting from startIndex.
   *
   * If endIndex is less than zero, less than the start index or greater than the
   * length of the array, characters will  be matched until the end of the array.
   *
   * @param {string[]}charArray
   * @param {number}startIndex
   * @param {number}endIndex
   * @return {boolean}
   */
  matchArray(charArray, startIndex = 0, endIndex = -1) {
    if (this.getLength() === 0 || startIndex < 0 || startIndex >= charArray.length) {
      return false;
    }

    if (endIndex < 0 || endIndex < startIndex || endIndex >= charArray.length) {
      endIndex = charArray.length-1;
    }

    let rangeLength = endIndex - startIndex + 1;
    if (rangeLength === 0 || rangeLength < this.getLength()) {
      return false;
    }

    for (let i = 0; i < this.getLength(); i++) {
      if (charArray[i+startIndex] !== this.nodes[i].char) {
        return false;
      }
    }
    return true;
  }
}

/**
 *
 * @param {string}patternString
 * @return {HyphenationPattern}
 */
function getPatternFromString(patternString) {

  let state = 0;
  /** @var {HyphenationNode[]}*/
  let pattern = [];
  let lastNumber = 0;
  for (let i = 0; i < patternString.length; i++) {
    let char = patternString.charAt(i);
    switch (state) {
      case 0: // expecting either a char or an int
        if (isDigit(char)) {
          lastNumber = parseInt(char);
          state = 1;
        } else {
          pattern.push(new HyphenationNode(char, 0));
          state = 0;
        }
        break;

      case 1: // expecting a character
        if (isDigit(char)) {
          console.warn(`Invalid pattern string ${patternString} (expected char at index ${i}, got '${char}'`);
          return new HyphenationPattern([]);
        }
        pattern.push(new HyphenationNode(char, lastNumber));
        state = 0;
        break;

    }
  }
  if (state === 1) {
    pattern[pattern.length - 1].post = lastNumber;
  }
  return new HyphenationPattern(pattern);

}

function isDigit(char) {
  return char >= '0' &&  char <= '9';
}

