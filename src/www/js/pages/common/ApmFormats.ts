import { TimeString } from '@/toolbox/TimeString'

let language = 'en';
let timeZone = 'UTC';

interface TimeOptions {
  utc?: boolean;
  numericalMonth?: boolean;
  withSeconds?: boolean;
  withTimeZone?: boolean;
  withTimeZoneOffset?: boolean;
}

export class ApmFormats {

  /**
   * Returns a formatted date/time string for the given timeString
   *
   * @param {string}timeString
   * @param options
   */
  static timeString(timeString: string, options: TimeOptions = {}) {
    let dateObject = TimeString.toDate(timeString);
    return this.time(dateObject, options);
  }
  /**
   * Returns a formatted date/time string from the given input variable,
   * which can be a timestamp in seconds, a string that can be parsed into
   * a date/time (in local time) or a Date object.
   *
   * Note: use TimeString.toDate() to convert a TimeString into a date object.
   * This is the only way to ensure that the TimeString is interpreted as a UTC time.
   *
   * Options:
   *
   *   utc:  if true, show UTC time instead of the local time. Default:false.
   *
   *   numericalMonth: if true, show months as 01-12 instead of Jan-Dec (or the equivalent in the site language).
   *      Default: false.
   *
   *   withSeconds: if true show seconds. Default: true
   *
   *   withTimeZone: if true, add the local timezone name to the date/time string. Default: false
   *
   *   withTimeZoneOffset: if true, add 'UTC+xx' or 'UTC-xx' with the UTC offset. Default: false. If both withTimeZone
   *   and withTimeZoneOffset are true, only a time zone offset will be shown.
   *
   */
  static time(dateTimeVar: string | number | Date, options:TimeOptions = {}) {

    const utc = options.utc ?? false;
    const numericalMonth = options.numericalMonth ?? false;
    const withSeconds = options.withSeconds ?? true;
    const withTimeZone = options.withTimeZone ?? false;
    const withTimeZoneOffset = options.withTimeZoneOffset ?? false;

    const monthNames: {[key:string]: string[]} = {
      'en' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      'es' : ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    }

    let d;
    switch(typeof dateTimeVar) {
      case 'number': // a timestamp
        d = new Date(dateTimeVar * 1000);
        break;

      case 'string': // a string that can be parsed into a UTC date
        d = new Date(dateTimeVar + 'UTC+00');
        break;

      case 'object':
        d = dateTimeVar;
        break;

      default:
        console.warn(`Wrong parameter type to dateTimeString`);
        return '????';
    }
    let year = utc ? d.getUTCFullYear() : d.getFullYear();
    let monthNumber = utc ? d.getUTCMonth() : d.getMonth();
    let month = numericalMonth ?
      monthNumber.toString().padStart(2, '0') :
      monthNames[language][monthNumber] ?? monthNames['en'][d.getMonth()];
    let dayNumber = utc ? d.getUTCDate() : d.getDate();
    let day = dayNumber.toString();
    let hourNumber = utc ? d.getUTCHours() : d.getHours();
    let hour = hourNumber.toString();
    let minNumber = utc ? d.getUTCMinutes() : d.getMinutes();
    let min = minNumber.toString().padStart(2, '0');
    let secString = '';
    if (withSeconds) {
      let secNumber = utc ? d.getUTCSeconds() : d.getSeconds();
      secString = `:${secNumber.toString().padStart(2, '0')}`;
    }
    let timeZoneString = '';

    if (withTimeZone) {
      timeZoneString = ` ${timeZone}`
    }
    if (withTimeZoneOffset) {
     timeZoneString = ` ${this.getTimeZoneOffsetStringForDate(d, utc)}`
    }
    return `${day} ${month} ${year}, ${hour}:${min}${secString}${timeZoneString}`
  }

  /**
   * Return a UTC+offset string from a date object
   *
   * If usingUTC is true, returns 'UTC'
   * @param {Date}dateObject
   * @param {boolean} usingUTC
   * @param {boolean}html
   * @return {string}
   */
  static getTimeZoneOffsetStringForDate(dateObject: Date, usingUTC: boolean = false, html: boolean = true): string {
    if (usingUTC) {
      return 'UTC';
    }
    let timeZoneString
    let offset = -dateObject.getTimezoneOffset() / 60;
    let plus = html ? '&plus;' : '+';
    let minus = html ? '&minus;' : '-';
    if (offset === 0) {
      timeZoneString = 'UTC';
    } else {
      timeZoneString = offset > 0 ? `UTC${plus}${offset}` : `UTC${minus}${-offset}`;
    }
    return timeZoneString
  }

  /**
   * Sets the language to us in all format
   * @param {string} languageCode
   */
  static setLanguage(languageCode: string) {
    language = languageCode;
  }

  /**
   * Set the clients time zone
   * @param {string }tz
   *
   */
  static setTimeZone(tz: string) {
    timeZone = tz;
  }
}


