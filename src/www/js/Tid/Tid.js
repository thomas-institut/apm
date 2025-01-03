


export class Tid {

  /**
   *
   * @param {number}tid
   * @param {boolean}addCosmeticDash
   * @param {boolean} upperCase
   * @return {string}
   */
  static toBase36String(tid, addCosmeticDash = true, upperCase = true) {
    let str = tid.toString(36).padStart(8, '0');
    if (upperCase) {
      str = str.toUpperCase();
    }
    if (addCosmeticDash) {
      str = str.substring(0, 4) + '-' + str.substring(4);
    }
    return str;
  }
}