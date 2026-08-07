export interface TimeStringComponents {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  secs: number;
  microSecs: number;
}


/**
 * Utility functions for working with TimeStrings.
 *
 * A TimeString is a 26-character string of the form `YYYY-MM-DD HH:MM:SS.mmmmmm`, for example, `2023-04-01 12:34:56.123456`
 *
 * TimeStrings can also be encoded into a 20-character compact form with only the numbers, for example, `20230401123456123456`
 *
 */
export class TimeString {
  static toDate(timeString: string): Date {
    return new Date(this.toJsTimeStamp(timeString));
  }

  /**
   * Returns a JS timestamp (number of milliseconds since epoch)
   * out of TimeString
   *
   * This conversion is lossy, as it rounds the microsecond component to the nearest millisecond.
   *
   */
  static toJsTimeStamp(timeString: string): number {
    let [date, time] = timeString.split(' ');

    let [year, month, day] = date.split('-');

    let [hours, minutes, secsAndMicroSecs] = time.split(':');

    let [secs, microSecs] = secsAndMicroSecs.split('.');
    let milliSecs = Math.round(parseInt(microSecs) / 1000);

    return Date.UTC(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(hours), parseInt(minutes), parseInt(secs), milliSecs);
  }

  /**
   * Returns true if the given string is a valid timeString
   *
   * @param timeString can be normal or compact
   */
  static isValid(timeString: string): boolean {

    if (timeString.length !== 20 && timeString.length !== 26) {
      return false;
    }

    let parts: string[] | null;
    if (timeString.length === 26) {
      // a normal time string
      parts = String(timeString).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{6})$/);
    } else {
      // a compact time string
      parts = String(timeString).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{6})$/);
    }
    if (parts === null) {
      return false;
    }
    return this.areComponentsValid(this.getComponents(parts));
  }

  /**
   * Converts a TimeString to a compact string representation.
   *
   * It removes all whitespace, hyphens, colons, and periods from the input TimeString.
   *
   * It does not check for validity
   *
   * @param timeString
   */
  static compactEncode(timeString: string): string {
    return String(timeString)
      .replaceAll(' ', '')
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '');
  }

  /**
   * Decodes a compact TimeString to a string representation.
   *
   * Throws an error if the input is not a 20-character all-digit string. No other validity check is performed.
   *
   * @param compactTimeString
   */
  static compactDecode(compactTimeString: string): string {
    const parts = String(compactTimeString).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{6})$/);
    if (!parts) {
      throw new Error(`Invalid time string format: ${compactTimeString}`);
    }
    return `${parts[1]}-${parts[2]}-${parts[3]} ${parts[4]}:${parts[5]}:${parts[6]}.${parts[7]}`;
  }

  private static getComponents(parts: string[]): TimeStringComponents {
    return {
      year: parseInt(parts[1]),
      month: parseInt(parts[2]),
      day: parseInt(parts[3]),
      hours: parseInt(parts[4]),
      minutes: parseInt(parts[5]),
      secs: parseInt(parts[6]),
      microSecs: parseInt(parts[7]),
    };
  }

  private static areComponentsValid(components: TimeStringComponents): boolean {
    if (components.year <= 0) return false;
    if (components.month <= 0 || components.month > 12) return false;
    const daysInMonth = [31, this.isLeapYear(components.year) ? 29 : 28, 31, 30, 31, 30,
      31, 31, 30, 31, 30, 31][components.month - 1];
    if (components.day <= 0 || components.day > daysInMonth) return false;
    if (components.hours < 0 || components.hours > 23) return false;
    if (components.minutes < 0 || components.minutes > 59) return false;
    if (components.secs < 0 || components.secs > 59) return false;
    return !(components.microSecs < 0 || components.microSecs > 999999);
  }

  private static isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
}