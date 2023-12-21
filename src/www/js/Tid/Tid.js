


export class Tid {

  /**
   *
   * @param {number}tid
   * @param {boolean}addCosmeticDash
   * @return {string}
   */
  static toBase36String(tid, addCosmeticDash = true) {
    let str = tid.toString(36).toUpperCase().padStart(8, '0');
    if (addCosmeticDash) {
      return str.substring(0, 4) + '-' + str.substring(4);
    } else {
      return str;
    }

  }

}