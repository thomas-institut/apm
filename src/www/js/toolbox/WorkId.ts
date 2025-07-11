import { compareStrings } from './Util'

export class WorkId {

  /**
   * Splits an APM workId into an author abbreviation (a string)
   * and a work number.
   *
   * For example:
   *
   * ``'AW47'``
   *
   * generates
   *
   * ``[ 'AW', 47 ]``
   *
   *
   * @param {string }workId
   * @return []
   */
  static split(workId:string) : any[] {
    let firstNumberIndex = -1;
    let numberRegEx = new RegExp('^[0-9]')
    for (let i = 0; i < workId.length; i++) {
      if (numberRegEx.test(workId.charAt(i))) {
        firstNumberIndex = i;
        break;
      }
    }
    if (firstNumberIndex === -1) {
      // should never happen though
      return [ workId, 0];
    }
    let authorAbbreviation = workId.substring(0, firstNumberIndex);
    let workNumber = parseInt(workId.substring(firstNumberIndex));
    return [ authorAbbreviation, workNumber];
  }

  /**
   * Compares two work ids taking into account the numeric values of
   * the work numbers.
   *
   * Returns -1 if a < b, 0 if a===b and 1 if a >b
   *
   * For example, 'AW103' > 'AW1',  'AB02' > 'AB2'
   *
   * @param {string} a
   * @param {string} b
   */
  static compare(a:any, b:any) {
    let debug = false;
    debug && console.log(`Comparing ${a} and ${b}`)
    let componentsA = WorkId.split(a);
    debug && console.log(`ComponentsA`, componentsA);
    let componentsB = WorkId.split(b);
    debug && console.log(`ComponentsB`, componentsB);
    let authorComp = compareStrings(componentsA[0], componentsB[0]);
    if (authorComp !== 0) {
      return authorComp;
    }
    return componentsA[1] - componentsB[1];
  }


}