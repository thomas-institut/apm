

export class TimeString {

  static compactEncode(timeString) {
    return String(timeString)
      .replaceAll(' ', '')
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')
  }

}