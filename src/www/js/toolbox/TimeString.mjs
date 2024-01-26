

export class TimeString {

  /**
   *
   * @param {string}timeString
   * @return Date
   */
  static toDate(timeString) {
    return new Date(this.toJsTimeStamp(timeString));
  }

  /**
   * Returns a JS timestamp (number of milliseconds since epoch)
   * out of TimeString
   *
   * @param timeString
   * @return {number}
   */
  static toJsTimeStamp(timeString) {
    let [date, time]= timeString.split(' ');

    let [ year, month, day] = date.split('-');

    let [ hours, minutes, secsAndMicroSecs] = time.split(':')

    let [secs, microSecs] = secsAndMicroSecs.split('.');



    let milliSecs = Math.round(microSecs / 1000);

    return Date.UTC(
      parseInt(year),parseInt(month) -1, parseInt(day),
      parseInt(hours), parseInt(minutes), parseInt(secs), milliSecs)
  }

  static compactEncode(timeString) {
    return String(timeString)
      .replaceAll(' ', '')
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')
  }

}