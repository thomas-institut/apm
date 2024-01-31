import { OptionsChecker } from '@thomas-inst/optionschecker'
import { TimeString } from '../../toolbox/TimeString.mjs'

let language = 'en';
let timeZone = 'UTC';

export class ApmFormats {

  /**
   * Returns a formatted date/time string for the given timeString
   *
   * @param {string}timeString
   * @param options
   */
  static timeString(timeString, options = {}) {
    let dateObject = TimeString.toDate(timeString);
    return this.time(dateObject, options);
  }
  /**
   * Returns a formatted date/time string from the given input variable,
   * which can a timestamp in seconds, a string that can be parsed into
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
   *
   * @param dateTimeVar
   * @param options
   * @return {string}
   */
  static time(dateTimeVar, options = {}) {
    let oc = new OptionsChecker({
      context: 'dateTimeString',
      optionsDefinition: {
        utc: { type: 'bool', default: false},
        numericalMonth: { type: 'bool', default: false},
        withSeconds: { type: 'bool', default: true},
        withTimeZone: { type: 'bool', default: false},
        withTimeZoneOffset: { type: 'bool', default: false}
      }
    })
    let opt = oc.getCleanOptions(options);

    const monthNames = {
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
        if (dateTimeVar instanceof Date) {
          d = dateTimeVar;
        } else {
          console.warn(`Object parameter to dateTimeString is not a Date object`);
          return '????';
        }
        break;

      default:
        console.warn(`Wrong parameter type to dateTimeString`);
        return '????';
    }
    let year = opt.utc ? d.getUTCFullYear() : d.getFullYear();
    let monthNumber = opt.utc ? d.getUTCMonth() : d.getMonth();
    let month = opt.numericalMonth ?
      monthNumber.toString().padStart(2, '0') :
      monthNames[language][monthNumber] ?? monthNames['en'][d.getMonth()];
    let dayNumber = opt.utc ? d.getUTCDate() : d.getDate();
    let day = dayNumber.toString();
    let hourNumber = opt.utc ? d.getUTCHours() : d.getHours();
    let hour = hourNumber.toString();
    let minNumber = opt.utc ? d.getUTCMinutes() : d.getMinutes();
    let min = minNumber.toString().padStart(2, '0');
    let secString = '';
    if (opt.withSeconds) {
      let secNumber = opt.utc ? d.getUTCSeconds() : d.getSeconds();
      secString = `:${secNumber.toString().padStart(2, '0')}`;
    }
    let timeZoneString = '';

    if (opt.withTimeZone) {
      timeZoneString = ` ${timeZone}`
    }
    if (opt.withTimeZoneOffset) {
      let offset = -d.getTimezoneOffset() / 60;
      if (opt.utc || offset === 0) {
        timeZoneString = ' UTC';
      } else {
        timeZoneString = offset > 0 ? ` UTC&plus;${offset}` : ` UTC&minus;${-offset}`;
      }
    }
    return `${day} ${month} ${year}, ${hour}:${min}${secString}${timeZoneString}`
  }

  /**
   * Sets the language to us in all format
   * @param {string} languageCode
   */
  static setLanguage(languageCode) {
    language = languageCode;
  }

  /**
   * Set the clients time zone
   * @param {string }tz
   *
   */
  static setTimeZone(tz) {
    timeZone = tz;
  }
}


