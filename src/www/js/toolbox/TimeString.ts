

export class TimeString {


  static toDate(timeString:string): Date {
    return new Date(this.toJsTimeStamp(timeString));
  }

  /**
   * Returns a JS timestamp (number of milliseconds since epoch)
   * out of TimeString
   *
   */
  static toJsTimeStamp(timeString: string): number {
    let [date, time]= timeString.split(' ');

    let [ year, month, day] = date.split('-');

    let [ hours, minutes, secsAndMicroSecs] = time.split(':')

    let [secs, microSecs] = secsAndMicroSecs.split('.');



    let milliSecs = Math.round(parseInt(microSecs) / 1000);

    return Date.UTC(
      parseInt(year),parseInt(month) -1, parseInt(day),
      parseInt(hours), parseInt(minutes), parseInt(secs), milliSecs)
  }

  static compactEncode(timeString: string): string {
    return String(timeString)
      .replaceAll(' ', '')
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')
  }

}