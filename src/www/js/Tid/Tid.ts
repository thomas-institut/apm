export class Tid {

  /**
   *
   * @param {number}tid
   * @param {boolean}addCosmeticDash
   * @param {boolean} upperCase
   * @return {string}
   */
  static toBase36String(tid: number, addCosmeticDash: boolean = true, upperCase: boolean = true): string {
    let str = tid.toString(36).padStart(8, '0');
    if (upperCase) {
      str = str.toUpperCase();
    }
    if (addCosmeticDash) {
      str = str.substring(0, 4) + '-' + str.substring(4);
    }
    return str;
  }

  static toCanonicalString(tid: number) {
    return this.toBase36String(tid);
  }
}




// function base58encode(num: number): string {
//   const EncodingAlphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
//   let result = '';
//   const alphabetSize = EncodingAlphabet.length;
//
//   while (num > 0) {
//     const remainder = num % alphabetSize;
//     num = Math.floor(num / alphabetSize);
//     result = EncodingAlphabet[remainder] + result;
//   }
//   return result;
// }