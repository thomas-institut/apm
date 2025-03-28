
export class UiToolBox {

  /**
   * Returns an array with all the classes in a JQuery element
   *
   * @param jQueryElement
   * @returns {string[]}
   */
  static getClassArray(jQueryElement) {
    if (jQueryElement.attr('class') === undefined) {
      return [];
    }
    return jQueryElement.attr("class").split(/\s+/);
  }

  /**
   * Maximizes the height of a JQuery element in relation with a parent element with
   * an offset.
   *
   * @param element
   * @param parent
   * @param {number}offset
   * @param {boolean}verbose
   */
  static maximizeElementHeightInParent(element, parent, offset = 0, verbose = false) {
    let currentHeight = element.outerHeight();
    let parentHeight = parent.height();
    verbose && console.log(`Maximizing height: current ${currentHeight}, parent ${parentHeight}, offset ${offset}`);
    let newHeight = parentHeight - offset;
    if (newHeight !== currentHeight) {
      element.outerHeight(newHeight);
    }
  }

  /**
   * Returns the id part of the HTML class of the given JQuery element that
   * starts with the given prefix.
   *
   * For example, if some element E has the class 'token-21',
   * calling this method on E and the prefix 'token-' will return
   * the number 21.
   *
   * If the element does not have a class that starts with the given
   * prefix, or if the class that starts with the given prefix does not end
   * with an integer, the method will return -1.
   *
   * @param {JQuery}element
   * @param {string}prefix
   * @returns {number}
   */
  static getSingleIntIdFromClasses(element, prefix) {
    let classes = this.getClassArray(element);
    let id = -1;
    let found = false;
    classes.forEach( (theClass) => {
      if (found) {
        return;
      }
      if (theClass.startsWith(prefix)) {
        let suffix = theClass.slice(prefix.length);
        if (suffix !== '' && isStringAnInteger(suffix)) {
          id = parseInt(suffix);
          found = true;
        }
      }
    })
    return id;
  }

  /**
   * Finds the closest ancestor (up to a maximum ancestor level) of the given JQuery element that has the given
   * tag name and an HTML class that starts with the given prefix and ends with an integer and returns that integer.
   * with the given tag.
   *
   * If includeElement is true (the default), the search for the tag name starts with the element itself. Otherwise,
   * the search starts with the element's parent.
   *
   * @param {string}ancestorTagName
   * @param {JQuery}element
   * @param {string}prefix
   * @param {number} maxAncestorLevel
   * @param {boolean}includeElement
   * @returns {number}
   */
  static getSingleIntIdFromAncestor(ancestorTagName, element, prefix, maxAncestorLevel=3, includeElement = true) {
    let ancestor = this.findAncestorWithTag(element, ancestorTagName, maxAncestorLevel, includeElement);
    if (ancestor === null) {
      return -1;
    }
    return this.getSingleIntIdFromClasses(ancestor, prefix);
  }

  /**
   * Finds the closest ancestor with the given tag.
   * If not found, returns null.
   *
   * If includeElement is true (the default), the search for the tag name starts with the element itself. Otherwise,
   * the search starts with the element's parent.
   *
   * @param {JQuery}element
   * @param ancestorTagName
   * @param {number} maxAncestorLevel
   * @param {boolean}includeElement
   * @return {JQuery|null}
   */
  static findAncestorWithTag(element, ancestorTagName, maxAncestorLevel=3, includeElement = true) {
    let currentAncestorLevel = 0;
    // console.log(`Find ancestor with tag ${ancestorTagName} on max ${maxAncestorLevel} levels`, element);
    if (!includeElement) {
      element = element.parent();
      currentAncestorLevel++;
    }

    while (currentAncestorLevel <= maxAncestorLevel && element.get(0).tagName.toLowerCase() !== ancestorTagName.toLowerCase()) {
      // console.log(`Tag ${ancestorTagName} not in level ${currentAncestorLevel}`, element.get(0));
      element = element.parent();
      currentAncestorLevel++;
    }
    if (currentAncestorLevel > maxAncestorLevel) {
      // could not find the tag
      // console.log(`Could not find tag ${ancestorTagName}, level ${currentAncestorLevel}`, element.get(0));
      return null;
    }
    // console.log(`Tag ${ancestorTagName} found in level ${currentAncestorLevel}`)
    return element;
  }

  /**
   * Finds all HTML classes in the given element that start with the given prefix and
   * end with a list of numbers separated by dashes ('-') and returns
   * an array of arrays with the those numbers.
   *
   * For example, if the element has the classes 'entry-1-2'  and 'entry-2-5',
   * the method called on the element and the prefix 'entry-' will return an
   * array with two array elements: [1,2] and [2,5]
   *
   * If no class is found, returns an empty array.
   *
   * @param {JQuery}element
   * @param {string}prefix
   * @returns {number[][]}
   */
  static getIntArrayIdFromClasses(element, prefix) {
    let classes = this.getClassArray(element);
    let idArray = []
    classes.forEach( (theClass) => {
      if (theClass.startsWith(prefix)) {
        let suffix = theClass.slice(prefix.length);
        if (suffix !== '') {
          idArray.push(suffix.split('-').map( (str) => {
            return isStringAnInteger(str) ? parseInt(str) : -1;
          }));
        }
      }
    })
    return idArray
  }

  /**
   * Finds the closest ancestor with the given tag and
   * returns all ids encoded in classes with the given prefix.
   *
   * @param {string }ancestorTag
   * @param {JQuery}element
   * @param {string}prefix
   * @param {number}maxAncestorLevel
   * @param {boolean}includeElement
   * @return {number[][]}
   * @see getIntArrayIdFromClasses
   */
  static getIntArrayIdFromAncestor(ancestorTag, element, prefix,maxAncestorLevel=3, includeElement = true) {
    let ancestor = this.findAncestorWithTag(element, ancestorTag);
    if (ancestor === null) {
      return [];
    }
    return this.getIntArrayIdFromClasses(ancestor, prefix);
  }

}


function isStringAnInteger(str) {
  return /^\d+$/.test(str);
}
